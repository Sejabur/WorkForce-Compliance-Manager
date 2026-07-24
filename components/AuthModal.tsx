"use client";

import React, { useState } from "react";
import { Lock, Shield, AlertCircle } from "lucide-react";
import { useRBAC, RoleType } from "@/lib/rbac";
import Modal from "@/components/Modal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: RoleType;
}

export default function AuthModal({ isOpen, onClose, targetRole }: AuthModalProps) {
  const { login } = useRBAC();
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const res = login(targetRole, passcode);
    if (!res.success) {
      setErrorMsg(res.error || "Authentication failed.");
      return;
    }

    setPasscode("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Authentication"
      subtitle="Enter security passcode to unlock Admin privileges"
    >
      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
            Admin Security Passcode *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Admin Security Passcode"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold tracking-wider"
              autoFocus
              required
            />
          </div>
          {/* Subtle Public Demo Text Hint (No Auto-fill button) */}
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">
            Demo Passcode: <span className="font-bold text-brand-navy">admin123</span>
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-2.5 border-t border-brand-border">
          <button
            type="button"
            onClick={onClose}
            className="skeuo-btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-brand-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="skeuo-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md"
          >
            <Shield className="w-4 h-4" />
            <span>Authenticate</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
