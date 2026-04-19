import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";

export interface PayslipData {
  month: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  overtimeAmount: number;
  deductions: number;
  grossSalary: number;
  netPay: number;
  status: string;
}

export interface PayslipEmployee {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
}

const fmtMoney = (dollars: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "USD").toUpperCase() })
    .format(dollars ?? 0);

export function downloadPayslipPdf(p: PayslipData, e: PayslipEmployee, companyName = "Company", currency = "USD") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, 56, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Payslip", W - 56, y, { align: "right" });
  y += 24;
  doc.setDrawColor(200);
  doc.line(56, y, W - 56, y);
  y += 24;

  // Employee + period
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Employee", 56, y);
  doc.text("Pay Period", W / 2, y);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${e.firstName} ${e.lastName}`, 56, y + 14);
  doc.text(p.month, W / 2, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(e.jobTitle, 56, y + 28);
  doc.text(
    `${format(parseISO(p.payPeriodStart), "MMM d, yyyy")} – ${format(parseISO(p.payPeriodEnd), "MMM d, yyyy")}`,
    W / 2,
    y + 28,
  );
  doc.text(e.email, 56, y + 42);
  doc.text(`Status: ${p.status}`, W / 2, y + 42);
  y += 70;

  // Earnings + deductions table
  doc.setDrawColor(220);
  doc.line(56, y, W - 56, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text("Earnings", 56, y);
  doc.text("Amount", W - 56, y, { align: "right" });
  y += 6;
  doc.line(56, y, W - 56, y);
  y += 18;

  const row = (label: string, amount: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(label, 56, y);
    doc.text(fmtMoney(amount), W - 56, y, { align: "right" });
    y += 18;
  };

  row("Base salary", p.baseSalary);
  row("Overtime", p.overtimeAmount);
  row("Gross", p.grossSalary, true);
  y += 6;
  doc.line(56, y, W - 56, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Deductions", 56, y);
  y += 18;
  row("Total deductions", -p.deductions);
  y += 6;
  doc.line(56, y, W - 56, y);
  y += 22;

  // Net pay
  doc.setFillColor(245, 247, 250);
  doc.rect(56, y - 16, W - 112, 36, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("Net Pay", 70, y + 6);
  doc.text(fmtMoney(p.netPay), W - 70, y + 6, { align: "right" });
  y += 50;

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Generated ${format(new Date(), "MMM d, yyyy 'at' h:mm a")} — This is a system-generated payslip.`,
    W / 2,
    doc.internal.pageSize.getHeight() - 32,
    { align: "center" },
  );

  const safeMonth = p.month.replace(/[^A-Za-z0-9-]+/g, "_");
  doc.save(`payslip-${e.lastName}-${safeMonth}.pdf`);
}
