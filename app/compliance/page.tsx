"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  Clock,
  Calendar,
  AlertTriangle,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Download,
  Lock,
  Key,
} from "lucide-react";
import {
  fetchEmployeesAsync,
  fetchShiftsAsync,
  fetchPolicyAsync,
  getStoredScan,
  saveStoredScan,
  Employee,
  Shift,
  ScanResult,
  Violation,
  PolicyConfig,
  DEFAULT_POLICY,
} from "@/lib/supabase";
import { runPolicyValidation } from "@/lib/policyValidationEngine";
import { exportAuditReportCSV } from "@/lib/exportUtils";
import { useRBAC } from "@/lib/rbac";
import AuthModal from "@/components/AuthModal";

export default function PolicyValidationPage() {
  const { permissions, isLoaded } = useRBAC();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [policy, setPolicy] = useState<PolicyConfig | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const refreshData = async () => {
    const emps = await fetchEmployeesAsync();
    const shs = await fetchShiftsAsync();
    const pol = await fetchPolicyAsync();
    setEmployees(emps);
    setShifts(shs);
    setPolicy(pol);

    let stored = getStoredScan();
    if (!stored || stored.isStale) {
      stored = runPolicyValidation(emps, shs, pol);
      saveStoredScan(stored);
    }
    setScan(stored);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleExecuteValidation = async () => {
    setIsValidating(true);
    const activePolicy = await fetchPolicyAsync();
    setTimeout(() => {
      const result = runPolicyValidation(employees, shifts, activePolicy);
      saveStoredScan(result);
      setScan(result);
      setPolicy(activePolicy);
      setIsValidating(false);
    }, 400);
  };

  // Wait until session is loaded from localStorage to prevent pre-hydration flicker
  if (!isLoaded) return null;

  // Route Guard: Access Restricted for Staff Role
  if (!permissions.canViewComplianceCheck) {
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
            onClick={() => setShowAuthModal(true)}
            className="skeuo-btn-primary px-6 py-3 rounded-2xl text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-lg"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>Authenticate</span>
          </button>
        </div>

        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            targetRole="Admin"
          />
        )}
      </div>
    );
  }

  const isStale = scan ? scan.isStale : false;
  const violations = scan ? scan.violations : [];
  const totalViolations = scan ? scan.totalViolations : 0;
  const score = scan ? scan.complianceScore : 100;

  const overtimeCount = scan ? scan.ruleSummary.overtimeCount : 0;
  const restPeriodCount = scan ? scan.ruleSummary.restPeriodCount : 0;
  const consecutiveDaysCount = scan ? scan.ruleSummary.consecutiveDaysCount : 0;
  const maxShiftsPerDayCount = scan ? scan.ruleSummary.maxShiftsPerDayCount : 0;
  const coverageConflictCount = scan ? scan.ruleSummary.coverageConflictCount : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border">
        <h1 className="text-2xl font-black text-brand-navy tracking-tight">
          Compliance Check
        </h1>

        <div className="flex items-center gap-3">
          {scan && (
            <button
              onClick={() => exportAuditReportCSV(violations, policy || DEFAULT_POLICY)}
              className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-brand-navy"
              title="Export Audit CSV"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Audit</span>
            </button>
          )}
          <Link
            href="/settings"
            className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto text-brand-navy"
          >
            <Sliders className="w-4 h-4 text-brand-coral" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* High-Contrast Crisp Validation Banner */}
      <div className="skeuo-card rounded-2xl p-6 bg-white border border-brand-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-50 text-brand-coral border border-red-100 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-navy tracking-tight">
                Execute Roster Policy Validation
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Scan active shifts against maximum hours, rest gaps, and role coverage rules.
              </p>
            </div>
          </div>

          <button
            onClick={handleExecuteValidation}
            disabled={shifts.length === 0 || isValidating}
            className="skeuo-btn-primary flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-md shadow-brand-coral/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap self-start md:self-auto"
          >
            <Play className={`w-4 h-4 fill-white ${isValidating ? "animate-spin" : ""}`} />
            <span>{isValidating ? "Validating..." : "Run Compliance Check"}</span>
          </button>
        </div>
      </div>

      {/* Compliance Score Summary Header Tile */}
      <div className="skeuo-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Health Index
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-black text-brand-navy tracking-tight">
              {scan ? `${score}%` : "100%"}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Overall Policy Health Score
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {scan && violations.length > 0 && permissions.canViewRiskReport && (
            <Link
              href="/assessment"
              className="skeuo-btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Risk Report</span>
            </Link>
          )}

          {isStale ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Re-validation Stale</span>
            </div>
          ) : totalViolations === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Fully Compliant Roster</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-brand-coral text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>{totalViolations} Active Breaches</span>
            </div>
          )}
        </div>
      </div>

      {/* Rules Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overtime Rule */}
        <div className="skeuo-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-navy">Weekly Overtime Cap</h3>
              <p className="text-[11px] text-slate-500 font-medium">Max {policy?.max_weekly_hours || 40}h / week</p>
            </div>
          </div>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${overtimeCount > 0 ? "bg-red-50 text-brand-coral border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {overtimeCount} breaches
          </span>
        </div>

        {/* Rest Period Rule */}
        <div className="skeuo-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-navy">Mandatory Rest Gap</h3>
              <p className="text-[11px] text-slate-500 font-medium">Min {policy?.min_rest_hours || 10}h gap between shifts</p>
            </div>
          </div>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${restPeriodCount > 0 ? "bg-red-50 text-brand-coral border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {restPeriodCount} breaches
          </span>
        </div>

        {/* Consecutive Days Rule */}
        <div className="skeuo-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-navy">Consecutive Workdays</h3>
              <p className="text-[11px] text-slate-500 font-medium">Max {policy?.max_consecutive_days || 7} consecutive days</p>
            </div>
          </div>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${consecutiveDaysCount > 0 ? "bg-red-50 text-brand-coral border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {consecutiveDaysCount} breaches
          </span>
        </div>

        {/* Max Shifts per Day Rule */}
        <div className="skeuo-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-navy">Shift Velocity Cap</h3>
              <p className="text-[11px] text-slate-500 font-medium">Max {policy?.max_shifts_per_day || 1} shift / day</p>
            </div>
          </div>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${maxShiftsPerDayCount > 0 ? "bg-red-50 text-brand-coral border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {maxShiftsPerDayCount} breaches
          </span>
        </div>

        {/* Coverage Rule */}
        <div className="skeuo-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-brand-navy">Role & Specialty Coverage</h3>
              <p className="text-[11px] text-slate-500 font-medium">Role assignment matching</p>
            </div>
          </div>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${coverageConflictCount > 0 ? "bg-red-50 text-brand-coral border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {coverageConflictCount} conflicts
          </span>
        </div>
      </div>

      {/* Detected Violations List */}
      <div className="skeuo-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-navy">
            Detected Policy Breaches ({violations.length})
          </h2>
          {isStale && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              Schedule modified since last scan
            </span>
          )}
        </div>

        {violations.length === 0 ? (
          <div className="text-center py-10 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-brand-navy">No Compliance Breaches Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All scheduled shifts strictly comply with configured labor laws and rest gap thresholds.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {violations.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-xl border border-brand-border bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {v.ruleName}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        v.severity === "high"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : v.severity === "medium"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {v.severity} severity
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-brand-navy">{v.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {v.description}
                  </p>
                </div>

                <Link
                  href="/shifts"
                  className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold text-brand-navy shrink-0 flex items-center gap-1 self-start md:self-auto"
                >
                  <span>Fix Shift</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-coral" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
