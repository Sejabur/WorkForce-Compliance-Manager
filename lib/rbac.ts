"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getStoredPasscodes } from "./supabase";

export type RoleType = "Admin" | "Staff";

export interface Permissions {
  canViewDashboard: boolean;
  canViewEmployees: boolean;
  canViewShifts: boolean;
  canViewComplianceCheck: boolean;
  canViewRiskReport: boolean;
  canViewPolicySettings: boolean;
  canEditPolicy: boolean;
  canManageEmployees: boolean;
  canManageShifts: boolean;
  canRunComplianceScan: boolean;
  canGenerateAIReports: boolean;
}

const PERMISSION_MATRIX: Record<RoleType, Permissions> = {
  Admin: {
    canViewDashboard: true,
    canViewEmployees: true,
    canViewShifts: true,
    canViewComplianceCheck: true,
    canViewRiskReport: true,
    canViewPolicySettings: true,
    canEditPolicy: true,
    canManageEmployees: true,
    canManageShifts: true,
    canRunComplianceScan: true,
    canGenerateAIReports: true,
  },
  Staff: {
    canViewDashboard: false,
    canViewEmployees: false,
    canViewShifts: true, // Staff sees Shifts schedule ONLY
    canViewComplianceCheck: false,
    canViewRiskReport: false,
    canViewPolicySettings: false,
    canEditPolicy: false,
    canManageEmployees: false,
    canManageShifts: false,
    canRunComplianceScan: false,
    canGenerateAIReports: false,
  },
};

interface RBACContextType {
  role: RoleType;
  isAuthenticated: boolean;
  isLoaded: boolean;
  permissions: Permissions;
  login: (targetRole: RoleType, passcode: string) => { success: boolean; error?: string };
  logout: () => void;
}

const RBACContext = createContext<RBACContextType>({
  role: "Staff",
  isAuthenticated: false,
  isLoaded: false,
  permissions: PERMISSION_MATRIX.Staff,
  login: () => ({ success: false }),
  logout: () => {},
});

export const RBACProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRoleState] = useState<RoleType>("Staff");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const savedSession = localStorage.getItem("wf_compliance_auth_session_v1");
    if (savedSession) {
      try {
        const { role: savedRole, auth } = JSON.parse(savedSession);
        if (savedRole && PERMISSION_MATRIX[savedRole as RoleType]) {
          setRoleState(savedRole);
          setIsAuthenticated(Boolean(auth));
        }
      } catch (e) {
        // Fallback default
      }
    }
    setIsLoaded(true);
  }, []);

  const login = (targetRole: RoleType, passcode: string): { success: boolean; error?: string } => {
    if (targetRole === "Staff") {
      setRoleState("Staff");
      setIsAuthenticated(false);
      localStorage.setItem("wf_compliance_auth_session_v1", JSON.stringify({ role: "Staff", auth: false }));
      return { success: true };
    }

    const currentPasscodes = getStoredPasscodes();
    const validPasscode = currentPasscodes.adminPasscode;

    if (!passcode || passcode.trim() !== validPasscode) {
      return { success: false, error: "Invalid Admin passcode." };
    }

    setRoleState("Admin");
    setIsAuthenticated(true);
    localStorage.setItem("wf_compliance_auth_session_v1", JSON.stringify({ role: "Admin", auth: true }));
    return { success: true };
  };

  const logout = () => {
    setRoleState("Staff");
    setIsAuthenticated(false);
    localStorage.setItem("wf_compliance_auth_session_v1", JSON.stringify({ role: "Staff", auth: false }));
  };

  return React.createElement(
    RBACContext.Provider,
    {
      value: {
        role,
        isAuthenticated,
        isLoaded,
        permissions: PERMISSION_MATRIX[role],
        login,
        logout,
      },
    },
    children
  );
};

export const useRBAC = () => useContext(RBACContext);
