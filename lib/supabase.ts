import { createClient } from "@supabase/supabase-js";

// Supabase Environment Credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Initialize Supabase Client if credentials are provided
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Entity Interfaces
export interface Employee {
  id: string;
  name: string;
  role: string;
  max_weekly_hours: number;
  created_at?: string;
}

export interface Shift {
  id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  required_role: string;
  status: "Draft" | "Published";
  created_at?: string;
}

export interface PolicyConfig {
  id?: string;
  max_weekly_hours: number;
  min_rest_hours: number;
  max_consecutive_days: number;
  max_shifts_per_day: number;
  enforce_role_coverage: boolean;
  updated_at?: string;
}

export interface Violation {
  id: string;
  ruleId: "overtime" | "rest_period" | "consecutive_days" | "max_shifts_per_day" | "coverage_conflict";
  ruleName: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  employeeId?: string;
  employeeName?: string;
  shiftIds?: string[];
  details?: any;
}

export interface ScanResult {
  scannedAt: string;
  isStale: boolean;
  totalViolations: number;
  complianceScore: number;
  violations: Violation[];
  ruleSummary: {
    overtimeCount: number;
    restPeriodCount: number;
    consecutiveDaysCount: number;
    maxShiftsPerDayCount: number;
    coverageConflictCount: number;
  };
}

export interface SecurityPasscodes {
  adminPasscode: string;
}

// Default Policy Thresholds
export const DEFAULT_POLICY: PolicyConfig = {
  max_weekly_hours: 40,
  min_rest_hours: 10,
  max_consecutive_days: 7,
  max_shifts_per_day: 1,
  enforce_role_coverage: true,
  updated_at: new Date().toISOString(),
};

export const DEFAULT_PASSCODES: SecurityPasscodes = {
  adminPasscode: process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "admin123",
};

// Default Initial Seed Employees
export const INITIAL_EMPLOYEES: Employee[] = [
  { id: "emp-101", name: "Dr. Sarah Jenkins", role: "Senior Physician", max_weekly_hours: 40, created_at: new Date().toISOString() },
  { id: "emp-102", name: "Marcus Vance", role: "ICU Nurse", max_weekly_hours: 36, created_at: new Date().toISOString() },
  { id: "emp-103", name: "Elena Rostova", role: "Emergency Specialist", max_weekly_hours: 40, created_at: new Date().toISOString() },
  { id: "emp-104", name: "David Chen", role: "Junior Nurse", max_weekly_hours: 32, created_at: new Date().toISOString() },
  { id: "emp-105", name: "Rachel Adams", role: "Operations Supervisor", max_weekly_hours: 40, created_at: new Date().toISOString() },
];

// Helper: Seed Data Initialization
function initializeLocalStorageSeed() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("wf_compliance_employees_v1")) {
    localStorage.setItem("wf_compliance_employees_v1", JSON.stringify(INITIAL_EMPLOYEES));
  }
  if (!localStorage.getItem("wf_compliance_shifts_v1")) {
    localStorage.setItem("wf_compliance_shifts_v1", JSON.stringify([]));
  }
}

// Synchronous Fallback Getters for SSR/Hydration
export function getStoredEmployees(): Employee[] {
  if (typeof window === "undefined") return INITIAL_EMPLOYEES;
  initializeLocalStorageSeed();
  try {
    const raw = localStorage.getItem("wf_compliance_employees_v1");
    return raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
  } catch (e) {
    return INITIAL_EMPLOYEES;
  }
}

export function getStoredShifts(): Shift[] {
  if (typeof window === "undefined") return [];
  initializeLocalStorageSeed();
  try {
    const raw = localStorage.getItem("wf_compliance_shifts_v1");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getStoredPolicy(): PolicyConfig {
  if (typeof window === "undefined") return DEFAULT_POLICY;
  try {
    const raw = localStorage.getItem("wf_compliance_policy_v1");
    return raw ? JSON.parse(raw) : DEFAULT_POLICY;
  } catch (e) {
    return DEFAULT_POLICY;
  }
}

export function saveStoredPolicy(policy: PolicyConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wf_compliance_policy_v1", JSON.stringify(policy));
}

export function getStoredScan(): ScanResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("wf_compliance_scan_v1");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveStoredScan(scan: ScanResult) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wf_compliance_scan_v1", JSON.stringify(scan));
}

export function getStoredPasscodes(): SecurityPasscodes {
  if (typeof window === "undefined") return DEFAULT_PASSCODES;
  try {
    const raw = localStorage.getItem("wf_compliance_passcodes_v1");
    return raw ? JSON.parse(raw) : DEFAULT_PASSCODES;
  } catch (e) {
    return DEFAULT_PASSCODES;
  }
}

export function saveStoredPasscodes(passcodes: SecurityPasscodes) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wf_compliance_passcodes_v1", JSON.stringify(passcodes));
}

// Async Supabase Data Operations with LocalStorage Fallback

export async function fetchEmployeesAsync(): Promise<Employee[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem("wf_compliance_employees_v1", JSON.stringify(data));
        }
        return data as Employee[];
      }
    } catch (e) {
      // Fall back to localStorage on query error
    }
  }
  return getStoredEmployees();
}

export async function saveEmployeeAsync(employee: Employee): Promise<Employee> {
  if (typeof window !== "undefined") {
    const current = getStoredEmployees();
    const updated = [employee, ...current.filter((e) => e.id !== employee.id)];
    localStorage.setItem("wf_compliance_employees_v1", JSON.stringify(updated));
  }

  if (supabase) {
    try {
      await supabase.from("employees").upsert(employee);
    } catch (e) {
      // Ignore network errors in fallback mode
    }
  }
  return employee;
}

export async function deleteEmployeeAsync(id: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    const current = getStoredEmployees();
    const updated = current.filter((e) => e.id !== id);
    localStorage.setItem("wf_compliance_employees_v1", JSON.stringify(updated));
  }

  if (supabase) {
    try {
      await supabase.from("employees").delete().eq("id", id);
    } catch (e) {
      // Ignore network errors in fallback mode
    }
  }
  return true;
}

export async function fetchShiftsAsync(): Promise<Shift[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("shifts").select("*").order("shift_date", { ascending: false });
      if (!error && data) {
        if (typeof window !== "undefined") {
          localStorage.setItem("wf_compliance_shifts_v1", JSON.stringify(data));
        }
        return data as Shift[];
      }
    } catch (e) {
      // Fall back to localStorage on query error
    }
  }
  return getStoredShifts();
}

export async function saveShiftAsync(shift: Shift): Promise<Shift> {
  if (typeof window !== "undefined") {
    const current = getStoredShifts();
    const updated = [shift, ...current.filter((s) => s.id !== shift.id)];
    localStorage.setItem("wf_compliance_shifts_v1", JSON.stringify(updated));
  }

  if (supabase) {
    try {
      await supabase.from("shifts").upsert(shift);
    } catch (e) {
      // Ignore network errors in fallback mode
    }
  }
  return shift;
}

export async function deleteShiftAsync(id: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    const current = getStoredShifts();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem("wf_compliance_shifts_v1", JSON.stringify(updated));
  }

  if (supabase) {
    try {
      await supabase.from("shifts").delete().eq("id", id);
    } catch (e) {
      // Ignore network errors in fallback mode
    }
  }
  return true;
}

export async function fetchPolicyAsync(): Promise<PolicyConfig> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("policies").select("*").limit(1).single();
      if (!error && data) {
        if (typeof window !== "undefined") {
          localStorage.setItem("wf_compliance_policy_v1", JSON.stringify(data));
        }
        return data as PolicyConfig;
      }
    } catch (e) {
      // Fall back to localStorage on query error
    }
  }
  return getStoredPolicy();
}

export async function savePolicyAsync(policy: PolicyConfig): Promise<PolicyConfig> {
  saveStoredPolicy(policy);
  if (supabase) {
    try {
      await supabase.from("policies").upsert({ id: "main-policy", ...policy });
    } catch (e) {
      // Ignore network errors in fallback mode
    }
  }
  return policy;
}
