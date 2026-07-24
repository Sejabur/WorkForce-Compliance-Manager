"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  ShieldCheck,
  Plus,
  Play,
  ArrowRight,
  Sparkles,
  Clock,
  Briefcase,
  AlertTriangle,
  Sliders,
  Download,
  Lock,
  Key,
  Settings2,
  Check,
} from "lucide-react";
import {
  fetchEmployeesAsync,
  fetchShiftsAsync,
  fetchPolicyAsync,
  saveShiftAsync,
  saveStoredScan,
  getStoredScan,
  Employee,
  Shift,
  ScanResult,
} from "@/lib/supabase";
import { runPolicyValidation } from "@/lib/policyValidationEngine";
import { exportShiftsCSV } from "@/lib/exportUtils";
import { useRBAC } from "@/lib/rbac";
import Modal from "@/components/Modal";
import AuthModal from "@/components/AuthModal";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";
import CustomTimePicker from "@/components/CustomTimePicker";

export type QuickActionKey = "assign_shift" | "run_scan" | "settings" | "export_csv" | "add_employee" | "risk_report";

const DEFAULT_QUICK_ACTIONS: QuickActionKey[] = ["assign_shift", "run_scan", "settings"];

const AVAILABLE_ACTIONS: { id: QuickActionKey; label: string; icon: React.ElementType }[] = [
  { id: "assign_shift", label: "Assign Shift", icon: Plus },
  { id: "run_scan", label: "Run Compliance Check", icon: Play },
  { id: "settings", label: "Settings", icon: Sliders },
  { id: "export_csv", label: "Export Shifts CSV", icon: Download },
  { id: "add_employee", label: "Add Employee", icon: Users },
  { id: "risk_report", label: "Risk Report", icon: Sparkles },
];

export default function Dashboard() {
  const router = useRouter();
  const { permissions, role, isLoaded } = useRBAC();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [enabledQuickActions, setEnabledQuickActions] = useState<QuickActionKey[]>(DEFAULT_QUICK_ACTIONS);

  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [requiredRole, setRequiredRole] = useState("");
  const [formError, setFormError] = useState("");

  const refreshData = async () => {
    const emps = await fetchEmployeesAsync();
    const shs = await fetchShiftsAsync();
    const policy = await fetchPolicyAsync();
    
    let sc = getStoredScan();
    // Auto-run Compliance Scan on initial mount for new devices or when stale
    if (!sc || sc.isStale) {
      sc = runPolicyValidation(emps, shs, policy);
      saveStoredScan(sc);
    }

    setEmployees(emps);
    setShifts(shs);
    setScan(sc);

    if (emps.length > 0 && !selectedEmpId) {
      setSelectedEmpId(emps[0].id);
      setRequiredRole(emps[0].role);
    }
    if (!shiftDate) {
      setShiftDate(new Date().toISOString().split("T")[0]);
    }
  };

  useEffect(() => {
    refreshData();
    const savedActions = localStorage.getItem("wf_compliance_quick_actions_v1");
    if (savedActions) {
      try {
        const parsed = JSON.parse(savedActions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledQuickActions(parsed);
        }
      } catch (e) {}
    }
  }, []);

  // Staff Mode Auto-Redirect to /shifts schedule
  useEffect(() => {
    if (isLoaded && role === "Staff") {
      router.replace("/shifts");
    }
  }, [isLoaded, role, router]);

  const handleRunScan = async () => {
    if (!permissions.canRunComplianceScan) {
      setShowAuthPrompt(true);
      return;
    }
    const policy = await fetchPolicyAsync();
    const newScan = runPolicyValidation(employees, shifts, policy);
    saveStoredScan(newScan);
    setScan(newScan);
  };

  const handleQuickAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!permissions.canManageShifts) {
      setFormError("Admin role required to assign shifts.");
      return;
    }
    if (!selectedEmpId) {
      setFormError("Please select an employee.");
      return;
    }
    if (!shiftDate) {
      setFormError("Please select a shift date.");
      return;
    }
    if (startTime === endTime) {
      setFormError("Shift start time and end time cannot be identical.");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmpId);
    const newShift: Shift = {
      id: `sh-${Date.now()}`,
      employee_id: selectedEmpId,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      required_role: requiredRole || (emp ? emp.role : "Staff"),
      status: "Published",
      created_at: new Date().toISOString(),
    };

    await saveShiftAsync(newShift);
    setIsAssignModalOpen(false);
    await refreshData();
  };

  const toggleQuickAction = (id: QuickActionKey) => {
    let updated: QuickActionKey[];
    if (enabledQuickActions.includes(id)) {
      if (enabledQuickActions.length === 1) return; // Keep at least 1 action
      updated = enabledQuickActions.filter((a) => a !== id);
    } else {
      updated = [...enabledQuickActions, id];
    }
    setEnabledQuickActions(updated);
    localStorage.setItem("wf_compliance_quick_actions_v1", JSON.stringify(updated));
  };

  // Wait until session is loaded from localStorage to prevent pre-hydration flicker
  if (!isLoaded) return null;

  // Route Guard: Access Restricted for Staff Role
  if (!permissions.canViewDashboard) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="skeuo-card rounded-3xl p-8 space-y-5 border-amber-200 bg-amber-50/50">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-brand-navy">Access Restricted</h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
              Login as Admin to access.
            </p>
          </div>

          <button
            onClick={() => setShowAuthPrompt(true)}
            className="skeuo-btn-primary px-6 py-3 rounded-2xl text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-lg"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>Authenticate</span>
          </button>
        </div>

        {showAuthPrompt && (
          <AuthModal
            isOpen={showAuthPrompt}
            onClose={() => setShowAuthPrompt(false)}
            targetRole="Admin"
          />
        )}
      </div>
    );
  }

  const totalEmployeesCount = employees.length;
  const shiftsCount = shifts.length;
  const violationsCount = scan ? scan.totalViolations : 0;
  const isStale = scan ? scan.isStale : false;
  const score = scan ? scan.complianceScore : 100;

  const getScoreBadge = (val: number) => {
    if (val >= 90) {
      return {
        text: "Excellent Compliance",
        colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
        badgeDot: "bg-emerald-500",
        scoreColor: "text-emerald-600",
      };
    }
    if (val >= 70) {
      return {
        text: "Moderate Warning",
        colorClass: "text-amber-800 bg-amber-50 border-amber-200",
        badgeDot: "bg-amber-500",
        scoreColor: "text-amber-600",
      };
    }
    return {
      text: "High Risk Breaches",
      colorClass: "text-brand-coral bg-red-50 border-red-200",
      badgeDot: "bg-brand-coral",
      scoreColor: "text-brand-coral",
    };
  };

  const scoreInfo = getScoreBadge(score);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const employeeSelectOptions: SelectOption[] = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} (${emp.role})`,
    sublabel: `Max ${emp.max_weekly_hours}h/wk`,
  }));

  return (
    <div className="space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border">
        <h1 className="text-2xl font-black text-brand-navy tracking-tight">
          Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => exportShiftsCSV(shifts, employees)}
            disabled={shifts.length === 0}
            className="skeuo-btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-brand-navy disabled:opacity-50"
            title="Export Shifts CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          {permissions.canRunComplianceScan ? (
            <button
              onClick={handleRunScan}
              disabled={shifts.length === 0}
              className="skeuo-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run Compliance Check</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthPrompt(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs flex items-center gap-1.5"
              title="Admin Role Required to Run Compliance Check"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Run Compliance Check</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Tile A: Total Workforce */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 skeuo-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Workforce
            </span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-brand-navy">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-brand-navy tracking-tight">
              {totalEmployeesCount}
            </div>
          </div>
        </div>

        {/* Tile B: Scheduled Shifts */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 skeuo-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Scheduled Shifts
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-brand-navy tracking-tight">
              {shiftsCount}
            </div>
          </div>
        </div>

        {/* Tile C: DOMINANT HERO COMPLIANCE SCORE TILE */}
        <div className="col-span-12 lg:col-span-6 lg:row-span-2 skeuo-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border-slate-200/80 transition-all duration-200 hover:shadow-xl">
          <ShieldCheck className="absolute -bottom-6 -right-6 w-48 h-48 text-slate-900/5 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-brand-navy uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Compliance Score
              </span>
              {isStale && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Re-validation Stale
                </span>
              )}
            </div>

            <div className="mt-6 flex items-baseline gap-4 flex-wrap">
              <span className={`text-6xl sm:text-7xl font-black tracking-tight ${scoreInfo.scoreColor}`}>
                {scan ? `${score}%` : "100%"}
              </span>
              <div className="space-y-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${scoreInfo.colorClass}`}>
                  <span className={`w-2 h-2 rounded-full ${scoreInfo.badgeDot}`}></span>
                  {scoreInfo.text}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-brand-border flex items-center justify-between flex-wrap gap-3">
            {permissions.canViewComplianceCheck ? (
              <Link
                href="/compliance"
                className="text-xs font-bold text-brand-coral hover:text-brand-coral-hover flex items-center gap-1.5 transition-colors"
              >
                <span>Compliance Check</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="text-xs font-medium text-slate-400">View Only Mode</span>
            )}

            {scan && violationsCount > 0 && !isStale && permissions.canViewRiskReport && (
              <Link
                href="/assessment"
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Risk Report</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tile D: Last Scan Status */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 skeuo-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Current Status
          </span>
          <div className="mt-3">
            {!scan ? (
              <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Not Checked</span>
              </div>
            ) : isStale ? (
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Stale Scan</span>
              </div>
            ) : violationsCount === 0 ? (
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fully Compliant ✅</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-brand-coral font-bold text-xs bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200">
                <AlertTriangle className="w-4 h-4 text-brand-coral shrink-0" />
                <span>{violationsCount} Policy Breaches</span>
              </div>
            )}
          </div>
        </div>

        {/* Tile E: Recent Scheduled Shifts */}
        <div className="col-span-12 lg:col-span-9 skeuo-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-bold text-brand-navy">Recent Scheduled Shifts</h2>
            <Link
              href="/shifts"
              className="text-xs font-bold text-brand-coral hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-brand-border">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
                <tr>
                  <th className="px-4 py-3 text-slate-700">Employee</th>
                  <th className="px-4 py-3 text-slate-700">Role</th>
                  <th className="px-4 py-3 text-slate-700">Date</th>
                  <th className="px-4 py-3 text-slate-700">Time Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border bg-white text-slate-800 font-medium">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500 text-sm">
                      No shifts created yet. Use Quick Actions to assign a shift.
                    </td>
                  </tr>
                ) : (
                  shifts.slice(0, 5).map((shift) => {
                    const emp = empMap.get(shift.employee_id);
                    return (
                      <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-brand-navy">
                          {emp ? emp.name : "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                            <Briefcase className="w-3 h-3 text-slate-500" />
                            {shift.required_role || (emp ? emp.role : "Staff")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                          {shift.shift_date}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                          {shift.start_time} - {shift.end_time}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tile F: Quick Actions Card */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 skeuo-card rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
              Quick Actions
            </h2>
            <button
              onClick={() => setIsCustomizeModalOpen(true)}
              className="text-[11px] font-bold text-brand-coral hover:underline flex items-center gap-1"
              title="Customize Quick Actions"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>
          </div>

          <div className="space-y-3">
            {enabledQuickActions.includes("assign_shift") && (
              permissions.canManageShifts ? (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  disabled={employees.length === 0}
                  className="w-full skeuo-btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Shift</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2"
                  title="Admin Role Required"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Assign Shift (Admin Only)</span>
                </button>
              )
            )}

            {enabledQuickActions.includes("run_scan") && (
              permissions.canRunComplianceScan ? (
                <button
                  onClick={handleRunScan}
                  disabled={shifts.length === 0}
                  className="w-full skeuo-btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed text-brand-navy"
                >
                  <Play className="w-4 h-4 text-brand-coral fill-brand-coral" />
                  <span>Run Compliance Check</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2"
                  title="Admin Role Required"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Compliance Check (Admin Only)</span>
                </button>
              )
            )}

            {enabledQuickActions.includes("settings") && (
              permissions.canViewPolicySettings ? (
                <Link
                  href="/settings"
                  className="w-full skeuo-btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-brand-navy"
                >
                  <Sliders className="w-4 h-4 text-brand-navy" />
                  <span>Settings</span>
                </Link>
              ) : (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Settings (Admin Only)</span>
                </button>
              )
            )}

            {enabledQuickActions.includes("export_csv") && (
              <button
                onClick={() => exportShiftsCSV(shifts, employees)}
                disabled={shifts.length === 0}
                className="w-full skeuo-btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-brand-navy disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Export Shifts CSV</span>
              </button>
            )}

            {enabledQuickActions.includes("add_employee") && (
              permissions.canManageEmployees ? (
                <Link
                  href="/employees"
                  className="w-full skeuo-btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-brand-navy"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Add Employee</span>
                </Link>
              ) : (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Add Employee (Admin Only)</span>
                </button>
              )
            )}

            {enabledQuickActions.includes("risk_report") && (
              permissions.canViewRiskReport ? (
                <Link
                  href="/assessment"
                  className="w-full skeuo-btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-purple-900 bg-purple-50"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Risk Report</span>
                </Link>
              ) : (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Risk Report (Admin Only)</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Quick Assign Shift Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign New Shift"
      >
        <form onSubmit={handleQuickAssignShift} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 rounded-lg border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
              Select Employee *
            </label>
            <CustomSelect
              options={employeeSelectOptions}
              value={selectedEmpId}
              onChange={(val) => {
                setSelectedEmpId(val);
                const emp = employees.find((e) => e.id === val);
                if (emp) setRequiredRole(emp.role);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
              Role / Specialty *
            </label>
            <input
              type="text"
              value={requiredRole}
              onChange={(e) => setRequiredRole(e.target.value)}
              placeholder="Role / Specialty"
              className="w-full p-2.5 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
              Shift Date *
            </label>
            <CustomDatePicker
              value={shiftDate}
              onChange={(val) => setShiftDate(val)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
                Start Time *
              </label>
              <CustomTimePicker
                value={startTime}
                onChange={(val) => setStartTime(val)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
                End Time *
              </label>
              <CustomTimePicker
                value={endTime}
                onChange={(val) => setEndTime(val)}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2.5 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="skeuo-btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-brand-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="skeuo-btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md"
            >
              Save Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Customize Quick Actions Modal */}
      <Modal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        title="Customize Quick Actions"
        subtitle="Select which action shortcuts to display on your Dashboard"
      >
        <div className="space-y-3">
          {AVAILABLE_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isEnabled = enabledQuickActions.includes(action.id);

            return (
              <button
                key={action.id}
                onClick={() => toggleQuickAction(action.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                  isEnabled
                    ? "bg-slate-50 border-brand-coral text-brand-navy shadow-sm"
                    : "bg-white border-brand-border text-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isEnabled ? "text-brand-coral" : "text-slate-400"}`} />
                  <span>{action.label}</span>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isEnabled ? "bg-brand-coral border-brand-coral text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {isEnabled && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}

          <div className="pt-4 flex justify-end border-t border-brand-border">
            <button
              type="button"
              onClick={() => setIsCustomizeModalOpen(false)}
              className="skeuo-btn-primary px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Admin Authentication Prompt Modal */}
      {showAuthPrompt && (
        <AuthModal
          isOpen={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          targetRole="Admin"
        />
      )}
    </div>
  );
}
