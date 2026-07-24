"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Briefcase,
  Clock,
  Trash2,
  Download,
  Search,
} from "lucide-react";
import {
  fetchEmployeesAsync,
  fetchShiftsAsync,
  saveShiftAsync,
  deleteShiftAsync,
  Employee,
  Shift,
} from "@/lib/supabase";
import { exportShiftsCSV } from "@/lib/exportUtils";
import { useRBAC } from "@/lib/rbac";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { SkeletonTableRow } from "@/components/SkeletonLoader";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";
import CustomTimePicker from "@/components/CustomTimePicker";

export default function ShiftsPage() {
  const { permissions } = useRBAC();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [requiredRole, setRequiredRole] = useState("");
  const [formError, setFormError] = useState("");

  // Confirm Delete State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoadingData(true);
    const emps = await fetchEmployeesAsync();
    const shs = await fetchShiftsAsync();
    setEmployees(emps);
    setShifts(shs);
    setIsLoadingData(false);

    if (emps.length > 0 && !selectedEmpId) {
      setSelectedEmpId(emps[0].id);
      setRequiredRole(emps[0].role);
    }
    if (!shiftDate) {
      setShiftDate(new Date().toISOString().split("T")[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!permissions.canManageShifts) {
      setFormError("Admin role required to create shifts.");
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
    setIsAddModalOpen(false);
    await loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || !permissions.canManageShifts) return;
    await deleteShiftAsync(deleteTargetId);
    setDeleteTargetId(null);
    await loadData();
  };

  const empMap = new Map(employees.map((e) => [e.id, e]));

  const filteredShifts = shifts.filter((shift) => {
    const emp = empMap.get(shift.employee_id);
    const empName = emp ? emp.name.toLowerCase() : "unassigned";
    const roleName = (shift.required_role || (emp ? emp.role : "")).toLowerCase();
    const dateStr = shift.shift_date.toLowerCase();
    const term = searchTerm.toLowerCase();

    return (
      empName.includes(term) ||
      roleName.includes(term) ||
      dateStr.includes(term)
    );
  });

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
          Shifts Schedule
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => exportShiftsCSV(shifts, employees)}
            disabled={shifts.length === 0}
            className="skeuo-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-brand-navy disabled:opacity-50"
            title="Export Shifts CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          {permissions.canManageShifts && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={employees.length === 0}
              className="skeuo-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-coral/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Filter Bar */}
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
          Showing {filteredShifts.length} of {shifts.length} scheduled shifts
        </div>
      </div>

      {/* Shifts Table Card */}
      <div className="skeuo-card rounded-2xl p-5 sm:p-6 overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
              <tr>
                <th className="px-4 py-3 text-slate-700">Assigned Employee</th>
                <th className="px-4 py-3 text-slate-700">Role / Specialty</th>
                <th className="px-4 py-3 text-slate-700">Shift Date</th>
                <th className="px-4 py-3 text-slate-700">Time Window</th>
                {permissions.canManageShifts && (
                  <th className="px-4 py-3 text-right text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border bg-white text-slate-800 font-medium">
              {isLoadingData ? (
                <>
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                </>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                    No shifts found.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const emp = empMap.get(shift.employee_id);
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-extrabold text-brand-navy">
                        {emp ? emp.name : "Unassigned"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                          {shift.required_role || (emp ? emp.role : "Staff")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {shift.shift_date}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {shift.start_time} - {shift.end_time}
                        </span>
                      </td>
                      {permissions.canManageShifts && (
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setDeleteTargetId(shift.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-coral hover:bg-red-50 transition-colors"
                            title="Delete Shift"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shift Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Shift"
      >
        <form onSubmit={handleAddShift} className="space-y-4">
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
              onClick={() => setIsAddModalOpen(false)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Shift"
        message="Are you sure you want to delete this shift assignment?"
        confirmText="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
