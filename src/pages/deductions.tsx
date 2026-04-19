import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Plus, MinusCircle, Home, Utensils, Wrench, Banknote, Shirt, Package, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

type DeductionType = "accommodation_damage" | "wrong_order" | "equipment_loss" | "cash_shortage" | "uniform_damage" | "other";
type Status = "pending" | "approved" | "deducted" | "waived";

interface Deduction {
  id: string;
  companyId: string;
  employeeId: string;
  deductionType: DeductionType;
  amount: number;
  currency: string;
  incidentDate: string;
  description: string;
  evidenceUrl: string | null;
  evidenceName: string | null;
  status: Status;
  applyToPayrollMonth: string | null;
  reportedByName: string | null;
  notes: string | null;
}

interface EmployeeLite {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

const TYPE_LABELS: { [k in DeductionType]: string } = {
  accommodation_damage: "Accommodation Damage",
  wrong_order: "Wrong Order",
  equipment_loss: "Equipment Loss",
  cash_shortage: "Cash Shortage",
  uniform_damage: "Uniform Damage",
  other: "Other",
};

const typeIcon = (t: DeductionType) => {
  if (t === "accommodation_damage") return <Home className="h-4 w-4" />;
  if (t === "wrong_order") return <Utensils className="h-4 w-4" />;
  if (t === "equipment_loss") return <Wrench className="h-4 w-4" />;
  if (t === "cash_shortage") return <Banknote className="h-4 w-4" />;
  if (t === "uniform_damage") return <Shirt className="h-4 w-4" />;
  return <Package className="h-4 w-4" />;
};

const statusVariant = (s: Status): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "deducted") return "destructive";
  if (s === "approved") return "default";
  if (s === "waived") return "outline";
  return "secondary";
};

export default function DeductionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useCompanySettings();
  const companyId = user?.companyId ?? null;
  const companyCurrency = settings?.defaultCurrency || "USD";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Deduction[]>([]);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | DeductionType>("all");

  const initialForm = {
    employeeId: "",
    deductionType: "accommodation_damage" as DeductionType,
    amount: "",
    currency: companyCurrency,
    incidentDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    applyToPayrollMonth: format(new Date(), "yyyy-MM"),
    reportedByName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
    notes: "",
    file: null as File | null,
  };
  const [form, setForm] = useState(initialForm);

  // Keep form currency synced when settings load / change.
  useEffect(() => {
    setForm((f) => ({ ...f, currency: companyCurrency }));
  }, [companyCurrency]);

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: recs }, { data: emps }] = await Promise.all([
      supabase
        .from("deductions" as any)
        .select("*")
        .eq("companyId", companyId)
        .order("incidentDate", { ascending: false }),
      supabase
        .from("employees" as any)
        .select("id, firstName, lastName, jobTitle")
        .eq("companyId", companyId)
        .order("firstName"),
    ]);
    setItems((recs ?? []) as any);
    setEmployees((emps ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const totals = useMemo(() => {
    const t = { pending: 0, approved: 0, deducted: 0, waived: 0, totalAmount: 0 };
    for (const d of items) {
      t[d.status]++;
      if (d.status !== "waived") t.totalAmount += Number(d.amount || 0);
    }
    return t;
  }, [items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((d) => d.deductionType === filter)),
    [items, filter],
  );

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };

  const handleCreate = async () => {
    if (!companyId) return;
    const amt = parseFloat(form.amount);
    if (!form.employeeId || !form.description || isNaN(amt) || amt <= 0) {
      toast({ title: "Missing info", description: "Employee, amount, and description are required.", variant: "destructive" });
      return;
    }

    let evidenceUrl: string | null = null;
    let evidenceName: string | null = null;
    if (form.file) {
      const path = `${companyId}/${form.employeeId}/${Date.now()}-${form.file.name}`;
      const { error: upErr } = await supabase.storage.from("deduction-evidence").upload(path, form.file);
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      evidenceUrl = path;
      evidenceName = form.file.name;
    }

    const { error } = await supabase.from("deductions" as any).insert({
      companyId,
      employeeId: form.employeeId,
      deductionType: form.deductionType,
      amount: amt,
      currency: form.currency,
      incidentDate: form.incidentDate,
      description: form.description,
      applyToPayrollMonth: form.applyToPayrollMonth || null,
      reportedBy: user?.id ?? null,
      reportedByName: form.reportedByName || null,
      evidenceUrl,
      evidenceName,
      notes: form.notes || null,
    } as any);

    if (error) {
      toast({ title: "Failed to create deduction", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deduction recorded" });
    setOpen(false);
    setForm(initialForm);
    loadAll();
  };

  const updateStatus = async (id: string, status: Status) => {
    const patch: any = { status };
    if (status === "approved") patch.approvedAt = new Date().toISOString();
    const { error } = await supabase.from("deductions" as any).update(patch).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    loadAll();
  };

  const downloadEvidence = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("deduction-evidence").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this deduction?")) return;
    const { error } = await supabase.from("deductions" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    loadAll();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deductions</h1>
          <p className="text-muted-foreground">Record salary deductions for accommodation damage, wrong orders, and other incidents.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Deduction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Deduction</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.jobTitle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Deduction type</Label>
                <Select value={form.deductionType} onValueChange={(v) => setForm({ ...form, deductionType: v as DeductionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} readOnly disabled className="bg-muted" />
              </div>
              <div>
                <Label>Incident date</Label>
                <Input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
              </div>
              <div>
                <Label>Apply to payroll (YYYY-MM)</Label>
                <Input type="month" value={form.applyToPayrollMonth} onChange={(e) => setForm({ ...form, applyToPayrollMonth: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What happened?" />
              </div>
              <div className="col-span-2">
                <Label>Reported by</Label>
                <Input value={form.reportedByName} onChange={(e) => setForm({ ...form, reportedByName: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Evidence (photo/receipt)</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
              </div>
              <div className="col-span-2">
                <Label>Internal notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Save Deduction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.approved}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Deducted</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.deducted}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MinusCircle className="h-4 w-4" />Total amount</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.totalAmount.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Records</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No deductions recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>Payroll</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{empName(d.employeeId)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {typeIcon(d.deductionType)}
                        {TYPE_LABELS[d.deductionType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{d.currency} {Number(d.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{format(new Date(d.incidentDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-sm">{d.applyToPayrollMonth ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v as Status)}>
                        <SelectTrigger className="h-8 w-[130px]">
                          <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="deducted">Deducted</SelectItem>
                          <SelectItem value="waived">Waived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {d.evidenceUrl ? (
                        <Button size="sm" variant="ghost" onClick={() => downloadEvidence(d.evidenceUrl!, d.evidenceName ?? "evidence")}>
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
