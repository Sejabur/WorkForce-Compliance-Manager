import { Employee, Shift, Violation, PolicyConfig } from "./supabase";

export function exportEmployeesCSV(employees: Employee[]) {
  if (!employees || employees.length === 0) return;

  const headers = ["Employee ID", "Full Name", "Role / Specialty", "Max Weekly Hours", "Created Date"];
  const rows = employees.map((e) => [
    e.id,
    `"${e.name.replace(/"/g, '""')}"`,
    `"${e.role.replace(/"/g, '""')}"`,
    e.max_weekly_hours,
    `"${(e.created_at || "").replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCSV(csv, `workforce_employees_${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportShiftsCSV(shifts: Shift[], employees: Employee[]) {
  if (!shifts || shifts.length === 0) return;

  const empMap = new Map(employees.map((e) => [e.id, e.name]));
  const headers = ["Shift ID", "Employee ID", "Employee Name", "Role", "Date", "Start Time", "End Time", "Status"];

  const rows = shifts.map((s) => [
    s.id,
    s.employee_id,
    `"${(empMap.get(s.employee_id) || "Unassigned").replace(/"/g, '""')}"`,
    `"${(s.required_role || "").replace(/"/g, '""')}"`,
    s.shift_date,
    s.start_time,
    s.end_time,
    s.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCSV(csv, `workforce_shifts_${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportAuditReportCSV(violations: Violation[], policy: PolicyConfig) {
  if (!violations) return;

  const headers = ["Breach ID", "Rule Name", "Title", "Severity", "Description"];
  const rows = violations.map((v) => [
    v.id,
    `"${v.ruleName.replace(/"/g, '""')}"`,
    `"${v.title.replace(/"/g, '""')}"`,
    v.severity,
    `"${v.description.replace(/"/g, '""')}"`,
  ]);

  const csv = [
    `# Policy Thresholds: Max Weekly Hours: ${policy.max_weekly_hours}h | Min Rest Gap: ${policy.min_rest_hours}h | Max Streak: ${policy.max_consecutive_days}d`,
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");

  downloadCSV(csv, `compliance_audit_report_${new Date().toISOString().split("T")[0]}.csv`);
}

function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export PDF Report via Print Layout Window
export function exportRiskReportPDF(memoText: string, violationsCount: number, complianceScore: number) {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Compliance Risk Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1E293B; line-height: 1.6; }
          h1 { font-size: 22px; margin-bottom: 4px; color: #0F172A; }
          .subtitle { font-size: 12px; color: #64748B; margin-bottom: 24px; }
          .badge-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          .badge { font-weight: bold; color: #DC2626; }
          .content { background: #FFFFFF; border: 1px solid #CBD5E1; padding: 24px; border-radius: 12px; font-size: 14px; white-space: pre-wrap; }
          .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>WorkForce Compliance Manager — Executive Risk Brief</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        
        <div class="badge-box">
          <div><strong>Compliance Score:</strong> ${complianceScore}%</div>
          <div><strong>Detected Breaches:</strong> <span class="badge">${violationsCount} Items</span></div>
        </div>

        <div class="content">${memoText}</div>

        <div class="footer">
          ⚠️ Disclaimer: AI-generated risk reports are advisory. Please verify compliance findings against official corporate policies.
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
