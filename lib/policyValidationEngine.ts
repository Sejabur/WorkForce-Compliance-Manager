import { Employee, Shift, PolicyConfig, Violation, ScanResult, DEFAULT_POLICY } from "./supabase";

export function calculateShiftDurationHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  
  const startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  return (endTotalMinutes - startTotalMinutes) / 60;
}

export function parseDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

export function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Calculates Executive Compliance Score Percentage (0 - 100%)
 */
export function calculateComplianceScore(totalShifts: number, totalViolations: number): number {
  if (totalShifts === 0) return 100;
  const penaltyPerViolation = 12; // 12% drop per policy violation
  const score = 100 - (totalViolations * penaltyPerViolation);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Rule 1: Overtime Check against Policy Config
 */
export function checkOvertimeRule(employees: Employee[], shifts: Shift[], policy: PolicyConfig): Violation[] {
  const violations: Violation[] = [];
  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  const weeklyHoursMap = new Map<string, { employee: Employee; weekKey: string; totalHours: number; shiftIds: string[] }>();

  for (const shift of shifts) {
    const emp = empMap.get(shift.employee_id);
    if (!emp) continue;

    const duration = calculateShiftDurationHours(shift.start_time, shift.end_time);
    const weekKey = getISOWeekKey(shift.shift_date);
    const mapKey = `${shift.employee_id}_${weekKey}`;

    const existing = weeklyHoursMap.get(mapKey);
    if (existing) {
      existing.totalHours += duration;
      existing.shiftIds.push(shift.id);
    } else {
      weeklyHoursMap.set(mapKey, {
        employee: emp,
        weekKey,
        totalHours: duration,
        shiftIds: [shift.id],
      });
    }
  }

  for (const [, entry] of weeklyHoursMap.entries()) {
    // Threshold is minimum between policy.max_weekly_hours and employee max_weekly_hours
    const effectiveLimit = Math.min(policy.max_weekly_hours, entry.employee.max_weekly_hours);

    if (entry.totalHours > effectiveLimit) {
      const excess = entry.totalHours - effectiveLimit;
      violations.push({
        id: `v-overtime-${entry.employee.id}-${entry.weekKey}`,
        ruleId: "overtime",
        ruleName: "Overtime Limit Exceeded",
        severity: excess >= 8 ? "high" : "medium",
        title: `Weekly Overtime Breach (${entry.totalHours.toFixed(1)}h / ${effectiveLimit}h max)`,
        description: `${entry.employee.name} (${entry.employee.role}) is scheduled for ${entry.totalHours.toFixed(1)} hours in week ${entry.weekKey}, exceeding the policy limit of ${effectiveLimit} hours by ${excess.toFixed(1)} hours.`,
        employeeId: entry.employee.id,
        employeeName: entry.employee.name,
        shiftIds: entry.shiftIds,
        details: { totalHours: entry.totalHours, policyLimit: effectiveLimit },
      });
    }
  }

  return violations;
}

/**
 * Rule 2: Minimum Rest Period Check against Policy Config
 */
export function checkRestPeriodRule(employees: Employee[], shifts: Shift[], policy: PolicyConfig): Violation[] {
  const violations: Violation[] = [];
  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  const empShiftsMap = new Map<string, Shift[]>();
  for (const shift of shifts) {
    if (!empShiftsMap.has(shift.employee_id)) {
      empShiftsMap.set(shift.employee_id, []);
    }
    empShiftsMap.get(shift.employee_id)!.push(shift);
  }

  for (const [empId, empShifts] of empShiftsMap.entries()) {
    const emp = empMap.get(empId);
    if (!emp || empShifts.length < 2) continue;

    const timeline = empShifts.map((s) => {
      const start = parseDateTime(s.shift_date, s.start_time);
      const duration = calculateShiftDurationHours(s.start_time, s.end_time);
      const end = new Date(start.getTime() + duration * 3600000);
      return { shift: s, start, end };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    for (let i = 0; i < timeline.length - 1; i++) {
      const current = timeline[i];
      const next = timeline[i + 1];

      const restGapHours = (next.start.getTime() - current.end.getTime()) / 3600000;

      if (restGapHours >= 0 && restGapHours < policy.min_rest_hours) {
        violations.push({
          id: `v-rest-${emp.id}-${current.shift.id}-${next.shift.id}`,
          ruleId: "rest_period",
          ruleName: "Insufficient Rest Gap",
          severity: restGapHours < 6 ? "high" : "medium",
          title: `Rest Gap Breach (${restGapHours.toFixed(1)}h rest < ${policy.min_rest_hours}h required)`,
          description: `${emp.name} has only ${restGapHours.toFixed(1)} hours rest between shifts (${current.shift.shift_date} & ${next.shift.shift_date}). Policy requires at least ${policy.min_rest_hours} hours.`,
          employeeId: emp.id,
          employeeName: emp.name,
          shiftIds: [current.shift.id, next.shift.id],
          details: { restGapHours, minRequired: policy.min_rest_hours },
        });
      }
    }
  }

  return violations;
}

/**
 * Rule 3: Consecutive Days Check against Policy Config
 */
export function checkConsecutiveDaysRule(employees: Employee[], shifts: Shift[], policy: PolicyConfig): Violation[] {
  const violations: Violation[] = [];
  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  const empDatesMap = new Map<string, Set<string>>();
  const empShiftIdMap = new Map<string, string[]>();

  for (const shift of shifts) {
    if (!empDatesMap.has(shift.employee_id)) {
      empDatesMap.set(shift.employee_id, new Set());
      empShiftIdMap.set(shift.employee_id, []);
    }
    empDatesMap.get(shift.employee_id)!.add(shift.shift_date);
    empShiftIdMap.get(shift.employee_id)!.push(shift.id);
  }

  for (const [empId, dateSet] of empDatesMap.entries()) {
    const emp = empMap.get(empId);
    if (!emp || dateSet.size < policy.max_consecutive_days) continue;

    const sortedDates = Array.from(dateSet)
      .map((dStr) => new Date(dStr + "T00:00:00Z").getTime())
      .sort((a, b) => a - b);

    let streak = 1;
    let maxStreak = 1;
    let streakStartDate = sortedDates[0];
    let streakEndDate = sortedDates[0];

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diffDays = Math.round((sortedDates[i + 1] - sortedDates[i]) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        streak++;
        if (streak > maxStreak) {
          maxStreak = streak;
          streakEndDate = sortedDates[i + 1];
        }
      } else if (diffDays > 1) {
        if (streak < policy.max_consecutive_days) {
          streak = 1;
          streakStartDate = sortedDates[i + 1];
        }
      }
    }

    if (maxStreak >= policy.max_consecutive_days) {
      const startStr = new Date(streakStartDate).toISOString().split("T")[0];
      const endStr = new Date(streakEndDate).toISOString().split("T")[0];
      violations.push({
        id: `v-consecutive-${emp.id}-${startStr}`,
        ruleId: "consecutive_days",
        ruleName: "Consecutive Work Streak Breach",
        severity: maxStreak >= policy.max_consecutive_days + 2 ? "high" : "medium",
        title: `Consecutive Work Streak (${maxStreak} days >= ${policy.max_consecutive_days} day policy)`,
        description: `${emp.name} is scheduled to work ${maxStreak} consecutive days without a mandatory rest day (from ${startStr} to ${endStr}).`,
        employeeId: emp.id,
        employeeName: emp.name,
        shiftIds: empShiftIdMap.get(empId) || [],
        details: { maxStreak, policyLimit: policy.max_consecutive_days },
      });
    }
  }

  return violations;
}

/**
 * Rule 4: Max Shifts Per Day Check against Policy Config
 */
export function checkMaxShiftsPerDayRule(employees: Employee[], shifts: Shift[], policy: PolicyConfig): Violation[] {
  const violations: Violation[] = [];
  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  // Group shifts by employeeId and shift_date
  const empDateCountMap = new Map<string, { employee: Employee; date: string; shifts: Shift[] }>();

  for (const shift of shifts) {
    const key = `${shift.employee_id}_${shift.shift_date}`;
    const emp = empMap.get(shift.employee_id);
    if (!emp) continue;

    if (!empDateCountMap.has(key)) {
      empDateCountMap.set(key, { employee: emp, date: shift.shift_date, shifts: [] });
    }
    empDateCountMap.get(key)!.shifts.push(shift);
  }

  for (const [, entry] of empDateCountMap.entries()) {
    if (entry.shifts.length > policy.max_shifts_per_day) {
      violations.push({
        id: `v-maxshifts-${entry.employee.id}-${entry.date}`,
        ruleId: "max_shifts_per_day",
        ruleName: "Daily Shift Count Breach",
        severity: "medium",
        title: `Multiple Shifts on Same Date (${entry.shifts.length} shifts on ${entry.date})`,
        description: `${entry.employee.name} is assigned ${entry.shifts.length} shifts on ${entry.date}, exceeding the policy limit of ${policy.max_shifts_per_day} shift per day.`,
        employeeId: entry.employee.id,
        employeeName: entry.employee.name,
        shiftIds: entry.shifts.map((s) => s.id),
        details: { shiftCount: entry.shifts.length, maxAllowed: policy.max_shifts_per_day },
      });
    }
  }

  return violations;
}

/**
 * Rule 5: Coverage & Role Conflict Check (when policy.enforce_role_coverage is enabled)
 */
export function checkCoverageConflictRule(employees: Employee[], shifts: Shift[], policy: PolicyConfig): Violation[] {
  if (!policy.enforce_role_coverage) return [];

  const violations: Violation[] = [];
  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  const groupMap = new Map<string, Shift[]>();

  for (const shift of shifts) {
    if (!shift.required_role) continue;
    const key = `${shift.shift_date}__${shift.required_role.trim().toLowerCase()}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(shift);
  }

  for (const [, groupShifts] of groupMap.entries()) {
    if (groupShifts.length < 2) continue;

    for (let i = 0; i < groupShifts.length; i++) {
      for (let j = i + 1; j < groupShifts.length; j++) {
        const s1 = groupShifts[i];
        const s2 = groupShifts[j];

        if (s1.employee_id === s2.employee_id) continue;

        const start1 = parseDateTime(s1.shift_date, s1.start_time).getTime();
        const end1 = start1 + calculateShiftDurationHours(s1.start_time, s1.end_time) * 3600000;

        const start2 = parseDateTime(s2.shift_date, s2.start_time).getTime();
        const end2 = start2 + calculateShiftDurationHours(s2.start_time, s2.end_time) * 3600000;

        const hasOverlap = start1 < end2 && start2 < end1;

        if (hasOverlap) {
          const emp1 = empMap.get(s1.employee_id);
          const emp2 = empMap.get(s2.employee_id);
          const emp1Name = emp1 ? emp1.name : "Employee 1";
          const emp2Name = emp2 ? emp2.name : "Employee 2";

          violations.push({
            id: `v-coverage-${s1.id}-${s2.id}`,
            ruleId: "coverage_conflict",
            ruleName: "Coverage & Role Conflict",
            severity: "low",
            title: `Redundant Shift Coverage for ${s1.required_role}`,
            description: `Both ${emp1Name} and ${emp2Name} are scheduled for role "${s1.required_role}" with overlapping hours on ${s1.shift_date}.`,
            employeeId: s1.employee_id,
            employeeName: `${emp1Name} & ${emp2Name}`,
            shiftIds: [s1.id, s2.id],
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Runs the dynamic 5-rule policy validation engine.
 */
export function runPolicyValidation(
  employees: Employee[],
  shifts: Shift[],
  policy: PolicyConfig = DEFAULT_POLICY
): ScanResult {
  const v1 = checkOvertimeRule(employees, shifts, policy);
  const v2 = checkRestPeriodRule(employees, shifts, policy);
  const v3 = checkConsecutiveDaysRule(employees, shifts, policy);
  const v4 = checkMaxShiftsPerDayRule(employees, shifts, policy);
  const v5 = checkCoverageConflictRule(employees, shifts, policy);

  const allViolations = [...v1, ...v2, ...v3, ...v4, ...v5];
  const complianceScore = calculateComplianceScore(shifts.length, allViolations.length);

  return {
    scannedAt: new Date().toISOString(),
    isStale: false,
    totalViolations: allViolations.length,
    complianceScore,
    violations: allViolations,
    ruleSummary: {
      overtimeCount: v1.length,
      restPeriodCount: v2.length,
      consecutiveDaysCount: v3.length,
      maxShiftsPerDayCount: v4.length,
      coverageConflictCount: v5.length,
    },
  };
}
