import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";

export interface AppraisalEmployee {
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  email?: string | null;
}

// Legacy lightweight review (still used by /performance page)
export interface AppraisalReview {
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewDate?: string | null;
  productivityRating?: number | null;
  qualityRating?: number | null;
  teamworkRating?: number | null;
  communicationRating?: number | null;
  overallRating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  goals?: string | null;
  comments?: string | null;
  status: string;
}

// Full 12-section appraisal form (ported from PHP HRMPro)
export interface AppraisalForm {
  periodStart?: string | null;
  periodEnd?: string | null;
  reviewerName?: string | null;
  status?: string | null;
  keyDuties?: string | null;
  assignedGoals?: Array<{ goal?: string; kpi?: string; weightage?: string }> | null;
  perfQuality?: number | null;
  perfProductivity?: number | null;
  perfTechnical?: number | null;
  perfCommunication?: number | null;
  perfTeamwork?: number | null;
  perfProblemSolving?: number | null;
  perfTimeManagement?: number | null;
  perfAttendance?: number | null;
  perfSafety?: number | null;
  perfComments?: string | null;
  goalAchievements?: Array<{ goal?: string; status?: string; comments?: string }> | null;
  compLeadership?: number | null;
  compDecisionMaking?: number | null;
  compInitiative?: number | null;
  compAdaptability?: number | null;
  compAccountability?: number | null;
  compComments?: string | null;
  keyStrengths?: string | null;
  areasForImprovement?: string | null;
  skillsGaps?: string | null;
  recommendedTraining?: string | null;
  careerDevelopment?: string | null;
  selfEvaluation?: string | null;
  selfAchievements?: string | null;
  selfChallenges?: string | null;
  managerSummary?: string | null;
  managerObservations?: string | null;
  managerRecommendations?: string | null;
  overallRating?: string | null;
  overallScore?: number | null;
  futureGoals?: string | null;
  actionSteps?: string | null;
  actionTimeline?: string | null;
  employeeSigned?: boolean | null;
  managerSigned?: boolean | null;
  hrApproved?: boolean | null;
  signedDate?: string | null;
  promotionRecommendation?: string | null;
  salaryIncrementRec?: string | null;
  disciplinaryNotes?: string | null;
}

// ── Legacy lightweight PDF (used by /performance) ───────────────────────────
export function downloadAppraisalPdf(
  r: AppraisalReview,
  e: AppraisalEmployee,
  companyName = "Company",
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, 56, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Performance Appraisal", W - 56, y, { align: "right" });
  y += 24;
  doc.setDrawColor(200);
  doc.line(56, y, W - 56, y);
  y += 24;

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Employee", 56, y);
  doc.text("Review Period", W / 2, y);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${e.firstName} ${e.lastName}`, 56, y + 14);
  doc.text(
    `${format(parseISO(r.reviewPeriodStart), "MMM d, yyyy")} – ${format(parseISO(r.reviewPeriodEnd), "MMM d, yyyy")}`,
    W / 2,
    y + 14,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (e.jobTitle) doc.text(e.jobTitle, 56, y + 28);
  doc.text(`Status: ${r.status}`, W / 2, y + 28);
  if (e.email) doc.text(e.email, 56, y + 42);
  if (r.reviewDate) {
    doc.text(`Reviewed: ${format(parseISO(r.reviewDate), "MMM d, yyyy")}`, W / 2, y + 42);
  }
  y += 70;
  doc.setDrawColor(220);
  doc.line(56, y, W - 56, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text("Ratings", 56, y);
  doc.text("Score / 5", W - 56, y, { align: "right" });
  y += 6;
  doc.line(56, y, W - 56, y);
  y += 18;

  const rateRow = (label: string, val?: number | null, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(label, 56, y);
    const score = val == null ? "—" : `${val} / 5`;
    doc.text(score, W - 56, y, { align: "right" });
    y += 18;
  };
  rateRow("Productivity", r.productivityRating);
  rateRow("Quality of Work", r.qualityRating);
  rateRow("Teamwork", r.teamworkRating);
  rateRow("Communication", r.communicationRating);
  y += 4;
  doc.line(56, y, W - 56, y);
  y += 18;
  rateRow("Overall Rating", r.overallRating, true);
  y += 8;

  const section = (title: string, body?: string | null) => {
    if (!body) return;
    if (y > H - 120) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(title, 56, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(body, W - 112);
    lines.forEach((ln: string) => {
      if (y > H - 80) { doc.addPage(); y = 56; }
      doc.text(ln, 56, y);
      y += 14;
    });
    y += 8;
  };
  section("Strengths", r.strengths);
  section("Areas for Improvement", r.improvements);
  section("Goals & Development Plan", r.goals);
  section("Additional Comments", r.comments);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Generated ${format(new Date(), "MMM d, yyyy 'at' h:mm a")} — Performance Appraisal`,
    W / 2,
    H - 32,
    { align: "center" },
  );
  const safe = `${e.lastName}-${format(parseISO(r.reviewPeriodEnd), "yyyy-MM")}`.replace(
    /[^A-Za-z0-9-]+/g,
    "_",
  );
  doc.save(`appraisal-${safe}.pdf`);
}

// ── Full 12-section PDF ─────────────────────────────────────────────────────
const PERF_LABELS: Array<[keyof AppraisalForm, string]> = [
  ["perfQuality", "Quality of Work"],
  ["perfProductivity", "Productivity & Output"],
  ["perfTechnical", "Technical Knowledge / Job Skills"],
  ["perfCommunication", "Communication Skills"],
  ["perfTeamwork", "Teamwork & Collaboration"],
  ["perfProblemSolving", "Problem Solving"],
  ["perfTimeManagement", "Time Management"],
  ["perfAttendance", "Attendance & Punctuality"],
  ["perfSafety", "Safety & Compliance"],
];
const COMP_LABELS: Array<[keyof AppraisalForm, string]> = [
  ["compLeadership", "Leadership"],
  ["compDecisionMaking", "Decision Making"],
  ["compInitiative", "Initiative"],
  ["compAdaptability", "Adaptability"],
  ["compAccountability", "Accountability"],
];

const ratingTxt = (n?: number | null) =>
  !n ? "—" : `${n}/5 ${["", "Unsatisfactory", "Needs Improvement", "Satisfactory", "Good", "Excellent"][n] || ""}`;

export function downloadFullAppraisalPdf(
  f: AppraisalForm,
  e: AppraisalEmployee,
  companyName = "Company",
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Cover header
  doc.setFillColor(124, 58, 237); // primary purple
  doc.rect(0, 0, W, 80, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, 40, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Performance Appraisal Report", 40, 58);

  let y = 110;
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${e.firstName} ${e.lastName}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  if (e.jobTitle) doc.text(e.jobTitle, 40, y + 14);
  if (f.periodStart && f.periodEnd) {
    doc.text(
      `Period: ${format(parseISO(f.periodStart), "MMM d, yyyy")} – ${format(parseISO(f.periodEnd), "MMM d, yyyy")}`,
      40,
      y + 28,
    );
  }
  if (f.reviewerName) doc.text(`Reviewer: ${f.reviewerName}`, 40, y + 42);
  if (f.status) doc.text(`Status: ${f.status}`, W - 40, y + 28, { align: "right" });

  let cursor = y + 60;

  const sectionHeader = (n: number, title: string) => {
    if (cursor > H - 100) { doc.addPage(); cursor = 50; }
    doc.setFillColor(237, 233, 254);
    doc.rect(40, cursor, W - 80, 22, "F");
    doc.setTextColor(124, 58, 237);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${n}. ${title}`, 48, cursor + 15);
    cursor += 32;
    doc.setTextColor(40);
  };

  const para = (label: string, body?: string | null) => {
    if (!body) return;
    if (cursor > H - 80) { doc.addPage(); cursor = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(label, 48, cursor);
    cursor += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(body, W - 96);
    lines.forEach((ln: string) => {
      if (cursor > H - 60) { doc.addPage(); cursor = 50; }
      doc.text(ln, 48, cursor);
      cursor += 13;
    });
    cursor += 6;
  };

  const ratingTable = (rows: Array<[keyof AppraisalForm, string]>) => {
    autoTable(doc, {
      startY: cursor,
      margin: { left: 48, right: 48 },
      head: [["Criterion", "Rating"]],
      body: rows.map(([k, label]) => [label, ratingTxt(f[k] as number | null | undefined)]),
      theme: "grid",
      headStyles: { fillColor: [243, 244, 246], textColor: [40, 40, 40], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { cellWidth: 140 } },
    });
    cursor = (doc as any).lastAutoTable.finalY + 12;
  };

  // S2 Job responsibilities
  sectionHeader(2, "Job Responsibilities & Objectives");
  para("Summary of Key Duties", f.keyDuties);
  if (f.assignedGoals?.length) {
    autoTable(doc, {
      startY: cursor,
      margin: { left: 48, right: 48 },
      head: [["Goal / Objective", "KPI / Metric", "Weightage"]],
      body: f.assignedGoals.map((g) => [g.goal || "", g.kpi || "", g.weightage || ""]),
      theme: "striped",
      headStyles: { fillColor: [243, 244, 246], textColor: [40, 40, 40], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });
    cursor = (doc as any).lastAutoTable.finalY + 12;
  }

  // S3 Performance evaluation
  sectionHeader(3, "Performance Evaluation");
  ratingTable(PERF_LABELS);
  para("Performance Comments", f.perfComments);

  // S4 Goal achievement
  if (f.goalAchievements?.length) {
    sectionHeader(4, "Goal Achievement Review");
    autoTable(doc, {
      startY: cursor,
      margin: { left: 48, right: 48 },
      head: [["Goal", "Status", "Comments"]],
      body: f.goalAchievements.map((g) => [
        g.goal || "",
        g.status === "achieved" ? "Achieved" : g.status === "partial" ? "Partial" : g.status === "not_achieved" ? "Not Achieved" : "—",
        g.comments || "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [243, 244, 246], textColor: [40, 40, 40], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });
    cursor = (doc as any).lastAutoTable.finalY + 12;
  }

  // S5 Competency
  sectionHeader(5, "Competency Assessment");
  ratingTable(COMP_LABELS);
  para("Competency Comments", f.compComments);

  // S6 Strengths & areas
  sectionHeader(6, "Strengths & Areas for Improvement");
  para("Key Strengths", f.keyStrengths);
  para("Areas for Improvement", f.areasForImprovement);

  // S7 Training
  sectionHeader(7, "Training & Development");
  para("Skills Gaps", f.skillsGaps);
  para("Recommended Training", f.recommendedTraining);
  para("Career Development", f.careerDevelopment);

  // S8 Self
  sectionHeader(8, "Employee Self-Evaluation");
  para("Self Evaluation", f.selfEvaluation);
  para("Achievements", f.selfAchievements);
  para("Challenges", f.selfChallenges);

  // S9 Manager
  sectionHeader(9, "Manager Feedback");
  para("Summary", f.managerSummary);
  para("Observations", f.managerObservations);
  para("Recommendations", f.managerRecommendations);

  // S10 Overall
  sectionHeader(10, "Overall Rating");
  if (f.overallRating || f.overallScore != null) {
    autoTable(doc, {
      startY: cursor,
      margin: { left: 48, right: 48 },
      body: [
        ["Overall Rating", f.overallRating || "—"],
        ["Overall Score", f.overallScore != null ? `${f.overallScore} / 5` : "—"],
      ],
      theme: "plain",
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 140 } },
    });
    cursor = (doc as any).lastAutoTable.finalY + 12;
  }

  // S11 Future
  sectionHeader(11, "Future Goals & Action Plan");
  para("Future Goals", f.futureGoals);
  para("Action Steps", f.actionSteps);
  para("Timeline", f.actionTimeline);

  // S12 Sign-off
  sectionHeader(12, "Sign-off");
  autoTable(doc, {
    startY: cursor,
    margin: { left: 48, right: 48 },
    body: [
      ["Employee Signed", f.employeeSigned ? "✓ Yes" : "Pending"],
      ["Manager Signed", f.managerSigned ? "✓ Yes" : "Pending"],
      ["HR Approved", f.hrApproved ? "✓ Yes" : "Pending"],
      ["Signed Date", f.signedDate ? format(parseISO(f.signedDate), "MMM d, yyyy") : "—"],
    ],
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 140 } },
  });
  cursor = (doc as any).lastAutoTable.finalY + 16;

  if (f.promotionRecommendation || f.salaryIncrementRec || f.disciplinaryNotes) {
    sectionHeader(13, "Additional Notes");
    para("Promotion Recommendation", f.promotionRecommendation);
    para("Salary Increment", f.salaryIncrementRec);
    para("Disciplinary Notes", f.disciplinaryNotes);
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Generated ${format(new Date(), "MMM d, yyyy 'at' h:mm a")} • Page ${p} of ${pageCount}`,
      W / 2,
      H - 24,
      { align: "center" },
    );
  }

  const safe = `${e.lastName}-${e.firstName}-appraisal`.replace(/[^A-Za-z0-9-]+/g, "_");
  doc.save(`${safe}.pdf`);
}
