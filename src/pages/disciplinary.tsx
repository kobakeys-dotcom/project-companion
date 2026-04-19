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
import { Plus, AlertTriangle, FileWarning, Ban, UserMinus, FileText, Trash2, Download, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

type ActionType =
  | "verbal_warning"
  | "warning_letter_1"
  | "warning_letter_2"
  | "warning_letter_3"
  | "suspension"
  | "termination"
  | "resignation";
type Status = "active" | "expired" | "revoked" | "acknowledged";

interface DiscRecord {
  id: string;
  companyId: string;
  employeeId: string;
  actionType: ActionType;
  incidentDate: string;
  issuedDate: string;
  reason: string;
  issuedByName: string | null;
  documentUrl: string | null;
  documentName: string | null;
  acknowledgedAt: string | null;
  status: Status;
  expiryDate: string | null;
  followUpAction: string | null;
  followUpDate: string | null;
  internalNotes: string | null;
  createdAt: string;
}

interface EmployeeLite {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

const ACTION_LABELS: { [k in ActionType]: string } = {
  verbal_warning: "Verbal Warning",
  warning_letter_1: "Warning Letter 1",
  warning_letter_2: "Warning Letter 2",
  warning_letter_3: "Warning Letter 3",
  suspension: "Suspension",
  termination: "Termination",
  resignation: "Resignation",
};

const actionVariant = (a: ActionType): "default" | "secondary" | "destructive" | "outline" => {
  if (a === "termination") return "destructive";
  if (a === "suspension" || a === "warning_letter_3") return "destructive";
  if (a === "warning_letter_2" || a === "warning_letter_1") return "default";
  if (a === "resignation") return "outline";
  return "secondary";
};

const statusVariant = (s: Status): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "active") return "destructive";
  if (s === "acknowledged") return "default";
  if (s === "expired") return "secondary";
  return "outline";
};

const actionIcon = (a: ActionType) => {
  if (a === "termination" || a === "resignation") return <UserMinus className="h-4 w-4" />;
  if (a === "suspension") return <Ban className="h-4 w-4" />;
  if (a.startsWith("warning_letter")) return <FileWarning className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
};

export default function DisciplinaryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const companyId = user?.companyId ?? null;

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DiscRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | ActionType>("all");

  const initialForm = {
    employeeId: "",
    actionType: "verbal_warning" as ActionType,
    incidentDate: format(new Date(), "yyyy-MM-dd"),
    issuedDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    issuedByName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
    expiryDate: "",
    followUpAction: "",
    followUpDate: "",
    internalNotes: "",
    file: null as File | null,
  };
  const [form, setForm] = useState(initialForm);

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: recs }, { data: emps }] = await Promise.all([
      supabase
        .from("disciplinary_records" as any)
        .select("*")
        .eq("companyId", companyId)
        .order("incidentDate", { ascending: false }),
      supabase
        .from("employees" as any)
        .select("id, firstName, lastName, jobTitle")
        .eq("companyId", companyId)
        .order("firstName"),
    ]);
    setRecords((recs ?? []) as any);
    setEmployees((emps ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const counts = useMemo(() => {
    const c = { active: 0, warnings: 0, terminations: 0, resignations: 0 };
    for (const r of records) {
      if (r.status === "active") c.active++;
      if (r.actionType.startsWith("warning") || r.actionType === "verbal_warning") c.warnings++;
      if (r.actionType === "termination") c.terminations++;
      if (r.actionType === "resignation") c.resignations++;
    }
    return c;
  }, [records]);

  const filtered = useMemo(
    () => (filter === "all" ? records : records.filter((r) => r.actionType === filter)),
    [records, filter],
  );

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };

  const handleCreate = async () => {
    if (!companyId) return;
    if (!form.employeeId || !form.reason) {
      toast({ title: "Missing info", description: "Employee and reason are required.", variant: "destructive" });
      return;
    }

    let documentUrl: string | null = null;
    let documentName: string | null = null;

    if (form.file) {
      const path = `${companyId}/${form.employeeId}/${Date.now()}-${form.file.name}`;
      const { error: upErr } = await supabase.storage.from("disciplinary-docs").upload(path, form.file);
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      documentUrl = path;
      documentName = form.file.name;
    }

    const { error } = await supabase.from("disciplinary_records" as any).insert({
      companyId,
      employeeId: form.employeeId,
      actionType: form.actionType,
      incidentDate: form.incidentDate,
      issuedDate: form.issuedDate,
      reason: form.reason,
      issuedBy: user?.id ?? null,
      issuedByName: form.issuedByName || null,
      documentUrl,
      documentName,
      expiryDate: form.expiryDate || null,
      followUpAction: form.followUpAction || null,
      followUpDate: form.followUpDate || null,
      internalNotes: form.internalNotes || null,
    } as any);

    if (error) {
      toast({ title: "Failed to create record", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Disciplinary record created" });
    setOpen(false);
    setForm(initialForm);
    loadAll();
  };

  const downloadDoc = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("disciplinary-docs").createSignedUrl(path, 60);
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

  const updateStatus = async (id: string, status: Status) => {
    const patch: any = { status };
    if (status === "acknowledged") patch.acknowledgedAt = new Date().toISOString();
    const { error } = await supabase.from("disciplinary_records" as any).update(patch).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    loadAll();
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Delete this disciplinary record?")) return;
    const { error } = await supabase.from("disciplinary_records" as any).delete().eq("id", id);
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
          <h1 className="text-3xl font-bold tracking-tight">Termination & Resignation Tracker</h1>
          <p className="text-muted-foreground">Track verbal warnings, warning letters, suspensions, terminations and resignations.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Record</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Disciplinary Record</DialogTitle></DialogHeader>
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
                <Label>Action type</Label>
                <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v as ActionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Incident date</Label>
                <Input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
              </div>
              <div>
                <Label>Issued date</Label>
                <Input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Reason / description</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Issued by</Label>
                <Input value={form.issuedByName} onChange={(e) => setForm({ ...form, issuedByName: e.target.value })} />
              </div>
              <div>
                <Label>Expiry date (warnings)</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
              <div>
                <Label>Follow-up action</Label>
                <Input value={form.followUpAction} onChange={(e) => setForm({ ...form, followUpAction: e.target.value })} placeholder="e.g. Re-training, HR meeting" />
              </div>
              <div>
                <Label>Follow-up date</Label>
                <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Attached document (signed letter, resignation, etc.)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
              </div>
              <div className="col-span-2">
                <Label>Internal notes (HR only)</Label>
                <Textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Save Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{counts.active}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4" />Warnings</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{counts.warnings}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserMinus className="h-4 w-4" />Terminations</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{counts.terminations}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Resignations</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{counts.resignations}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Records</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No records found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Doc</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{empName(r.employeeId)}</TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(r.actionType)} className="gap-1">
                        {actionIcon(r.actionType)}
                        {ACTION_LABELS[r.actionType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(r.incidentDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm" title={r.reason}>{r.reason}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                        <SelectTrigger className="h-8 w-[140px]">
                          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="acknowledged">Acknowledged</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="revoked">Revoked</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {r.documentUrl ? (
                        <Button size="sm" variant="ghost" onClick={() => downloadDoc(r.documentUrl!, r.documentName ?? "document")}>
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => deleteRecord(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
