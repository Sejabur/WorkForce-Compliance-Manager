"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Play,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  ArrowLeft,
  Cpu,
  UserCheck,
  Lock,
  Key,
  Printer,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { fetchPolicyAsync, getStoredScan, ScanResult, PolicyConfig, DEFAULT_POLICY } from "@/lib/supabase";
import { exportRiskReportPDF } from "@/lib/exportUtils";
import { useRBAC } from "@/lib/rbac";
import AuthModal from "@/components/AuthModal";

// Helper function to render clean formatted memo UI without raw asterisks or em dashes
function MemoDisplayFormatter({ text }: { text: string }) {
  // Strip any residual markdown asterisks or em dashes
  const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/—/g, "-");

  // Split lines
  const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

  let currentSection = "general";
  const sections: { [key: string]: string[] } = {
    overview: [],
    breaches: [],
    actions: [],
    general: [],
  };

  lines.forEach((line) => {
    const upper = line.toUpperCase();
    if (upper.includes("RISK OVERVIEW")) {
      currentSection = "overview";
      return;
    }
    if (upper.includes("KEY POLICY BREACHES") || upper.includes("BREACHES IDENTIFIED")) {
      currentSection = "breaches";
      return;
    }
    if (upper.includes("RECOMMENDED CORRECTIVE") || upper.includes("CORRECTIVE ACTIONS")) {
      currentSection = "actions";
      return;
    }

    sections[currentSection].push(line);
  });

  return (
    <div className="space-y-4">
      {/* Risk Overview Section */}
      {sections.overview.length > 0 && (
        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/70 space-y-1.5">
          <div className="flex items-center gap-2 text-purple-900 font-extrabold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-purple-600" />
            <span>Risk Overview</span>
          </div>
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            {sections.overview.join(" ")}
          </p>
        </div>
      )}

      {/* Breaches Section */}
      {sections.breaches.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/70 space-y-2">
          <div className="flex items-center gap-2 text-brand-coral font-extrabold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-brand-coral" />
            <span>Key Policy Breaches Identified</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {sections.breaches.map((b, idx) => (
              <li key={idx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-coral shrink-0 mt-1.5"></span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions Section */}
      {sections.actions.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Recommended Corrective Actions</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {sections.actions.map((a, idx) => (
              <li key={idx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback for General Paragraphs */}
      {sections.general.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          {sections.general.map((g, idx) => (
            <p key={idx} className="text-xs font-medium text-slate-700 leading-relaxed">
              {g}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIAssessmentPage() {
  const { permissions, isLoaded } = useRBAC();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [policy, setPolicy] = useState<PolicyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [memo, setMemo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    async function init() {
      setScan(getStoredScan());
      const p = await fetchPolicyAsync();
      setPolicy(p);
    }
    init();
  }, []);

  const handleGenerateMemo = async () => {
    if (!scan || scan.violations.length === 0) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/groq-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          violations: scan.violations,
          policy: policy || DEFAULT_POLICY,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate risk assessment.");
      }

      setMemo(data.memo);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while connecting to Groq AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMemo = () => {
    if (!memo) return;
    // Strip markdown asterisks and em dashes before copying
    const clean = memo.replace(/\*\*/g, "").replace(/\*/g, "").replace(/—/g, "-");
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Wait until session is loaded from localStorage to prevent pre-hydration flicker
  if (!isLoaded) return null;

  // Route Guard: Access Restricted for Staff Role
  if (!permissions.canViewRiskReport) {
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
  const hasViolations = scan && !isStale && violations.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border">
        <h1 className="text-2xl font-black text-brand-navy tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <span>Risk Report</span>
        </h1>

        <div className="flex items-center gap-3">
          {memo && (
            <button
              onClick={() => exportRiskReportPDF(memo.replace(/\*\*/g, "").replace(/\*/g, "").replace(/—/g, "-"), violations.length, scan?.complianceScore || 100)}
              className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-brand-navy"
            >
              <Printer className="w-4 h-4 text-purple-600" />
              <span>Export PDF Report</span>
            </button>
          )}

          <Link
            href="/compliance"
            className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto text-brand-navy"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Compliance Check</span>
          </Link>
        </div>
      </div>

      {/* State 1: No Scan Run Yet or Stale */}
      {(!scan || isStale) && (
        <div className="skeuo-card rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy">
            {!scan ? "No Policy Scan Results Available" : "Schedule or Policy Modified (Stale Validation)"}
          </h3>
          <Link
            href="/compliance"
            className="skeuo-btn-primary px-5 py-2.5 rounded-xl text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Go to Compliance Check</span>
          </Link>
        </div>
      )}

      {/* State 2: Scan is Clean */}
      {scan && !isStale && violations.length === 0 && (
        <div className="skeuo-card rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy">Schedule is 100% Policy Compliant</h3>
        </div>
      )}

      {/* State 3: Active Violations Exist */}
      {hasViolations && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-brand-coral shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-brand-coral">
                  {violations.length} Policy Breaches Detected (Score: {scan.complianceScore}%)
                </h4>
              </div>
            </div>

            <button
              onClick={handleGenerateMemo}
              disabled={isLoading}
              className="skeuo-btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-lg shadow-purple-600/20 disabled:opacity-50 self-start sm:self-auto"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Generating Risk Brief..." : "Generate AI Risk Brief"}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Brief Card */}
          {memo && (
            <div className="skeuo-card rounded-2xl p-6 space-y-5 border-purple-200 bg-gradient-to-b from-white to-purple-50/20">
              <div className="flex items-center justify-between border-b border-brand-border pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="text-base font-extrabold text-brand-navy">Chief Operations Officer (COO) Brief</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportRiskReportPDF(memo.replace(/\*\*/g, "").replace(/\*/g, "").replace(/—/g, "-"), violations.length, scan?.complianceScore || 100)}
                    className="skeuo-btn-secondary p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    title="Export PDF Report"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={handleCopyMemo}
                    className="skeuo-btn-secondary p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    title="Copy Memo Text"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Clean Structured Memo Renderer */}
              <MemoDisplayFormatter text={memo} />

              {/* AI Accuracy Warning Disclaimer Banner */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>⚠️ Disclaimer: AI-generated risk reports are advisory. Please verify compliance findings against official corporate policies.</span>
              </div>

              {/* Single Clean AI Badge (Removed duplicate text on right!) */}
              <div className="pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold tracking-wide shadow-sm">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Generated by Groq · Llama 3.3 Versatile</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
