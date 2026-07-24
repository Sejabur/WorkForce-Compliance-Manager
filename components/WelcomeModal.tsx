"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("wf_compliance_welcome_dismissed_v1");
    if (!isDismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("wf_compliance_welcome_dismissed_v1", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-3xl bg-[#FFFDF5] border border-amber-200/80 p-8 shadow-2xl text-center space-y-5 transform transition-all animate-in zoom-in-95 duration-200">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#B45309] tracking-tight">
            This is a public demo.
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#D97706] leading-relaxed">
            You can deploy your own instance to your local device or server!
          </p>
        </div>

        <div className="pt-2 flex flex-col items-center gap-3">
          <a
            href="https://github.com/Sejabur/WorkForce-Compliance-Manager"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDismiss}
            className="inline-flex items-center justify-center gap-2 bg-[#111827] hover:bg-slate-800 text-white font-extrabold px-7 py-3 rounded-2xl text-sm shadow-xl shadow-slate-900/20 transition-all hover:scale-105"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-4 h-4 text-slate-300" />
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-bold text-[#B45309] hover:underline pt-1"
          >
            Continue to App
          </button>
        </div>
      </div>
    </div>
  );
}
