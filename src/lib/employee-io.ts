/**
 * Client-side replacements for the PHP employee import/export endpoints.
 *
 *  - parseEmployeeCsv:       Parse the import template CSV into rows.
 *  - importEmployeesFromCsv: Loop rows, invoke the `create-employee` edge
 *                            function for each, return per-row errors.
 *  - exportEmployeesXlsx:    Build an XLSX workbook with all employee fields.
 *  - exportEmployeesPdf:     Build a landscape PDF table of employees.
 *
 *  Mirrors the column order from /tmp/hrm/api/routes/employees.php
 *  (handleEmployeeUpload + handleExportAllEmployeesExcel).
 */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

export const EMPLOYEE_CSV_HEADERS = [
  "First Name", "Last Name", "Email", "Phone", "Job Title",
  "Employment Type", "Employment Status", "Start Date",
  "Basic Salary", "Food Allowance", "Accommodation Allowance", "Other Allowance",
  "Nationality", "Passport Number", "Passport Expiry Date",
  "Visa Number", "Visa Expiry Date",
  "Work Permit Number", "Work Permit Expiry Date",
  "Insurance Expiry Date", "Medical Expiry Date", "Quota Expiry Date",
  "Bank Name 1", "Account Number 1", "Currency 1",
  "Bank Name 2", "Account Number 2", "Currency 2",
  "Emergency Contact Name", "Emergency Contact Phone", "Emergency Contact Relation",
  "Uniform Size", "Uniform Issued Date",
  "Safety Shoe Size", "Safety Shoe Issued Date",
  "Password",
] as const;

const FIELD_ORDER = [
  "firstName", "lastName", "email", "phone", "jobTitle",
  "employmentType", "employmentStatus", "startDate",
  "basicSalary", "foodAllowance", "accommodationAllowance", "otherAllowance",
  "nationality", "passportNumber", "passportExpiryDate",
  "visaNumber", "visaExpiryDate",
  "workPermitNumber", "workPermitExpiryDate",
  "insuranceExpiryDate", "medicalExpiryDate", "quotaExpiryDate",
  "bankName1", "accountNumber1", "currency1",
  "bankName2", "accountNumber2", "currency2",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
  "uniformSize", "uniformIssuedDate",
  "safetyShoeSize", "safetyShoeIssuedDate",
  "password",
] as const;

const NUMERIC_FIELDS = new Set([
  "basicSalary", "foodAllowance", "accommodationAllowance", "otherAllowance",
]);
const DATE_FIELDS = new Set([
  "startDate", "passportExpiryDate", "visaExpiryDate", "workPermitExpiryDate",
  "insuranceExpiryDate", "medicalExpiryDate", "quotaExpiryDate",
  "uniformIssuedDate", "safetyShoeIssuedDate",
]);

// ---------- CSV parsing ----------
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseDate(s: string): string | null {
  const v = s.trim();
  if (!v) return null;
  // Accept yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const t = Date.parse(v);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export type ParsedEmployeeRow = Record<string, string | number | null> & {
  __rowNum: number;
};

export function parseEmployeeCsv(text: string): ParsedEmployeeRow[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const dataLines = lines.slice(1);
  return dataLines.map((line, idx) => {
    const cols = parseCsvLine(line);
    const row: ParsedEmployeeRow = { __rowNum: idx + 2 };
    FIELD_ORDER.forEach((field, i) => {
      const raw = (cols[i] ?? "").trim();
      if (!raw) {
        row[field] = NUMERIC_FIELDS.has(field) ? 0 : null;
        return;
      }
      if (NUMERIC_FIELDS.has(field)) {
        const n = Number(raw);
        row[field] = isNaN(n) ? 0 : Math.round(n);
      } else if (DATE_FIELDS.has(field)) {
        row[field] = parseDate(raw);
      } else {
        row[field] = raw;
      }
    });
    return row;
  });
}

// ---------- Import via edge function ----------
export type ImportResult = {
  imported: number;
  total: number;
  errors: string[];
};

export async function importEmployeesFromCsv(
  file: File,
): Promise<ImportResult> {
  const text = await file.text();
  const rows = parseEmployeeCsv(text);
  const errors: string[] = [];
  let imported = 0;

  for (const row of rows) {
    const rowNum = row.__rowNum;
    const firstName = String(row.firstName ?? "").trim();
    const lastName = String(row.lastName ?? "").trim();
    const email = String(row.email ?? "").trim();
    if (!firstName || !lastName || !email) {
      errors.push(`Row ${rowNum}: First name, last name, and email are required`);
      continue;
    }
    const password = String(row.password ?? "").trim() || "password123";

    // Strip helper field + omit "password" from spread (sent separately)
    const { __rowNum, password: _pw, ...rest } = row;
    const payload: Record<string, unknown> = {
      ...rest,
      firstName,
      lastName,
      email,
      password,
      jobTitle: String(row.jobTitle ?? "Employee").trim() || "Employee",
      employmentType: String(row.employmentType ?? "full_time").trim() || "full_time",
      employmentStatus: String(row.employmentStatus ?? "active").trim() || "active",
    };

    const { data, error } = await supabase.functions.invoke("create-employee", {
      body: payload,
    });
    if (error || (data as { error?: string } | null)?.error) {
      const msg =
        (data as { error?: string } | null)?.error ?? error?.message ?? "Unknown error";
      errors.push(`Row ${rowNum} (${email}): ${msg}`);
      continue;
    }
    imported++;
  }

  return { imported, total: rows.length, errors };
}

// ---------- Excel export ----------
type EmployeeForExport = Record<string, unknown> & {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export function exportEmployeesXlsx(employees: EmployeeForExport[], departments: { id: string; name: string }[] = []): void {
  const deptName = (id?: string | null) =>
    (departments.find((d) => d.id === id)?.name) ?? "";

  const rows = employees.map((e) => ({
    "First Name": e.firstName ?? "",
    "Last Name": e.lastName ?? "",
    Email: e.email ?? "",
    Phone: e.phone ?? "",
    "Job Title": e.jobTitle ?? "",
    Department: deptName(e.departmentId as string | null | undefined),
    "Employment Type": e.employmentType ?? "",
    "Employment Status": e.employmentStatus ?? "",
    "Start Date": e.startDate ?? "",
    Nationality: e.nationality ?? "",
    "Basic Salary": e.basicSalary ?? 0,
    "Food Allowance": e.foodAllowance ?? 0,
    "Accommodation Allowance": e.accommodationAllowance ?? 0,
    "Other Allowance": e.otherAllowance ?? 0,
    "Passport Number": e.passportNumber ?? "",
    "Passport Expiry": e.passportExpiryDate ?? "",
    "Visa Number": e.visaNumber ?? "",
    "Visa Expiry": e.visaExpiryDate ?? "",
    "Work Permit Number": e.workPermitNumber ?? "",
    "Work Permit Expiry": e.workPermitExpiryDate ?? "",
    "Insurance Expiry": e.insuranceExpiryDate ?? "",
    "Medical Expiry": e.medicalExpiryDate ?? "",
    "Quota Expiry": e.quotaExpiryDate ?? "",
    "Bank 1": e.bankName1 ?? "",
    "Account 1": e.accountNumber1 ?? "",
    "Currency 1": e.currency1 ?? "",
    "Bank 2": e.bankName2 ?? "",
    "Account 2": e.accountNumber2 ?? "",
    "Currency 2": e.currency2 ?? "",
    "Emergency Contact": e.emergencyContactName ?? "",
    "Emergency Phone": e.emergencyContactPhone ?? "",
    "Emergency Relation": e.emergencyContactRelation ?? "",
    "Uniform Size": e.uniformSize ?? "",
    "Uniform Issued": e.uniformIssuedDate ?? "",
    "Safety Shoe Size": e.safetyShoeSize ?? "",
    "Safety Shoe Issued": e.safetyShoeIssuedDate ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, `employees_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------- PDF export ----------
export function exportEmployeesPdf(
  employees: EmployeeForExport[],
  departments: { id: string; name: string }[] = [],
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const deptName = (id?: string | null) =>
    (departments.find((d) => d.id === id)?.name) ?? "";

  doc.setFontSize(16);
  doc.text("Employee Directory", 40, 40);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
  doc.text(`Total: ${employees.length}`, 40, 72);

  autoTable(doc, {
    startY: 90,
    head: [[
      "Name", "Email", "Phone", "Job Title", "Department",
      "Type", "Status", "Start Date", "Nationality",
    ]],
    body: employees.map((e) => [
      `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim(),
      String(e.email ?? ""),
      String(e.phone ?? ""),
      String(e.jobTitle ?? ""),
      deptName(e.departmentId as string | null | undefined),
      String(e.employmentType ?? ""),
      String(e.employmentStatus ?? ""),
      String(e.startDate ?? ""),
      String(e.nationality ?? ""),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  doc.save(`employees_export_${new Date().toISOString().slice(0, 10)}.pdf`);
}
