"use client";

import React, { useState, useRef, useEffect } from "react";
import { Shield, ChevronDown, UserCheck, Eye, Lock, LogOut } from "lucide-react";
import { useRBAC, RoleType } from "@/lib/rbac";
import AuthModal from "@/components/AuthModal";

interface RoleSwitcherProps {
  isCollapsed?: boolean;
}

export default function RoleSwitcher({ isCollapsed = false }: RoleSwitcherProps) {
  const { role, isAuthenticated, logout } = useRBAC();
  const [isOpen, setIsOpen] = useState(false);
  const [authModalTarget, setAuthModalTarget] = useState<RoleType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roles: { type: RoleType; label: string; icon: React.ElementType; badgeColor: string; desc: string }[] = [
    {
      type: "Admin",
      label: "Admin",
      icon: UserCheck,
      badgeColor: "bg-purple-100 text-purple-900 border-purple-200",
      desc: "Full Control (Passcode Required)",
    },
    {
      type: "Staff",
      label: "Staff",
      icon: Eye,
      badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
      desc: "View Only Mode",
    },
  ];

  const currentRoleObj = roles.find((r) => r.type === role) || roles[1];
  const Icon = currentRoleObj.icon;

  const handleRoleSelect = (targetRole: RoleType) => {
    setIsOpen(false);
    if (targetRole === "Staff") {
      logout();
      return;
    }
    if (role === "Admin" && isAuthenticated) {
      return;
    }
    setAuthModalTarget(targetRole);
  };

  return (
    <>
      <div ref={containerRef} className="space-y-2 w-full flex flex-col items-center">
        <div className="relative w-full flex justify-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white hover:bg-white/20 transition-all ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            }`}
            title={isCollapsed ? `Role: ${currentRoleObj.label}` : "Active Role"}
          >
            <div className={`flex items-center gap-2 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
              <Shield className="w-4 h-4 text-brand-coral shrink-0" />
              {!isCollapsed && (
                <span className="font-extrabold text-white truncate flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-300" />
                  Role: {currentRoleObj.label}
                </span>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1.5">
                {isAuthenticated ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Authenticated"></span>
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            )}
          </button>

          {isOpen && (
            <div
              className={`absolute ${
                isCollapsed
                  ? "left-full bottom-0 ml-3 w-64"
                  : "top-full mt-2 left-0 right-0 lg:bottom-full lg:top-auto lg:mb-2 w-full sm:w-60"
              } rounded-2xl bg-white p-2 shadow-2xl border border-brand-border z-[9999] animate-in fade-in zoom-in-95 duration-150 text-slate-800`}
            >
              <div className="px-3 py-2 border-b border-brand-border mb-1">
                <span className="text-[11px] font-extrabold text-brand-navy uppercase tracking-wider block">
                  Select Role
                </span>
              </div>

              <div className="space-y-1">
                {roles.map((r) => {
                  const RIcon = r.icon;
                  const isSelected = r.type === role;

                  return (
                    <button
                      key={r.type}
                      type="button"
                      onClick={() => handleRoleSelect(r.type)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start gap-2.5 ${
                        isSelected ? "bg-slate-100 font-bold border border-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${r.badgeColor}`}>
                        <RIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-brand-navy">{r.label}</span>
                          {isSelected && isAuthenticated && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-bold text-red-300 hover:bg-red-500/25 hover:text-white transition-all ${
              isCollapsed ? "p-2.5" : "px-3 py-2"
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 text-brand-coral shrink-0" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        )}
      </div>

      {authModalTarget && (
        <AuthModal
          isOpen={Boolean(authModalTarget)}
          onClose={() => setAuthModalTarget(null)}
          targetRole={authModalTarget}
        />
      )}
    </>
  );
}
