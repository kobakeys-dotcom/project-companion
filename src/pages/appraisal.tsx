/**
 * Comprehensive 12-section performance appraisal — ported from PHP HRMPro.
 * Sections: Employee Info, Job Responsibilities, Performance Evaluation (9 ratings),
 * Goal Achievement, Competency Assessment (5 ratings), Strengths & Improvements,
 * Training, Self-Evaluation, Manager Feedback, Overall Rating, Future Goals, Sign-off.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Star, Plus, FileDown, Pencil, Trash2, ClipboardCheck, Loader2,
} from "lucide-react";
import { downloadFullAppraisalPdf, type AppraisalForm } from "@/lib/appraisal-pdf";
import { format } from "date-fns";

const sb: any = supabase;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  email?: string | null;
}

interface Form extends AppraisalForm {
  id: string;
  companyId: string;
  employeeId: string;
}

const PERF_CRITERIA: Array<[keyof AppraisalForm, string]> = [
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

const COMP_CRITERIA: Array<[keyof AppraisalForm, string]> = [
  ["compLeadership", "Leadership"],
  ["compDecisionMaking", "Decision Making"],
  ["compInitiative", "Initiative"],
  ["compAdaptability", "Adaptability"],
  ["compAccountability", "Accountability"],
];

const RATING_LABEL = ["", "Unsatisfactory", "Needs Improvement", "Satisfactory", "Good", "Excellent"];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  manager_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
};

function StarRow({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className="p-0.5"
          aria-label={`${n} stars`}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              value && n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground min-w-32">
        {value ? `${value}/5 · ${RATING_LABEL[value]}` : "Not rated"}
      </span>
    </div>
  );
}

const blankForm = (employeeId = ""): Partial<Form> => ({
  employeeId,
  status: "draft",
  periodStart: "",
  periodEnd: "",
  assignedGoals: [],
  goalAchievements: [],
});

export default function AppraisalPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<Partial<Form> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["appraisal-employees"],
    queryFn: async () => {
      const { data } = await sb
        .from("employees")
        .select("id,firstName,lastName,jobTitle,email")
        .order("firstName");
      return data ?? [];
    },
  });

  const empMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );

  const { data: forms = [], isLoading } = useQuery<Form[]>({
    queryKey: ["appraisal_forms", user?.companyId],
    enabled: !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("appraisal_forms")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async (f: Partial<Form>) => {
      if (!f.employeeId) throw new Error("Pick an employee");
      const payload: any = { ...f, companyId: user!.companyId };
      delete payload.id;
      // empty date strings → null
      ["periodStart", "periodEnd", "signedDate"].forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      // numeric coercion
      ["overallScore"].forEach((k) => {
        if (payload[k] === "" || payload[k] == null) payload[k] = null;
        else payload[k] = Number(payload[k]);
      });
      if (f.id) {
        const { error } = await sb.from("appraisal_forms").update(payload).eq("id", f.id);
        if (error) throw error;
        return f.id;
      }
      const { data, error } = await sb
        .from("appraisal_forms")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast({ title: "Appraisal saved" });
      qc.invalidateQueries({ queryKey: ["appraisal_forms"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("appraisal_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Appraisal deleted" });
      qc.invalidateQueries({ queryKey: ["appraisal_forms"] });
    },
  });

  const startNew = () => {
    setEditing(blankForm());
    setOpen(true);
  };
  const startEdit = (f: Form) => {
    setEditing({ ...f, assignedGoals: f.assignedGoals ?? [], goalAchievements: f.goalAchievements ?? [] });
    setOpen(true);
  };

  const exportPdf = (f: Form) => {
    const e = empMap.get(f.employeeId);
    if (!e) return;
    downloadFullAppraisalPdf(f, e);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" />
            Performance Appraisals
          </h1>
          <p className="text-muted-foreground">
            Comprehensive 12-section appraisal forms with ratings, goal tracking and PDF export.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" /> New appraisal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All appraisals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : forms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No appraisal forms yet. Click "New appraisal" to start.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((f) => {
                  const e = empMap.get(f.employeeId);
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="font-medium">
                          {e ? `${e.firstName} ${e.lastName}` : "—"}
                        </div>
                        {e?.jobTitle && (
                          <div className="text-xs text-muted-foreground">{e.jobTitle}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.periodStart && f.periodEnd
                          ? `${format(new Date(f.periodStart), "MMM d, yyyy")} – ${format(new Date(f.periodEnd), "MMM d, yyyy")}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{f.reviewerName || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[f.status || "draft"]} variant="outline">
                          {f.status?.replace("_", " ") || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.overallScore != null ? `${f.overallScore}/5` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => exportPdf(f)}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove.mutate(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <AppraisalEditor
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
          form={editing}
          setForm={setEditing}
          employees={employees}
          onSave={() => save.mutate(editing)}
          saving={save.isPending}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AppraisalEditor({
  open, onOpenChange, form, setForm, employees, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: Partial<Form>;
  setForm: (f: Partial<Form>) => void;
  employees: Employee[];
  onSave: () => void;
  saving: boolean;
}) {
  const set = (k: keyof Form, v: any) => setForm({ ...form, [k]: v });

  const updateGoal = (i: number, k: string, v: string) => {
    const arr = [...(form.assignedGoals || [])];
    arr[i] = { ...arr[i], [k]: v };
    set("assignedGoals", arr);
  };
  const addGoal = () => set("assignedGoals", [...(form.assignedGoals || []), { goal: "", kpi: "", weightage: "" }]);
  const rmGoal = (i: number) => set("assignedGoals", (form.assignedGoals || []).filter((_, idx) => idx !== i));

  const updateAch = (i: number, k: string, v: string) => {
    const arr = [...(form.goalAchievements || [])];
    arr[i] = { ...arr[i], [k]: v };
    set("goalAchievements", arr);
  };
  const addAch = () => set("goalAchievements", [...(form.goalAchievements || []), { goal: "", status: "", comments: "" }]);
  const rmAch = (i: number) => set("goalAchievements", (form.goalAchievements || []).filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit appraisal" : "New appraisal"}</DialogTitle>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={["s1"]} className="w-full">
          {/* S1 */}
          <AccordionItem value="s1">
            <AccordionTrigger>1. Employee Information</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Employee *</Label>
                  <Select value={form.employeeId || ""} onValueChange={(v) => set("employeeId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reviewer / Supervisor Name</Label>
                  <Input value={form.reviewerName || ""} onChange={(e) => set("reviewerName", e.target.value)} placeholder="Full name of reviewer" />
                </div>
                <div>
                  <Label>Period Start</Label>
                  <Input type="date" value={form.periodStart || ""} onChange={(e) => set("periodStart", e.target.value)} />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input type="date" value={form.periodEnd || ""} onChange={(e) => set("periodEnd", e.target.value)} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status || "draft"} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="manager_review">Manager review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S2 */}
          <AccordionItem value="s2">
            <AccordionTrigger>2. Job Responsibilities & Objectives</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>Summary of Key Duties</Label>
                <Textarea rows={3} value={form.keyDuties || ""} onChange={(e) => set("keyDuties", e.target.value)} placeholder="Describe the main responsibilities for this role..." />
              </div>
              <div className="space-y-2">
                <Label>Goals & KPIs Assigned</Label>
                {(form.assignedGoals || []).map((g, i) => (
                  <div key={i} className="grid grid-cols-[2fr_1fr_80px_auto] gap-2">
                    <Input value={g.goal || ""} onChange={(e) => updateGoal(i, "goal", e.target.value)} placeholder="Goal / Objective" />
                    <Input value={g.kpi || ""} onChange={(e) => updateGoal(i, "kpi", e.target.value)} placeholder="KPI / Metric" />
                    <Input value={g.weightage || ""} onChange={(e) => updateGoal(i, "weightage", e.target.value)} placeholder="Wt %" />
                    <Button variant="ghost" size="icon" onClick={() => rmGoal(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addGoal}><Plus className="h-3 w-3 mr-1" />Add goal</Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S3 */}
          <AccordionItem value="s3">
            <AccordionTrigger>3. Performance Evaluation</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">1=Unsatisfactory · 2=Needs Improvement · 3=Satisfactory · 4=Good · 5=Excellent</p>
              {PERF_CRITERIA.map(([k, label]) => (
                <div key={k} className="flex items-center justify-between border-b py-2">
                  <span className="text-sm">{label}</span>
                  <StarRow value={form[k] as number | null} onChange={(v) => set(k, v || null)} />
                </div>
              ))}
              <div>
                <Label>Performance Comments</Label>
                <Textarea rows={3} value={form.perfComments || ""} onChange={(e) => set("perfComments", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S4 */}
          <AccordionItem value="s4">
            <AccordionTrigger>4. Goal Achievement Review</AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              {(form.goalAchievements || []).map((g, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_2fr_auto] gap-2">
                  <Input value={g.goal || ""} onChange={(e) => updateAch(i, "goal", e.target.value)} placeholder="Goal description" />
                  <Select value={g.status || ""} onValueChange={(v) => updateAch(i, "status", v)}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achieved">✅ Achieved</SelectItem>
                      <SelectItem value="partial">⚡ Partial</SelectItem>
                      <SelectItem value="not_achieved">❌ Not achieved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={g.comments || ""} onChange={(e) => updateAch(i, "comments", e.target.value)} placeholder="Comments" />
                  <Button variant="ghost" size="icon" onClick={() => rmAch(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addAch}><Plus className="h-3 w-3 mr-1" />Add achievement</Button>
            </AccordionContent>
          </AccordionItem>

          {/* S5 */}
          <AccordionItem value="s5">
            <AccordionTrigger>5. Competency Assessment</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {COMP_CRITERIA.map(([k, label]) => (
                <div key={k} className="flex items-center justify-between border-b py-2">
                  <span className="text-sm">{label}</span>
                  <StarRow value={form[k] as number | null} onChange={(v) => set(k, v || null)} />
                </div>
              ))}
              <div>
                <Label>Competency Comments</Label>
                <Textarea rows={3} value={form.compComments || ""} onChange={(e) => set("compComments", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S6 */}
          <AccordionItem value="s6">
            <AccordionTrigger>6. Strengths & Areas for Improvement</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>Key Strengths Demonstrated</Label>
                <Textarea rows={3} value={form.keyStrengths || ""} onChange={(e) => set("keyStrengths", e.target.value)} />
              </div>
              <div>
                <Label>Areas Needing Improvement</Label>
                <Textarea rows={3} value={form.areasForImprovement || ""} onChange={(e) => set("areasForImprovement", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S7 */}
          <AccordionItem value="s7">
            <AccordionTrigger>7. Training & Development</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>Skills Gaps Identified</Label>
                <Textarea rows={2} value={form.skillsGaps || ""} onChange={(e) => set("skillsGaps", e.target.value)} />
              </div>
              <div>
                <Label>Recommended Training Programs</Label>
                <Textarea rows={2} value={form.recommendedTraining || ""} onChange={(e) => set("recommendedTraining", e.target.value)} />
              </div>
              <div>
                <Label>Career Development Suggestions</Label>
                <Textarea rows={2} value={form.careerDevelopment || ""} onChange={(e) => set("careerDevelopment", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S8 */}
          <AccordionItem value="s8">
            <AccordionTrigger>8. Employee Self-Evaluation</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>Self-Evaluation</Label>
                <Textarea rows={3} value={form.selfEvaluation || ""} onChange={(e) => set("selfEvaluation", e.target.value)} />
              </div>
              <div>
                <Label>Achievements to Highlight</Label>
                <Textarea rows={2} value={form.selfAchievements || ""} onChange={(e) => set("selfAchievements", e.target.value)} />
              </div>
              <div>
                <Label>Challenges Faced</Label>
                <Textarea rows={2} value={form.selfChallenges || ""} onChange={(e) => set("selfChallenges", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S9 */}
          <AccordionItem value="s9">
            <AccordionTrigger>9. Manager Feedback</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>Summary of Performance</Label>
                <Textarea rows={3} value={form.managerSummary || ""} onChange={(e) => set("managerSummary", e.target.value)} />
              </div>
              <div>
                <Label>Key Observations</Label>
                <Textarea rows={2} value={form.managerObservations || ""} onChange={(e) => set("managerObservations", e.target.value)} />
              </div>
              <div>
                <Label>Recommendations</Label>
                <Textarea rows={2} value={form.managerRecommendations || ""} onChange={(e) => set("managerRecommendations", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S10 */}
          <AccordionItem value="s10">
            <AccordionTrigger>10. Overall Rating</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Overall Rating</Label>
                  <Select value={form.overallRating || ""} onValueChange={(v) => set("overallRating", v)}>
                    <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Outstanding">Outstanding</SelectItem>
                      <SelectItem value="Exceeds Expectations">Exceeds Expectations</SelectItem>
                      <SelectItem value="Meets Expectations">Meets Expectations</SelectItem>
                      <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                      <SelectItem value="Unsatisfactory">Unsatisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Overall Score (0–5)</Label>
                  <Input type="number" step="0.1" min="0" max="5" value={form.overallScore ?? ""} onChange={(e) => set("overallScore", e.target.value === "" ? null : Number(e.target.value))} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S11 */}
          <AccordionItem value="s11">
            <AccordionTrigger>11. Future Goals & Action Plan</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>Goals for Next Appraisal Period</Label>
                <Textarea rows={3} value={form.futureGoals || ""} onChange={(e) => set("futureGoals", e.target.value)} />
              </div>
              <div>
                <Label>Action Steps</Label>
                <Textarea rows={2} value={form.actionSteps || ""} onChange={(e) => set("actionSteps", e.target.value)} />
              </div>
              <div>
                <Label>Timeline</Label>
                <Textarea rows={2} value={form.actionTimeline || ""} onChange={(e) => set("actionTimeline", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* S12 */}
          <AccordionItem value="s12">
            <AccordionTrigger>12. Sign-off</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.employeeSigned} onCheckedChange={(v) => set("employeeSigned", !!v)} />
                <Label className="cursor-pointer">Employee signed</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.managerSigned} onCheckedChange={(v) => set("managerSigned", !!v)} />
                <Label className="cursor-pointer">Manager signed</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.hrApproved} onCheckedChange={(v) => set("hrApproved", !!v)} />
                <Label className="cursor-pointer">HR approved</Label>
              </div>
              <div>
                <Label>Signed Date</Label>
                <Input type="date" value={form.signedDate || ""} onChange={(e) => set("signedDate", e.target.value)} />
              </div>
              <div className="border-t pt-3 space-y-3">
                <div>
                  <Label>Promotion Recommendation</Label>
                  <Input value={form.promotionRecommendation || ""} onChange={(e) => set("promotionRecommendation", e.target.value)} />
                </div>
                <div>
                  <Label>Salary Increment Recommendation</Label>
                  <Textarea rows={2} value={form.salaryIncrementRec || ""} onChange={(e) => set("salaryIncrementRec", e.target.value)} />
                </div>
                <div>
                  <Label>Disciplinary Notes</Label>
                  <Textarea rows={2} value={form.disciplinaryNotes || ""} onChange={(e) => set("disciplinaryNotes", e.target.value)} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save appraisal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
