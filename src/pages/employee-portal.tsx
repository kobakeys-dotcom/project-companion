/**
 * Employee Self-Service Portal.
 *
 * Authenticated employee can:
 *  - View their own profile, leave balance & payroll
 *  - Submit a time-off request (against company leave types)
 *  - Submit an expense (against company expense types)
 *  - View payslips, benefits, and performance reviews
 *  - Acknowledge a submitted performance review
 *
 * All data access goes through Supabase directly with the employee's session,
 * so RLS guarantees they only see their own / their company's data.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  User as UserIcon,
  LogOut,
  CalendarDays,
  Wallet,
  Shield,
  Star,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  Heart,
  Loader2,
  MapPin,
  LogIn,
  FileText,
  Download,
  UtensilsCrossed,
  ShieldAlert,
  MinusCircle,
  FileWarning,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { NotificationBell } from "@/components/notification-bell";
import { SelfieCapture } from "@/components/selfie-capture";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";

const sb: any = supabase;

// ---------------- Types (loose — DB returns camelCase) ----------------
interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  profileImageUrl: string | null;
  vacationDaysTotal: number | null;
  vacationDaysUsed: number | null;
  sickDaysTotal: number | null;
  sickDaysUsed: number | null;
  basicSalary: number | null;
  projectId: string | null;
}
interface LeaveType { id: string; name: string; color: string | null; daysAllowed: number; }
interface ExpenseType { id: string; name: string; color: string; }
interface TimeOffRow {
  id: string; leaveTypeId: string | null; startDate: string; endDate: string;
  reason: string | null; status: string;
  deptApprovalStatus: string; mgmtApprovalStatus: string; adminApprovalStatus: string;
}
interface ExpenseRow {
  id: string; description: string; amount: number; expenseDate: string;
  expenseTypeId: string | null; status: string; receiptUrl: string | null;
}
interface PayrollRow {
  id: string; month: string; payPeriodStart: string; payPeriodEnd: string;
  baseSalary: number; grossSalary: number; netPay: number; deductions: number;
  overtimeAmount: number; status: string;
}
interface BenefitRow {
  id: string; name: string; provider: string | null;
  employeeContribution: number; employerContribution: number;
  coverageDetails: string | null;
}
interface ReviewRow {
  id: string; reviewPeriodStart: string; reviewPeriodEnd: string;
  reviewDate: string | null; overallRating: number | null;
  productivityRating: number | null; qualityRating: number | null;
  teamworkRating: number | null; communicationRating: number | null;
  strengths: string | null; improvements: string | null;
  goals: string | null; comments: string | null; status: string;
}
interface ServiceChargeShareRow {
  id: string; poolId: string; shareAmount: number; weight: number;
  payoutStatus: string; paidAt: string | null; notes: string | null;
  pool?: { outletName: string; outletType: string; periodStart: string; periodEnd: string; currency: string } | null;
}
interface DisciplinaryRow {
  id: string; actionType: string; incidentDate: string; issuedDate: string;
  reason: string; status: string; documentUrl: string | null; documentName: string | null;
  acknowledgedAt: string | null; expiryDate: string | null;
  followUpAction: string | null; followUpDate: string | null; issuedByName: string | null;
}
interface DeductionRow {
  id: string; deductionType: string; amount: number; currency: string;
  incidentDate: string; description: string; status: string;
  applyToPayrollMonth: string | null; evidenceUrl: string | null; evidenceName: string | null;
}
interface DocumentRow {
  id: string; name: string; type: string; category: string;
  fileUrl: string | null; fileSize: number | null; isCompanyWide: boolean;
  employeeId: string | null; createdAt: string;
}
const fmtMoney = (dollars: number | null | undefined, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "USD").toUpperCase() })
    .format((dollars ?? 0) as number);

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    approved:        { cls: "bg-green-500/10 text-green-600",  icon: CheckCircle2, label: "Approved" },
    rejected:        { cls: "bg-red-500/10 text-red-600",      icon: XCircle,      label: "Rejected" },
    pending:         { cls: "bg-yellow-500/10 text-yellow-600",icon: Clock,        label: "Pending" },
    submitted:       { cls: "bg-blue-500/10 text-blue-600",    icon: Clock,        label: "Submitted" },
    acknowledged:    { cls: "bg-green-500/10 text-green-600",  icon: CheckCircle2, label: "Acknowledged" },
    paid:            { cls: "bg-green-500/10 text-green-600",  icon: CheckCircle2, label: "Paid" },
    draft:           { cls: "bg-muted text-muted-foreground",  icon: Clock,        label: "Draft" },
    dept_approved:   { cls: "bg-blue-500/10 text-blue-600",    icon: CheckCircle2, label: "Dept Approved" },
    mgmt_approved:   { cls: "bg-purple-500/10 text-purple-600",icon: CheckCircle2, label: "Mgmt Approved" },
  };
  const v = map[status] ?? { cls: "bg-muted text-muted-foreground", icon: Clock, label: status };
  const Icon = v.icon;
  return (
    <Badge variant="secondary" className={v.cls}>
      <Icon className="h-3 w-3 mr-1" />{v.label}
    </Badge>
  );
}

function StarRating({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ============================================================
// Time-off submission form
// ============================================================
const timeOffSchema = z.object({
  leaveTypeId: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  reason: z.string().max(500).optional(),
}).refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
  message: "End date must be after start date", path: ["endDate"],
});
type TimeOffForm = z.infer<typeof timeOffSchema>;

function RequestTimeOffDialog({ employee, leaveTypes }: { employee: Employee; leaveTypes: LeaveType[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<TimeOffForm>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: { leaveTypeId: "", startDate: "", endDate: "", reason: "" },
  });

  const submit = useMutation({
    mutationFn: async (v: TimeOffForm) => {
      const { error } = await sb.from("time_off_requests").insert({
        companyId: employee.companyId,
        employeeId: employee.id,
        leaveTypeId: v.leaveTypeId,
        startDate: v.startDate,
        endDate: v.endDate,
        reason: v.reason || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Request submitted" });
      qc.invalidateQueries({ queryKey: ["portal:time-off"] });
      form.reset();
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Request Leave</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>Your request will be reviewed by your department, management, and admin.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="leaveTypeId" render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {leaveTypes.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No leave types available</div>
                    )}
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name} ({lt.daysAllowed} days/yr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem><FormLabel>Reason (optional)</FormLabel><FormControl><Textarea {...field} maxLength={500} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Expense submission form
// ============================================================
const expenseSchema = z.object({
  description: z.string().trim().min(1, "Required").max(200),
  amount: z.coerce.number().positive("Amount must be > 0").max(1_000_000),
  expenseDate: z.string().min(1, "Required"),
  expenseTypeId: z.string().optional(),
  notes: z.string().max(500).optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

function SubmitExpenseDialog({ employee, expenseTypes }: { employee: Employee; expenseTypes: ExpenseType[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: "", amount: 0, expenseDate: "", expenseTypeId: "", notes: "" },
  });

  const submit = useMutation({
    mutationFn: async (v: ExpenseForm) => {
      let receiptUrl: string | null = null;
      if (receipt) {
        if (receipt.size > 10 * 1024 * 1024) throw new Error("Receipt must be under 10 MB");
        const ext = receipt.name.split(".").pop() || "bin";
        const path = `${employee.companyId}/${employee.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from("receipts").upload(path, receipt, {
          contentType: receipt.type || undefined,
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
        receiptUrl = path;
      }
      const { error } = await sb.from("expenses").insert({
        companyId: employee.companyId,
        employeeId: employee.id,
        description: v.description,
        amount: Math.round(v.amount * 100), // store cents
        expenseDate: v.expenseDate,
        expenseTypeId: v.expenseTypeId || null,
        notes: v.notes || null,
        receiptUrl,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Expense submitted" });
      qc.invalidateQueries({ queryKey: ["portal:expenses"] });
      form.reset();
      setReceipt(null);
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Submit Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Expense</DialogTitle>
          <DialogDescription>Submit an expense for reimbursement approval.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input maxLength={200} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="expenseDate" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="expenseTypeId" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {expenseTypes.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No categories available</div>
                    )}
                    {expenseTypes.map((et) => (
                      <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormItem>
              <FormLabel>Receipt (optional)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </FormControl>
              {receipt && (
                <p className="text-xs text-muted-foreground">
                  {receipt.name} ({(receipt.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </FormItem>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Textarea maxLength={500} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Time Clock (clock in/out with optional GPS)
// ============================================================
interface TimeEntryRow {
  id: string;
  clockIn: string;
  clockOut: string | null;
  clockInLocation: string | null;
  clockOutLocation: string | null;
  date: string;
}

/**
 * Get a high-accuracy GPS fix.
 *
 * Browsers often return a coarse cached/Wi-Fi/IP fix first (hundreds or
 * thousands of metres). We use watchPosition and keep the best reading until
 * either:
 *   - accuracy is good enough (≤ desiredAccuracy metres), or
 *   - the overall timeout elapses — then we return the best reading we got.
 */
function getPosition(
  desiredAccuracy = 30,
  overallTimeoutMs = 15000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      return reject(new Error("Geolocation is not supported by this browser."));
    }

    let best: GeolocationPosition | null = null;
    let settled = false;

    const finish = (pos: GeolocationPosition | null, err?: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (pos) return resolve(pos);
      if (err) {
        if (err.code === err.PERMISSION_DENIED) {
          return reject(new Error("Location permission denied. Allow location access in your browser settings to clock in."));
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          return reject(new Error("Location unavailable. Enable GPS / location services on your device and try again outdoors."));
        }
        if (err.code === err.TIMEOUT) {
          return reject(new Error("Location request timed out. Move to an open area and try again."));
        }
        return reject(new Error(err.message || "Could not get your location."));
      }
      reject(new Error("Could not get your location."));
    };

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        if (!best || p.coords.accuracy < best.coords.accuracy) best = p;
        if (p.coords.accuracy <= desiredAccuracy) finish(p);
      },
      (err) => {
        // Only fail hard if we never got any reading.
        if (!best) finish(null, err);
      },
      { enableHighAccuracy: true, timeout: overallTimeoutMs, maximumAge: 0 },
    );

    const timer = setTimeout(() => finish(best), overallTimeoutMs);
  });
}


function TimeClockCard({ employee }: { employee: Employee }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [selfieOpen, setSelfieOpen] = useState<null | "in" | "out">(null);
  const [pendingPos, setPendingPos] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: open, isLoading } = useQuery<TimeEntryRow | null>({
    queryKey: ["portal:open-entry", employee.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("time_entries")
        .select("*")
        .eq("employeeId", employee.id)
        .is("clockOut", null)
        .order("clockIn", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as TimeEntryRow | null;
    },
  });

  const { data: recent = [] } = useQuery<TimeEntryRow[]>({
    queryKey: ["portal:recent-entries", employee.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("time_entries")
        .select("*")
        .eq("employeeId", employee.id)
        .order("clockIn", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as TimeEntryRow[];
    },
  });

  const clockIn = useMutation({
    mutationFn: async (selfieUrl: string | null) => {
      const pos = pendingPos;
      if (pos) {
        const { checkProjectGeofence } = await import("@/lib/geofence");
        const result = await checkProjectGeofence(
          employee.projectId,
          pos.coords.latitude,
          pos.coords.longitude,
        );
        if (result.enforced && !result.ok) {
          const dist = result.distance ? Math.round(result.distance) : 0;
          const allowed = result.radiusMeters ?? 0;
          throw new Error(
            `You are ${dist}m from ${result.project?.name ?? "your project site"} (allowed: ${allowed}m). Move closer to clock in.`,
          );
        }
      }
      let placeName: string | null = null;
      if (pos) {
        try {
          const { reverseGeocode } = await import("@/lib/reverse-geocode");
          placeName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        } catch { /* fallback to coords */ }
      }
      const { error } = await sb.from("time_entries").insert({
        companyId: employee.companyId,
        employeeId: employee.id,
        clockIn: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        clockInLatitude: pos?.coords.latitude ?? null,
        clockInLongitude: pos?.coords.longitude ?? null,
        clockInLocation: pos
          ? (placeName ?? `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
          : null,
        clockInSelfieUrl: selfieUrl || null,
        source: "web",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Clocked in" });
      setPendingPos(null);
      qc.invalidateQueries({ queryKey: ["portal:open-entry", employee.id] });
      qc.invalidateQueries({ queryKey: ["portal:recent-entries", employee.id] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const clockOut = useMutation({
    mutationFn: async (selfieUrl: string | null) => {
      if (!open) throw new Error("No open shift");
      let pos: GeolocationPosition | null = null;
      try { pos = await getPosition(); } catch { /* location optional on clock-out */ }
      let placeName: string | null = null;
      if (pos) {
        try {
          const { reverseGeocode } = await import("@/lib/reverse-geocode");
          placeName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        } catch { /* fallback to coords */ }
      }
      const { error } = await sb
        .from("time_entries")
        .update({
          clockOut: new Date().toISOString(),
          clockOutLatitude: pos?.coords.latitude ?? null,
          clockOutLongitude: pos?.coords.longitude ?? null,
          clockOutLocation: pos
            ? (placeName ?? `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
            : null,
          clockOutSelfieUrl: selfieUrl || null,
        })
        .eq("id", open.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Clocked out" });
      qc.invalidateQueries({ queryKey: ["portal:open-entry", employee.id] });
      qc.invalidateQueries({ queryKey: ["portal:recent-entries", employee.id] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const startClockIn = async () => {
    try {
      // Request geolocation directly inside the click handler to preserve user-gesture
      const pos = await getPosition();
      setPendingPos(pos);
      setSelfieOpen("in");
    } catch (e: any) {
      toast({ title: "Location required", description: e.message, variant: "destructive" });
    }
  };
  const startClockOut = () => setSelfieOpen("out");

  const handleSelfieDone = (path: string) => {
    const mode = selfieOpen;
    setSelfieOpen(null);
    if (mode === "in") clockIn.mutate(path || null);
    else if (mode === "out") clockOut.mutate(path || null);
  };

  const elapsedMin = open
    ? Math.floor((now.getTime() - new Date(open.clockIn).getTime()) / 60000)
    : 0;
  const elapsedH = Math.floor(elapsedMin / 60);
  const elapsedM = elapsedMin % 60;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Time Clock</CardTitle>
          <CardDescription>
            {open
              ? `On the clock since ${format(new Date(open.clockIn), "h:mm a")}`
              : "Clock in to start your shift"}
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold tabular-nums">
            {format(now, "HH:mm:ss")}
          </p>
          <p className="text-xs text-muted-foreground">{format(now, "EEE, MMM d")}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : open ? (
          <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Elapsed</p>
              <p className="text-3xl font-bold tabular-nums">
                {elapsedH}h {elapsedM}m
              </p>
              {open.clockInLocation && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {open.clockInLocation}
                </p>
              )}
            </div>
            <Button
              size="lg"
              variant="destructive"
              onClick={startClockOut}
              disabled={clockOut.isPending}
            >
              {clockOut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Clock Out
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={startClockIn}
            disabled={clockIn.isPending}
          >
            {clockIn.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
            Clock In
          </Button>
        )}

        <div>
          <p className="text-sm font-medium mb-2">Recent shifts</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No shifts yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => {
                const dur = e.clockOut
                  ? Math.floor((new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 60000)
                  : null;
                return (
                  <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded border">
                    <div>
                      <p className="font-medium">{format(parseISO(e.date), "EEE, MMM d")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.clockIn), "h:mm a")}
                        {e.clockOut ? ` – ${format(new Date(e.clockOut), "h:mm a")}` : " – in progress"}
                      </p>
                    </div>
                    <span className="font-mono text-xs">
                      {dur != null ? `${Math.floor(dur / 60)}h ${dur % 60}m` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
      <SelfieCapture
        open={selfieOpen !== null}
        onClose={() => setSelfieOpen(null)}
        onCapture={handleSelfieDone}
        title={selfieOpen === "out" ? "Clock-out selfie" : "Clock-in selfie"}
      />
    </Card>
  );
}

// ============================================================
// Main Portal
// ============================================================
export default function EmployeePortal() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Redirect to login when no session
  useEffect(() => {
    if (!authLoading && !user) navigate("/employee/login", { replace: true });
  }, [authLoading, user, navigate]);

  // Look up the linked employee row for this user
  const { data: employee, isLoading: empLoading } = useQuery<Employee | null>({
    queryKey: ["portal:me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb.from("employees").select("*")
        .eq("userId", user!.id).maybeSingle();
      if (error) throw new Error(error.message);
      return data as Employee | null;
    },
  });

  const empId = employee?.id;
  const companyId = employee?.companyId;

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ["portal:leave-types", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await sb.from("leave_types").select("*").eq("isActive", true);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: expenseTypes = [] } = useQuery<ExpenseType[]>({
    queryKey: ["portal:expense-types", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await sb.from("expense_types").select("*").eq("isActive", true);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: timeOff = [] } = useQuery<TimeOffRow[]>({
    queryKey: ["portal:time-off", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("time_off_requests").select("*")
        .eq("employeeId", empId).order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery<ExpenseRow[]>({
    queryKey: ["portal:expenses", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("expenses").select("*")
        .eq("employeeId", empId).order("expenseDate", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: payroll = [] } = useQuery<PayrollRow[]>({
    queryKey: ["portal:payroll", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("payroll_records").select("*")
        .eq("employeeId", empId).order("payPeriodEnd", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Benefits the employee is actually enrolled in (joined to plan details).
  const { data: benefits = [] } = useQuery<BenefitRow[]>({
    queryKey: ["portal:benefits", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("benefit_enrollments")
        .select("benefit:benefitId(*)")
        .eq("employeeId", empId)
        .eq("status", "active");
      if (error) throw new Error(error.message);
      return (data ?? [])
        .map((r: any) => r.benefit)
        .filter(Boolean) as BenefitRow[];
    },
  });

  const { data: reviews = [] } = useQuery<ReviewRow[]>({
    queryKey: ["portal:reviews", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("performance_reviews").select("*")
        .eq("employeeId", empId).order("reviewPeriodEnd", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: documents = [] } = useQuery<DocumentRow[]>({
    queryKey: ["portal:documents", empId, companyId], enabled: !!empId && !!companyId,
    queryFn: async () => {
      // RLS allows: company-wide docs (any member), or docs where employeeId matches the linked employee.
      const { data, error } = await sb.from("documents")
        .select("*")
        .or(`isCompanyWide.eq.true,employeeId.eq.${empId}`)
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as DocumentRow[];
    },
  });

  const { data: serviceCharges = [] } = useQuery<ServiceChargeShareRow[]>({
    queryKey: ["portal:service-charges", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("service_charge_shares")
        .select("*, pool:poolId(outletName, outletType, periodStart, periodEnd, currency)")
        .eq("employeeId", empId)
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ServiceChargeShareRow[];
    },
  });

  const { data: disciplinary = [] } = useQuery<DisciplinaryRow[]>({
    queryKey: ["portal:disciplinary", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("disciplinary_records").select("*")
        .eq("employeeId", empId).order("incidentDate", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as DisciplinaryRow[];
    },
  });

  const { data: deductions = [] } = useQuery<DeductionRow[]>({
    queryKey: ["portal:deductions", empId], enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await sb.from("deductions").select("*")
        .eq("employeeId", empId).order("incidentDate", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as DeductionRow[];
    },
  });

  const acknowledgeDisciplinary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("disciplinary_records")
        .update({ status: "acknowledged", acknowledgedAt: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Acknowledged" });
      qc.invalidateQueries({ queryKey: ["portal:disciplinary"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("performance_reviews")
        .update({ status: "acknowledged" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Review acknowledged" });
      qc.invalidateQueries({ queryKey: ["portal:reviews"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const initials = useMemo(() => {
    if (!employee) return "EM";
    return `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase();
  }, [employee]);

  if (authLoading || empLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No employee profile</CardTitle>
            <CardDescription>
              Your account isn't linked to an employee record yet. Please contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={async () => { await logout(); navigate("/employee/login"); }}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vacRemaining = (employee.vacationDaysTotal ?? 0) - (employee.vacationDaysUsed ?? 0);
  const sickRemaining = (employee.sickDaysTotal ?? 0) - (employee.sickDaysUsed ?? 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={employee.profileImageUrl ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold leading-tight">{employee.firstName} {employee.lastName}</p>
              <p className="text-xs text-muted-foreground">{employee.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={async () => { await logout(); navigate("/employee/login"); }}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Vacation</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vacRemaining}</div>
              <p className="text-xs text-muted-foreground">of {employee.vacationDaysTotal ?? 0} days remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sickRemaining}</div>
              <p className="text-xs text-muted-foreground">of {employee.sickDaysTotal ?? 0} days remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.filter((e) => e.status === "pending").length}</div>
              <p className="text-xs text-muted-foreground">awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Reviews</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviews.filter((r) => r.status === "submitted").length}</div>
              <p className="text-xs text-muted-foreground">awaiting acknowledgement</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="time-clock" className="space-y-4">
          <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full">
            <TabsTrigger value="time-clock">Clock</TabsTrigger>
            <TabsTrigger value="time-off">Time Off</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payroll">Payslips</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="documents">Docs</TabsTrigger>
            <TabsTrigger value="service-charges">Tips</TabsTrigger>
            <TabsTrigger value="disciplinary">Discipline</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
          </TabsList>

          {/* ----- TIME CLOCK ----- */}
          <TabsContent value="time-clock">
            <TimeClockCard employee={employee} />
          </TabsContent>

          {/* ----- TIME OFF ----- */}
          <TabsContent value="time-off">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>My Time-Off Requests</CardTitle>
                  <CardDescription>Submit and track leave requests.</CardDescription>
                </div>
                <RequestTimeOffDialog employee={employee} leaveTypes={leaveTypes} />
              </CardHeader>
              <CardContent>
                {timeOff.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {timeOff.map((r) => {
                      const lt = leaveTypes.find((l) => l.id === r.leaveTypeId);
                      return (
                        <div key={r.id} className="p-3 rounded-lg border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-medium">{lt?.name ?? "Leave"}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(r.startDate), "MMM d")} – {format(parseISO(r.endDate), "MMM d, yyyy")}
                              </p>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                          {r.reason && <p className="text-sm italic text-muted-foreground mb-2">"{r.reason}"</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Dept: <StatusBadge status={r.deptApprovalStatus} /></span>
                            <span>Mgmt: <StatusBadge status={r.mgmtApprovalStatus} /></span>
                            <span>Admin: <StatusBadge status={r.adminApprovalStatus} /></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- EXPENSES ----- */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>My Expenses</CardTitle>
                  <CardDescription>Submit expenses for reimbursement.</CardDescription>
                </div>
                <SubmitExpenseDialog employee={employee} expenseTypes={expenseTypes} />
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet.</p>
                ) : (
                  <div className="space-y-3">
                    {expenses.map((e) => {
                      const et = expenseTypes.find((t) => t.id === e.expenseTypeId);
                      return (
                        <div key={e.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{e.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(e.expenseDate), "MMM d, yyyy")}{et ? ` · ${et.name}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{fmtMoney(e.amount)}</span>
                            {e.receiptUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const { data, error } = await sb.storage
                                    .from("receipts")
                                    .createSignedUrl(e.receiptUrl!, 60);
                                  if (error || !data?.signedUrl) {
                                    toast({ title: "Could not open receipt", description: error?.message, variant: "destructive" });
                                    return;
                                  }
                                  window.open(data.signedUrl, "_blank", "noopener");
                                }}
                              >
                                <Receipt className="h-3 w-3 mr-1" />Receipt
                              </Button>
                            )}
                            <StatusBadge status={e.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- PAYROLL ----- */}
          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <CardTitle>My Payslips</CardTitle>
                <CardDescription>Your payroll history.</CardDescription>
              </CardHeader>
              <CardContent>
                {payroll.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No payslips yet.</p>
                ) : (
                  <div className="space-y-3">
                    {payroll.map((p) => (
                      <div key={p.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-semibold">{p.month}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(p.payPeriodStart), "MMM d")} – {format(parseISO(p.payPeriodEnd), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={p.status} />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                downloadPayslipPdf(p, {
                                  firstName: employee.firstName,
                                  lastName: employee.lastName,
                                  jobTitle: employee.jobTitle,
                                  email: employee.email,
                                })
                              }
                            >
                              <Download className="h-3 w-3 mr-1" />PDF
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-muted-foreground">Base</p><p className="font-medium">{fmtMoney(p.baseSalary)}</p></div>
                          <div><p className="text-muted-foreground">Overtime</p><p className="font-medium">{fmtMoney(p.overtimeAmount)}</p></div>
                          <div><p className="text-muted-foreground">Deductions</p><p className="font-medium">−{fmtMoney(p.deductions)}</p></div>
                          <div><p className="text-muted-foreground">Net Pay</p><p className="font-bold text-primary">{fmtMoney(p.netPay)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- BENEFITS ----- */}
          <TabsContent value="benefits">
            <Card>
              <CardHeader>
                <CardTitle>My Benefits</CardTitle>
                <CardDescription>Plans you are enrolled in.</CardDescription>
              </CardHeader>
              <CardContent>
                {benefits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">You are not enrolled in any benefit plans yet.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {benefits.map((b) => (
                      <div key={b.id} className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-primary" />
                          <p className="font-semibold">{b.name}</p>
                        </div>
                        {b.provider && <p className="text-xs text-muted-foreground mb-2">{b.provider}</p>}
                        {b.coverageDetails && <p className="text-sm mb-2">{b.coverageDetails}</p>}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Your share</span>
                          <span className="font-medium">{fmtMoney(b.employeeContribution)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Employer share</span>
                          <span className="font-medium">{fmtMoney(b.employerContribution)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- REVIEWS ----- */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>My Performance Reviews</CardTitle>
                <CardDescription>Acknowledge submitted reviews.</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {format(parseISO(r.reviewPeriodStart), "MMM yyyy")} – {format(parseISO(r.reviewPeriodEnd), "MMM yyyy")}
                            </p>
                            {r.reviewDate && (
                              <p className="text-xs text-muted-foreground">
                                Reviewed {format(parseISO(r.reviewDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                          <div><p className="text-xs text-muted-foreground">Overall</p><StarRating value={r.overallRating} /></div>
                          <div><p className="text-xs text-muted-foreground">Productivity</p><StarRating value={r.productivityRating} /></div>
                          <div><p className="text-xs text-muted-foreground">Quality</p><StarRating value={r.qualityRating} /></div>
                          <div><p className="text-xs text-muted-foreground">Teamwork</p><StarRating value={r.teamworkRating} /></div>
                          <div><p className="text-xs text-muted-foreground">Communication</p><StarRating value={r.communicationRating} /></div>
                        </div>
                        {r.strengths && (<div><p className="text-xs font-medium">Strengths</p><p className="text-sm text-muted-foreground">{r.strengths}</p></div>)}
                        {r.improvements && (<div><p className="text-xs font-medium">Areas to improve</p><p className="text-sm text-muted-foreground">{r.improvements}</p></div>)}
                        {r.goals && (<div><p className="text-xs font-medium">Goals</p><p className="text-sm text-muted-foreground">{r.goals}</p></div>)}
                        {r.status === "submitted" && (
                          <div className="pt-2">
                            <Button size="sm" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate(r.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-1" />Acknowledge
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- DOCUMENTS ----- */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>Personal documents and company-wide files.</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No documents yet.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((d) => (
                      <div key={d.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {d.category} · {d.type}
                              {d.fileSize ? ` · ${(d.fileSize / 1024).toFixed(0)} KB` : ""}
                              {d.isCompanyWide ? " · Company-wide" : ""}
                            </p>
                          </div>
                        </div>
                        {d.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const { data, error } = await sb.storage
                                .from("documents")
                                .createSignedUrl(d.fileUrl!, 60);
                              if (error || !data?.signedUrl) {
                                toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
                                return;
                              }
                              window.open(data.signedUrl, "_blank", "noopener");
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />Open
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- SERVICE CHARGES ----- */}
          <TabsContent value="service-charges">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" />My Service Charges</CardTitle>
                <CardDescription>Tips and service charge shares from outlets.</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceCharges.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No service charge shares yet.</p>
                ) : (
                  <div className="space-y-3">
                    {serviceCharges.map((s) => (
                      <div key={s.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.pool?.outletName ?? "Pool"}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {s.pool?.outletType?.replace("_", " ")}
                            {s.pool && ` · ${format(parseISO(s.pool.periodStart), "MMM d")} – ${format(parseISO(s.pool.periodEnd), "MMM d, yyyy")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{fmtMoney(s.shareAmount)}</span>
                          <StatusBadge status={s.payoutStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- DISCIPLINARY ----- */}
          <TabsContent value="disciplinary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" />My Disciplinary Records</CardTitle>
                <CardDescription>Warnings, suspensions and related actions. Acknowledge to confirm receipt.</CardDescription>
              </CardHeader>
              <CardContent>
                {disciplinary.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No records.</p>
                ) : (
                  <div className="space-y-3">
                    {disciplinary.map((d) => (
                      <div key={d.id} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold capitalize flex items-center gap-2">
                              <FileWarning className="h-4 w-4" />
                              {d.actionType.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Incident {format(parseISO(d.incidentDate), "MMM d, yyyy")} · Issued {format(parseISO(d.issuedDate), "MMM d, yyyy")}
                              {d.issuedByName ? ` · by ${d.issuedByName}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-sm">{d.reason}</p>
                        {d.followUpAction && (
                          <p className="text-xs text-muted-foreground">Follow-up: {d.followUpAction}{d.followUpDate ? ` · ${format(parseISO(d.followUpDate), "MMM d, yyyy")}` : ""}</p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          {d.documentUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { data, error } = await sb.storage
                                  .from("disciplinary-docs")
                                  .createSignedUrl(d.documentUrl!, 60);
                                if (error || !data?.signedUrl) {
                                  toast({ title: "Could not open document", description: error?.message, variant: "destructive" });
                                  return;
                                }
                                window.open(data.signedUrl, "_blank", "noopener");
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />{d.documentName ?? "Document"}
                            </Button>
                          )}
                          {d.status === "active" && !d.acknowledgedAt && (
                            <Button
                              size="sm"
                              disabled={acknowledgeDisciplinary.isPending}
                              onClick={() => acknowledgeDisciplinary.mutate(d.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />Acknowledge
                            </Button>
                          )}
                          {d.acknowledgedAt && (
                            <span className="text-xs text-muted-foreground">
                              Acknowledged {format(new Date(d.acknowledgedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- DEDUCTIONS ----- */}
          <TabsContent value="deductions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MinusCircle className="h-4 w-4" />My Deductions</CardTitle>
                <CardDescription>Deductions for incidents like accommodation damage, wrong orders, equipment loss.</CardDescription>
              </CardHeader>
              <CardContent>
                {deductions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No deductions.</p>
                ) : (
                  <div className="space-y-3">
                    {deductions.map((d) => (
                      <div key={d.id} className="p-3 rounded-lg border">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0">
                            <p className="font-medium capitalize">{d.deductionType.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(d.incidentDate), "MMM d, yyyy")}
                              {d.applyToPayrollMonth ? ` · Applied to ${d.applyToPayrollMonth}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-destructive">−{fmtMoney(d.amount)}</span>
                            <StatusBadge status={d.status} />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{d.description}</p>
                        {d.evidenceUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={async () => {
                              const { data, error } = await sb.storage
                                .from("deduction-evidence")
                                .createSignedUrl(d.evidenceUrl!, 60);
                              if (error || !data?.signedUrl) {
                                toast({ title: "Could not open evidence", description: error?.message, variant: "destructive" });
                                return;
                              }
                              window.open(data.signedUrl, "_blank", "noopener");
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />{d.evidenceName ?? "Evidence"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
