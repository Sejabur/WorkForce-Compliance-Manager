"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  CheckCircle2,
  RotateCcw,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  Save,
  Lock,
  Key,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  getStoredPolicy,
  saveStoredPolicy,
  getStoredPasscodes,
  saveStoredPasscodes,
  PolicyConfig,
  DEFAULT_POLICY,
  SecurityPasscodes,
} from "@/lib/supabase";
import { useRBAC } from "@/lib/rbac";
import AuthModal from "@/components/AuthModal";

export default function PolicySettingsPage() {
  const { permissions, role } = useRBAC();
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [passcodes, setPasscodes] = useState<SecurityPasscodes>({ adminPasscode: "admin123" });
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [policySuccessMsg, setPolicySuccessMsg] = useState("");
  const [policyErrorMsg, setPolicyErrorMsg] = useState("");
  const [passcodeSuccessMsg, setPasscodeSuccessMsg] = useState("");
  const [passcodeErrorMsg, setPasscodeErrorMsg] = useState("");

  useEffect(() => {
    setPolicy(getStoredPolicy());
    setPasscodes(getStoredPasscodes());
  }, []);

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySuccessMsg("");
    setPolicyErrorMsg("");

    if (!permissions.canEditPolicy) {
      setPolicyErrorMsg("Admin role required to save corporate policy settings.");
      return;
    }

    if (policy.max_weekly_hours < 1 || policy.max_weekly_hours > 80) {
      setPolicyErrorMsg("Max weekly hours must be between 1 and 80.");
      return;
    }
    if (policy.min_rest_hours < 1 || policy.min_rest_hours > 24) {
      setPolicyErrorMsg("Minimum rest hours must be between 1 and 24.");
      return;
    }
    if (policy.max_consecutive_days < 1 || policy.max_consecutive_days > 14) {
      setPolicyErrorMsg("Max consecutive days must be between 1 and 14.");
      return;
    }
    if (policy.max_shifts_per_day < 1 || policy.max_shifts_per_day > 4) {
      setPolicyErrorMsg("Max shifts per day must be between 1 and 4.");
      return;
    }

    const updatedPolicy = {
      ...policy,
      updated_at: new Date().toISOString(),
    };

    saveStoredPolicy(updatedPolicy);
    setPolicy(updatedPolicy);
    setPolicySuccessMsg("Corporate policy parameters updated successfully!");
  };

  const handleSavePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeSuccessMsg("");
    setPasscodeErrorMsg("");

    if (!permissions.canEditPolicy) {
      setPasscodeErrorMsg("Admin role required to update security passcodes.");
      return;
    }

    if (!passcodes.adminPasscode.trim()) {
      setPasscodeErrorMsg("Admin passcode cannot be empty.");
      return;
    }

    saveStoredPasscodes(passcodes);
    setPasscodeSuccessMsg("Admin security passcode updated successfully!");
  };

  const handleResetPolicy = () => {
    if (!permissions.canEditPolicy) return;
    if (confirm("Reset policy rules to standard corporate default parameters?")) {
      saveStoredPolicy(DEFAULT_POLICY);
      setPolicy(DEFAULT_POLICY);
      setPolicySuccessMsg("Policy rules reset to corporate defaults.");
    }
  };

  // Route Guard: Access Restricted for Staff Role
  if (!permissions.canViewPolicySettings) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="skeuo-card rounded-3xl p-8 space-y-5 border-amber-200 bg-amber-50/50">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-brand-navy">Settings Restricted</h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
              Admin authentication is required to access system settings, corporate labor thresholds, and passcode configurations.
            </p>
          </div>

          <button
            onClick={() => setShowAuthModal(true)}
            className="skeuo-btn-primary px-6 py-3 rounded-2xl text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-lg"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>Unlock Admin Role</span>
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border">
        <h1 className="text-2xl font-black text-brand-navy tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-brand-coral" />
          <span>Settings</span>
        </h1>

        {permissions.canEditPolicy && (
          <button
            onClick={handleResetPolicy}
            className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto text-brand-navy"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>Reset Defaults</span>
          </button>
        )}
      </div>

      {/* CARD 1: Corporate Rule Parameters */}
      <form onSubmit={handleSavePolicy} className="space-y-4">
        <div className="skeuo-card rounded-2xl p-6 space-y-6">
          <div className="border-b border-brand-border pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-brand-navy flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-coral" />
              <span>Corporate Rule Parameters</span>
            </h3>
          </div>

          {policySuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{policySuccessMsg}</span>
            </div>
          )}

          {policyErrorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{policyErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1: Max Weekly Hours */}
            <div className="space-y-2 p-4 rounded-xl bg-white border border-brand-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-coral" />
                <label className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                  Max Weekly Hours Cap
                </label>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min={1}
                  max={80}
                  disabled={!permissions.canEditPolicy}
                  value={policy.max_weekly_hours}
                  onChange={(e) => setPolicy({ ...policy, max_weekly_hours: Number(e.target.value) })}
                  className="w-28 p-2 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold text-center disabled:bg-slate-100 disabled:opacity-75"
                  required
                />
                <span className="text-xs font-semibold text-slate-500">hours / week</span>
              </div>
            </div>

            {/* Field 2: Min Rest Hours */}
            <div className="space-y-2 p-4 rounded-xl bg-white border border-brand-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <label className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                  Minimum Rest Period Gap
                </label>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min={1}
                  max={24}
                  disabled={!permissions.canEditPolicy}
                  value={policy.min_rest_hours}
                  onChange={(e) => setPolicy({ ...policy, min_rest_hours: Number(e.target.value) })}
                  className="w-28 p-2 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold text-center disabled:bg-slate-100 disabled:opacity-75"
                  required
                />
                <span className="text-xs font-semibold text-slate-500">hours rest gap</span>
              </div>
            </div>

            {/* Field 3: Max Consecutive Days */}
            <div className="space-y-2 p-4 rounded-xl bg-white border border-brand-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <label className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                  Max Consecutive Work Days
                </label>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min={1}
                  max={14}
                  disabled={!permissions.canEditPolicy}
                  value={policy.max_consecutive_days}
                  onChange={(e) => setPolicy({ ...policy, max_consecutive_days: Number(e.target.value) })}
                  className="w-28 p-2 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold text-center disabled:bg-slate-100 disabled:opacity-75"
                  required
                />
                <span className="text-xs font-semibold text-slate-500">days streak</span>
              </div>
            </div>

            {/* Field 4: Max Shifts Per Day */}
            <div className="space-y-2 p-4 rounded-xl bg-white border border-brand-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <label className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                  Max Shifts Per Single Day
                </label>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min={1}
                  max={4}
                  disabled={!permissions.canEditPolicy}
                  value={policy.max_shifts_per_day}
                  onChange={(e) => setPolicy({ ...policy, max_shifts_per_day: Number(e.target.value) })}
                  className="w-28 p-2 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold text-center disabled:bg-slate-100 disabled:opacity-75"
                  required
                />
                <span className="text-xs font-semibold text-slate-500">shift(s) per day</span>
              </div>
            </div>
          </div>

          {/* Toggle 5: Role Coverage Enforcement */}
          <div className="p-4 rounded-xl bg-white border border-brand-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                Enforce Role Coverage Conflicts
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!permissions.canEditPolicy}
                checked={policy.enforce_role_coverage}
                onChange={(e) => setPolicy({ ...policy, enforce_role_coverage: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-coral"></div>
            </label>
          </div>

          {/* Action Button for Policy Rules */}
          {permissions.canEditPolicy && (
            <div className="pt-4 flex justify-end border-t border-brand-border">
              <button
                type="submit"
                className="skeuo-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-brand-coral/20"
              >
                <Save className="w-4 h-4" />
                <span>Save Policy Rules</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* CARD 2: Security Settings */}
      <form onSubmit={handleSavePasscode} className="space-y-4">
        <div className="skeuo-card rounded-2xl p-6 space-y-5">
          <div className="border-b border-brand-border pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-brand-navy flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              <span>Security Settings</span>
            </h3>
          </div>

          {passcodeSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passcodeSuccessMsg}</span>
            </div>
          )}

          {passcodeErrorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{passcodeErrorMsg}</span>
            </div>
          )}

          <div className="max-w-md space-y-2">
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">
              Admin Security Passcode
            </label>
            <input
              type="text"
              disabled={!permissions.canEditPolicy}
              value={passcodes.adminPasscode}
              onChange={(e) => setPasscodes({ adminPasscode: e.target.value })}
              className="w-full p-2.5 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold tracking-wider disabled:bg-slate-100"
              placeholder="e.g. admin123"
              required
            />
            <p className="text-[11px] text-slate-500 font-medium pt-1">
              This passcode is required to unlock Admin privileges when elevating from Staff view.
            </p>
          </div>

          {/* Action Button for Passcode */}
          {permissions.canEditPolicy && (
            <div className="pt-4 flex justify-end border-t border-brand-border">
              <button
                type="submit"
                className="skeuo-btn-secondary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-brand-navy"
              >
                <Key className="w-4 h-4 text-amber-500" />
                <span>Update Admin Passcode</span>
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
