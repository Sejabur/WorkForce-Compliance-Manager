"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ShieldCheck,
  Sliders,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Logo from "@/components/Logo";
import RoleSwitcher from "@/components/RoleSwitcher";
import { getStoredScan, getStoredShifts } from "@/lib/supabase";
import { useRBAC } from "@/lib/rbac";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { permissions } = useRBAC();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasUnscannedShifts, setHasUnscannedShifts] = useState(false);
  const [hasUnresolvedViolations, setHasUnresolvedViolations] = useState(false);

  useEffect(() => {
    const checkBadges = () => {
      const scan = getStoredScan();
      const shifts = getStoredShifts();

      if (!scan) {
        setHasUnscannedShifts(shifts.length > 0);
        setHasUnresolvedViolations(false);
      } else {
        setHasUnscannedShifts(scan.isStale);
        setHasUnresolvedViolations(!scan.isStale && scan.totalViolations > 0);
      }
    };

    checkBadges();
    const interval = setInterval(checkBadges, 1000);
    return () => clearInterval(interval);
  }, []);

  const allNavItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      show: permissions.canViewDashboard,
    },
    {
      name: "Employees",
      href: "/employees",
      icon: Users,
      show: permissions.canViewEmployees,
    },
    {
      name: "Shifts",
      href: "/shifts",
      icon: Calendar,
      show: permissions.canViewShifts,
    },
    {
      name: "Compliance Check",
      href: "/compliance",
      icon: ShieldCheck,
      badge: hasUnscannedShifts ? "amber" : null,
      show: permissions.canViewComplianceCheck,
    },
    {
      name: "Risk Report",
      href: "/assessment",
      icon: Sparkles,
      badge: hasUnresolvedViolations ? "red" : null,
      show: permissions.canViewRiskReport,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Sliders,
      show: permissions.canViewPolicySettings,
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.show);

  return (
    <>
      {/* Mobile / Tablet Sticky Header (<1024px) */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#1C2439] text-white border-b border-white/10 shadow-md">
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="text-xs sm:text-sm font-black text-white tracking-tight leading-snug">
                WorkForce Compliance Manager
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#3B82F6] tracking-wide select-none mt-0.5">
                by sejabur.dev
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Collapsible Mobile Dropdown Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="px-4 pb-5 pt-2 border-t border-white/10 space-y-4 bg-[#1C2439] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="pb-3 border-b border-white/10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                Active Session
              </span>
              <RoleSwitcher />
            </div>

            <nav className="space-y-1.5">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-coral text-white font-bold shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <span>{item.name}</span>
                    </div>

                    {item.badge === "amber" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white/40"></span>
                    )}
                    {item.badge === "red" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-coral border border-white/40"></span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Desktop Collapsible Sidebar (>=1024px) */}
      <aside
        className={`hidden lg:flex fixed top-0 bottom-0 left-0 z-40 skeuo-sidebar flex-col text-white transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Header Branding */}
        <div className={`p-4 border-b border-white/10 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"} min-h-[76px]`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Logo size={36} />
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0 pr-1">
                <Logo size={36} />
                <div className="min-w-0 leading-tight">
                  <h1 className="text-xs font-black text-white tracking-tight leading-snug">
                    WorkForce Compliance Manager
                  </h1>
                  <p className="text-[11px] font-bold text-[#3B82F6] tracking-wide select-none mt-0.5">
                    by sejabur.dev
                  </p>
                </div>
              </div>

              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-1"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`relative flex items-center ${
                  isCollapsed ? "justify-center px-0" : "justify-between px-3.5"
                } py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-brand-coral text-white shadow-md shadow-brand-coral/20 border border-white/20 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>

                {!isCollapsed && (
                  <>
                    {item.badge === "amber" && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white/40"></span>
                      </span>
                    )}
                    {item.badge === "red" && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-coral opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-coral border border-white/40"></span>
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Single Role Switcher & Log Out */}
        <div className="p-3 border-t border-white/10 bg-[#171e33]">
          <RoleSwitcher isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
}
