"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Briefcase,
  Clock,
  Trash2,
  Lock,
  Key,
  Download,
} from "lucide-react";
import {
  fetchEmployeesAsync,
  saveEmployeeAsync,
  deleteEmployeeAsync,
  Employee,
} from "@/lib/supabase";
import { exportEmployeesCSV } from "@/lib/exportUtils";
import { useRBAC } from "@/lib/rbac";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { SkeletonTableRow } from "@/components/SkeletonLoader";
import AuthModal from "@/components/AuthModal";

export default function EmployeesPage() {
  const { permissions, isLoaded } = useRBAC();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState("Staff");
  const [maxHours, setMaxHours] = useState(40);
  const [formError, setFormError] = useState("");

  // Confirm Delete State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoadingData(true);
    const emps = await fetchEmployeesAsync();
    setEmployees(emps);
    setIsLoadingData(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!permissions.canManageEmployees) {
      setFormError("Admin role required to add employees.");
      return;
    }
    if (!name.trim()) {
      setFormError("Employee name is required.");
      return;
    }
    if (maxHours < 1 || maxHours > 80) {
      setFormError("Max weekly hours must be between 1 and 80.");
      return;
    }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || "Staff",
      max_weekly_hours: Number(maxHours),
      created_at: new Date().toISOString(),
    };

    await saveEmployeeAsync(newEmp);
    setName("");
    setRole("Staff");
    setMaxHours(40);
    setIsAddModalOpen(false);
    await loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || !permissions.canManageEmployees) return;
    await deleteEmployeeAsync(deleteTargetId);
    setDeleteTargetId(null);
    await loadData();
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Wait until session is loaded from localStorage to prevent pre-hydration flicker
  if (!isLoaded) return null;

  // Route Guard: Access Restricted for Staff Role
  if (!permissions.canViewEmployees) {
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

  return (
    <div className="space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border">
        <h1 className="text-2xl font-black text-brand-navy tracking-tight">
          Employees
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportEmployeesCSV(employees)}
            disabled={employees.length === 0}
            className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-brand-navy disabled:opacity-50"
            title="Export Employees CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          {permissions.canManageEmployees && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="skeuo-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-xs shadow-md shadow-brand-coral/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="skeuo-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-medium"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="skeuo-card rounded-2xl p-5 sm:p-6 overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
              <tr>
                <th className="px-4 py-3 text-slate-700">Name</th>
                <th className="px-4 py-3 text-slate-700">Role / Specialty</th>
                <th className="px-4 py-3 text-slate-700">Weekly Hours Cap</th>
                {permissions.canManageEmployees && (
                  <th className="px-4 py-3 text-right text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border bg-white text-slate-800 font-medium">
              {isLoadingData ? (
                <>
                  <SkeletonTableRow cols={4} />
                  <SkeletonTableRow cols={4} />
                  <SkeletonTableRow cols={4} />
                </>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500 text-sm">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-extrabold text-brand-navy">
                      {emp.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {emp.max_weekly_hours} hrs / week
                      </span>
                    </td>
                    {permissions.canManageEmployees && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setDeleteTargetId(emp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-coral hover:bg-red-50 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
      >
        <form onSubmit={handleAddEmployee} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 rounded-lg border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full p-2.5 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
              Role / Specialty *
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role / Specialty"
              className="w-full p-2.5 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider mb-1">
              Max Weekly Hours Cap (1 - 80) *
            </label>
            <input
              type="number"
              min={1}
              max={80}
              value={maxHours}
              onChange={(e) => setMaxHours(Number(e.target.value))}
              placeholder="Max Weekly Hours Cap"
              className="w-full p-2.5 text-sm rounded-xl skeuo-input bg-white text-brand-navy font-bold"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-2.5 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="skeuo-btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-brand-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="skeuo-btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Employee"
        message="Are you sure you want to delete this employee? All associated shifts will remain but will require reassignment."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
