/**
 * Loan management (admin/manager view).
 *
 * Shows pending and processed loan requests, lets admins:
 *  - approve/reject the admin stage (final stage)
 *  - copy shareable Dept Head and Management approval links (token-based)
 *  - set the start month (YYYY-MM) and number of installments — once a loan is
 *    fully approved & has a start month, the DB trigger generates the
 *    repayment schedule automatically
 *  - edit individual installment amounts (admin override of the equal split)
 *  - mark installments as paid manually (or rely on payroll calculator to fold
 *    them in automatically)
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Wallet, Copy, CheckCircle2, XCircle, Clock, Users, Building2, Shield, Loader2, Plus, Edit, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

const sb: any = supabase;

interface Loan {
  id: string;
  companyId: string;
  employeeId: string;
  amount: number;
  currency: string;
  recoveryMonths: number;
  reason: string | null;
  startMonth: string | null;
  status: string;
  deptApprovalStatus: string;
  mgmtApprovalStatus: string;
  adminApprovalStatus: string;
  createdAt: string;
  rejectionReason: string | null;
}

interface Repayment {
  id: string;
  loanId: string;
  employeeId: string;
  installmentNumber: number;
  month: string;
  amount: number;
  status: "scheduled" | "paid" | "skipped";
  paidAt: string | null;
  notes: string | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  email: string;
  departmentId: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    approved: { cls: "bg-green-500/10 text-green-600", label: "Approved" },
    rejected: { cls: "bg-red-500/10 text-red-600", label: "Rejected" },
    pending: { cls: "bg-yellow-500/10 text-yellow-600", label: "Pending" },
    dept_approved: { cls: "bg-blue-500/10 text-blue-600", label: "Dept Approved" },
    mgmt_approved: { cls: "bg-purple-500/10 text-purple-600", label: "Mgmt Approved" },
    completed: { cls: "bg-emerald-500/10 text-emerald-600", label: "Completed" },
    cancelled: { cls: "bg-muted text-muted-foreground", label: "Cancelled" },
    paid: { cls: "bg-green-500/10 text-green-600", label: "Paid" },
    scheduled: { cls: "bg-blue-500/10 text-blue-600", label: "Scheduled" },
    skipped: { cls: "bg-muted text-muted-foreground", label: "Skipped" },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return <Badge className={m.cls}>{m.label}</Badge>;
}

function ApprovalLinks({ loan }: { loan: Loan }) {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<{ dept_token?: string; mgmt_token?: string } | null>(null);

  const baseUrl = window.location.origin;
  const deptLink = tokens?.dept_token ? `${baseUrl}/approve/loan/dept/${loan.id}?token=${tokens.dept_token}` : null;
  const mgmtLink = tokens?.mgmt_token ? `${baseUrl}/approve/loan/mgmt/${loan.id}?token=${tokens.mgmt_token}` : null;

  const loadTokens = async () => {
    if (tokens) return;
    const { data, error } = await sb.rpc("get_loan_tokens", { _loan_id: loan.id });
    if (!error && Array.isArray(data) && data.length > 0) setTokens(data[0]);
    else if (error) toast({ title: "Failed to load tokens", description: error.message, variant: "destructive" });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} link copied` });
  };

  if (loan.status === "approved" || loan.status === "rejected" || loan.status === "completed" || loan.status === "cancelled") return null;

  return (
    <div className="bg-muted/40 p-3 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Shareable approval links</p>
        {!tokens && (
          <Button size="sm" variant="outline" onClick={loadTokens}>Load links</Button>
        )}
      </div>
      {tokens && (
        <>
          {loan.deptApprovalStatus === "pending" && deptLink && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-1 truncate">Dept Head: {deptLink}</span>
              <Button size="icon" variant="ghost" onClick={() => copy(deptLink, "Department")}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
          {loan.deptApprovalStatus === "approved" && loan.mgmtApprovalStatus === "pending" && mgmtLink && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-1 truncate">Management: {mgmtLink}</span>
              <Button size="icon" variant="ghost" onClick={() => copy(mgmtLink, "Management")}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RepaymentSchedule({ loan, repayments, refresh }: { loan: Loan; repayments: Repayment[]; refresh: () => void }) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const saveAmount = async (id: string) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { error } = await sb.from("loan_repayments").update({ amount: amt }).eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setEditingId(null);
    refresh();
    toast({ title: "Installment updated" });
  };

  const togglePaid = async (r: Repayment) => {
    const newStatus = r.status === "paid" ? "scheduled" : "paid";
    const { error } = await sb.from("loan_repayments").update({
      status: newStatus,
      paidAt: newStatus === "paid" ? new Date().toISOString() : null,
    }).eq("id", r.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    refresh();
  };

  if (repayments.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No repayment schedule yet. Approve the loan and set a start month to generate.</p>;
  }

  const totalPaid = repayments.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalScheduled = repayments.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <span>Paid: <span className="font-medium text-foreground">{totalPaid.toFixed(2)} {loan.currency}</span></span>
        <span>Total: <span className="font-medium text-foreground">{totalScheduled.toFixed(2)} {loan.currency}</span></span>
        <span>Remaining: <span className="font-medium text-foreground">{(totalScheduled - totalPaid).toFixed(2)} {loan.currency}</span></span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Month</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {repayments.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.installmentNumber}</TableCell>
              <TableCell>{r.month}</TableCell>
              <TableCell>
                {editingId === r.id ? (
                  <div className="flex items-center gap-1">
                    <Input className="h-7 w-24" type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                    <Button size="sm" onClick={() => saveAmount(r.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <span className="font-mono">{Number(r.amount).toFixed(2)} {loan.currency}</span>
                )}
              </TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {editingId !== r.id && r.status !== "paid" && (
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(r.id); setEditAmount(String(r.amount)); }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant={r.status === "paid" ? "outline" : "default"} onClick={() => togglePaid(r)}>
                    {r.status === "paid" ? "Unmark" : "Mark Paid"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LoanCard({ loan, employee, repayments, refresh }: {
  loan: Loan;
  employee: Employee | undefined;
  repayments: Repayment[];
  refresh: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [startMonth, setStartMonth] = useState(loan.startMonth ?? new Date().toISOString().slice(0, 7));
  const [recoveryMonths, setRecoveryMonths] = useState(loan.recoveryMonths);

  const adminApprove = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const updates: any = { adminApprovalStatus: action === "approve" ? "approved" : "rejected" };
      if (action === "reject") updates.status = "rejected";
      else {
        if (loan.deptApprovalStatus === "approved" && loan.mgmtApprovalStatus === "approved") {
          updates.status = "approved";
          updates.startMonth = startMonth;
          updates.recoveryMonths = recoveryMonths;
          updates.approvedAt = new Date().toISOString();
        }
      }
      const { error } = await sb.from("loans").update(updates).eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Loan updated" }); refresh(); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateSchedule = useMutation({
    mutationFn: async () => {
      const updates: any = { startMonth, recoveryMonths };
      const { error } = await sb.from("loans").update(updates).eq("id", loan.id);
      if (error) throw error;
      const { error: e2 } = await sb.rpc("generate_loan_schedule", { _loan_id: loan.id });
      if (e2) throw e2;
    },
    onSuccess: () => { toast({ title: "Schedule updated" }); refresh(); setOpen(false); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const cancelLoan = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("loans").update({ status: "cancelled" }).eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Loan cancelled" }); refresh(); },
  });

  const isFinalApproved = loan.status === "approved";
  const canAdminApprove = loan.deptApprovalStatus === "approved" && loan.mgmtApprovalStatus === "approved" &&
    loan.adminApprovalStatus === "pending" && loan.status !== "rejected";

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  const totalPaid = repayments.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const totalScheduled = repayments.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Wallet className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {employeeName}
                {employee?.jobTitle && <span className="text-muted-foreground font-normal text-sm"> · {employee.jobTitle}</span>}
              </p>
              <p className="text-lg font-bold">{Number(loan.amount).toLocaleString()} {loan.currency}
                <span className="text-xs text-muted-foreground font-normal"> · {loan.recoveryMonths} mo · {format(parseISO(loan.createdAt), "MMM d, yyyy")}</span>
              </p>
            </div>
          </div>
          <StatusBadge status={loan.status} />
        </div>

        <div className="flex flex-wrap gap-3 text-xs items-center">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />Dept: <StatusBadge status={loan.deptApprovalStatus} /></span>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />Mgmt: <StatusBadge status={loan.mgmtApprovalStatus} /></span>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Admin: <StatusBadge status={loan.adminApprovalStatus} /></span>
        </div>

        <ApprovalLinks loan={loan} />

        {canAdminApprove && (
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium">Final admin approval</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start month</Label>
                <Input className="h-8" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Recovery months</Label>
                <Input className="h-8" type="number" min={1} max={120} value={recoveryMonths} onChange={(e) => setRecoveryMonths(parseInt(e.target.value || "1"))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => adminApprove.mutate("approve")} disabled={adminApprove.isPending || !startMonth}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Approve Loan
              </Button>
              <Button size="sm" variant="destructive" onClick={() => adminApprove.mutate("reject")} disabled={adminApprove.isPending}>
                <XCircle className="h-4 w-4 mr-1" />Reject
              </Button>
            </div>
          </div>
        )}

        {isFinalApproved && (
          <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen} className="border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 -ml-2 h-auto py-1">
                  {scheduleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-medium">Repayment schedule</span>
                  <span className="text-xs text-muted-foreground ml-auto truncate">
                    Paid {totalPaid.toFixed(2)} / {totalScheduled.toFixed(2)} {loan.currency} · start {loan.startMonth}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Edit className="h-3 w-3 mr-1" />Adjust</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adjust repayment schedule</DialogTitle>
                    <DialogDescription>Changing these will regenerate any unpaid installments. Paid installments are preserved.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Start month</Label>
                      <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Recovery months</Label>
                      <Input type="number" min={1} max={120} value={recoveryMonths} onChange={(e) => setRecoveryMonths(parseInt(e.target.value || "1"))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => updateSchedule.mutate()} disabled={updateSchedule.isPending}>
                      {updateSchedule.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save & regenerate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CollapsibleContent className="pt-3">
              <RepaymentSchedule loan={loan} repayments={repayments} refresh={refresh} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {(loan.status === "pending" || loan.status === "dept_approved" || loan.status === "mgmt_approved") && (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => cancelLoan.mutate()}>Cancel request</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoansPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: loans, refetch: refetchLoans, isLoading } = useQuery<Loan[]>({
    queryKey: ["loans-admin"],
    queryFn: async () => {
      const { data, error } = await sb.from("loans").select("*").order("createdAt", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Loan[];
    },
  });

  const { data: repayments, refetch: refetchRepayments } = useQuery<Repayment[]>({
    queryKey: ["loan-repayments-admin"],
    queryFn: async () => {
      const { data, error } = await sb.from("loan_repayments").select("*").order("installmentNumber");
      if (error) throw error;
      return (data ?? []) as Repayment[];
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["loans-employees"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("employees")
        .select("id, firstName, lastName, jobTitle, email, departmentId, companyId")
        .eq("employmentStatus", "active")
        .order("firstName");
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
  });

  const refresh = () => { refetchLoans(); refetchRepayments(); };

  const empMap = useMemo(() => {
    const m: Record<string, Employee> = {};
    (employees ?? []).forEach((e) => { m[e.id] = e; });
    return m;
  }, [employees]);

  const repaymentsByLoan = useMemo(() => {
    const m: Record<string, Repayment[]> = {};
    (repayments ?? []).forEach((r) => {
      if (!m[r.loanId]) m[r.loanId] = [];
      m[r.loanId].push(r);
    });
    Object.values(m).forEach(list => list.sort((a, b) => a.installmentNumber - b.installmentNumber));
    return m;
  }, [repayments]);

  const pending = (loans ?? []).filter(l => l.status === "pending" || l.status === "dept_approved" || l.status === "mgmt_approved");
  const active = (loans ?? []).filter(l => l.status === "approved");
  const closed = (loans ?? []).filter(l => l.status === "rejected" || l.status === "cancelled" || l.status === "completed");

  const totals = useMemo(() => {
    const reps = repayments ?? [];
    const outstanding = reps.filter(r => r.status === "scheduled").reduce((s, r) => s + Number(r.amount), 0);
    const paid = reps.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
    return { outstanding, paid, count: active.length };
  }, [repayments, active.length]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" />Loan Management</h1>
          <p className="text-sm text-muted-foreground">Review loan requests, manage approval flow, and track repayments.</p>
        </div>
        <CreateLoanDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          employees={employees ?? []}
          onCreated={refresh}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active loans</p>
            <p className="text-2xl font-bold">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold">{totals.outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total repaid</p>
            <p className="text-2xl font-bold">{totals.paid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p>
            : pending.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No pending loan requests.</p>
            : pending.map(l => <LoanCard key={l.id} loan={l} employee={empMap[l.employeeId]} repayments={repaymentsByLoan[l.id] ?? []} refresh={refresh} />)}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 mt-4">
          {active.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No active loans.</p>
            : active.map(l => <LoanCard key={l.id} loan={l} employee={empMap[l.employeeId]} repayments={repaymentsByLoan[l.id] ?? []} refresh={refresh} />)}
        </TabsContent>

        <TabsContent value="closed" className="space-y-3 mt-4">
          {closed.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No closed loans.</p>
            : closed.map(l => <LoanCard key={l.id} loan={l} employee={empMap[l.employeeId]} repayments={repaymentsByLoan[l.id] ?? []} refresh={refresh} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateLoanDialog({ open, onOpenChange, employees, onCreated }: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  employees: Employee[];
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [recoveryMonths, setRecoveryMonths] = useState("12");
  const [reason, setReason] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Select an employee");
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");
      const months = parseInt(recoveryMonths);
      if (isNaN(months) || months < 1) throw new Error("Invalid months");

      const emp = employees.find(e => e.id === employeeId);
      if (!emp) throw new Error("Employee not found");
      const { data: e2 } = await sb.from("employees").select("companyId").eq("id", employeeId).maybeSingle();
      const companyId = (e2 as any)?.companyId;
      if (!companyId) throw new Error("Missing company");

      const { error } = await sb.from("loans").insert({
        companyId, employeeId, amount: amt, recoveryMonths: months, reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Loan request created" });
      setEmployeeId(""); setAmount(""); setRecoveryMonths("12"); setReason("");
      onOpenChange(false);
      onCreated();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" />New loan request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New loan request</DialogTitle>
          <DialogDescription>Create a loan request on behalf of an employee.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employee</Label>
            <select className="w-full h-9 border rounded-md px-2 text-sm bg-background" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.jobTitle}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Recovery months</Label>
              <Input type="number" min="1" max="120" value={recoveryMonths} onChange={(e) => setRecoveryMonths(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
