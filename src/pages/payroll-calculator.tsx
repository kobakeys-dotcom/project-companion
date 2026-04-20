import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calculator, Loader2, Save, RefreshCw } from "lucide-react";

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  basicSalary: number | null;
  fixedAllowance: number | null;
  dutyAllowance: number | null;
  attendanceAllowance: number | null;
  accommodationAllowance: number | null; // used as Living Allowance
  additionalServiceAllowance: number | null;
  companyId: string;
};

// All values in this UI are in WHOLE currency units (e.g. MVR).
// On save we convert to cents (×100) to match payroll_records storage.
type RowState = {
  basic: number;
  fixed: number;
  duty: number;
  attendance: number;
  living: number;
  additionalService: number;
  earned: number;       // proratable; defaults to basic
  workedDays: number;
  otHours: number;
  otRate: number;       // per hour, whole units
  serviceCharge: number; // pulled from service_charge_shares
  deductions: number;
  notes: string;
};

const todayMonthLabel = () => {
  const d = new Date();
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const lastOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export default function PayrollCalculatorPage() {
  const { toast } = useToast();

  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(lastOfMonth());
  const [monthLabel, setMonthLabel] = useState(todayMonthLabel());
  const [stdDays, setStdDays] = useState(26);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const { data: employees, isLoading } = useQuery<EmployeeRow[]>({
    queryKey: ["calc-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          'id, firstName, lastName, jobTitle, basicSalary, fixedAllowance, dutyAllowance, attendanceAllowance, accommodationAllowance, additionalServiceAllowance, companyId',
        )
        .eq("employmentStatus", "active")
        .order("firstName");
      if (error) throw error;
      return (data ?? []) as EmployeeRow[];
    },
  });

  // Optional: load worked days from time_entries to prorate earned salary
  const { data: workedDaysMap, refetch: refetchAttendance } = useQuery<Record<string, number>>({
    queryKey: ["calc-worked-days", periodStart, periodEnd],
    enabled: false, // user clicks "Pull attendance"
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("employeeId, date")
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .not("clockIn", "is", null);
      if (error) throw error;
      const map: Record<string, Set<string>> = {};
      for (const e of data ?? []) {
        if (!map[e.employeeId]) map[e.employeeId] = new Set();
        map[e.employeeId].add(e.date);
      }
      return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.size]));
    },
  });

  // Approved/deducted deductions for this payroll month (YYYY-MM derived from periodStart)
  const payrollMonthKey = periodStart.slice(0, 7);
  const { data: deductionsByEmp, refetch: refetchDeductions } = useQuery<
    Record<string, { total: number; notes: string }>
  >({
    queryKey: ["calc-deductions", payrollMonthKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deductions")
        .select("employeeId, amount, currency, description, deductionType, status, applyToPayrollMonth")
        .in("status", ["approved", "deducted"])
        .eq("applyToPayrollMonth", payrollMonthKey);
      if (error) throw error;
      const map: Record<string, { total: number; notes: string }> = {};
      for (const d of (data ?? []) as Array<{
        employeeId: string; amount: number; currency: string;
        description: string; deductionType: string;
      }>) {
        const cur = map[d.employeeId] ?? { total: 0, notes: "" };
        cur.total += Number(d.amount) || 0;
        const line = `${d.deductionType.replace(/_/g, " ")}: ${Number(d.amount).toFixed(2)} — ${d.description}`;
        cur.notes = cur.notes ? `${cur.notes}\n${line}` : line;
        map[d.employeeId] = cur;
      }
      return map;
    },
  });

  const applyDeductions = (
    map: Record<string, { total: number; notes: string }> | undefined,
    opts: { silent?: boolean } = {},
  ) => {
    const m = map ?? {};
    const matchedIds = Object.keys(m);
    let touched = 0;
    setRows((prev) => {
      const next = { ...prev };
      for (const id of matchedIds) {
        const d = m[id];
        const r = next[id];
        if (!r) continue;
        next[id] = { ...r, deductions: d.total, notes: d.notes };
        touched++;
      }
      return next;
    });
    if (opts.silent) return;
    if (matchedIds.length === 0) {
      toast({
        title: "No deductions found",
        description: `No approved/deducted entries marked for ${payrollMonthKey}. Set "Apply to payroll month" on the Deductions page.`,
      });
    } else if (touched === 0) {
      toast({
        title: "Employee not in this payroll",
        description: `Found ${matchedIds.length} deduction${matchedIds.length === 1 ? "" : "s"} for ${payrollMonthKey}, but the employee is not loaded in the calculator yet. Try again in a moment.`,
      });
    } else {
      toast({
        title: "Deductions pulled",
        description: `Applied to ${touched} employee${touched === 1 ? "" : "s"} for ${payrollMonthKey}.`,
      });
    }
  };

  // Auto-apply once both rows and deductions are available (silent — no toast on mount)
  useEffect(() => {
    if (deductionsByEmp && employees && Object.keys(rows).length > 0) {
      applyDeductions(deductionsByEmp, { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deductionsByEmp, employees, Object.keys(rows).length]);

  // Paid service charge shares whose pool period overlaps payroll period
  const { data: serviceChargesByEmp, refetch: refetchServiceCharges } = useQuery<
    Record<string, { total: number; notes: string }>
  >({
    queryKey: ["calc-service-charges", periodStart, periodEnd],
    queryFn: async () => {
      const { data: pools, error: pErr } = await (supabase as any)
        .from("service_charge_pools")
        .select("id, outletName, periodStart, periodEnd")
        .lte("periodStart", periodEnd)
        .gte("periodEnd", periodStart);
      if (pErr) throw pErr;
      const poolIds = (pools ?? []).map((p: any) => p.id);
      if (poolIds.length === 0) return {};
      const poolMap: Record<string, string> = Object.fromEntries(
        (pools ?? []).map((p: any) => [p.id, p.outletName]),
      );
      const { data: shares, error: sErr } = await (supabase as any)
        .from("service_charge_shares")
        .select("employeeId, poolId, shareAmount, payoutStatus")
        .in("poolId", poolIds);
      if (sErr) throw sErr;
      const map: Record<string, { total: number; notes: string }> = {};
      for (const s of (shares ?? []) as Array<{
        employeeId: string; poolId: string; shareAmount: number; payoutStatus: string;
      }>) {
        const cur = map[s.employeeId] ?? { total: 0, notes: "" };
        cur.total += Number(s.shareAmount) || 0;
        const line = `Service charge (${poolMap[s.poolId] ?? "pool"}): ${Number(s.shareAmount).toFixed(2)}`;
        cur.notes = cur.notes ? `${cur.notes}\n${line}` : line;
        map[s.employeeId] = cur;
      }
      return map;
    },
  });

  const applyServiceCharges = (map: Record<string, { total: number; notes: string }> | undefined) => {
    if (!employees) return;
    const m = map ?? {};
    let touched = 0;
    setRows((prev) => {
      const next = { ...prev };
      for (const e of employees) {
        const d = m[e.id];
        const r = next[e.id];
        if (!r) continue;
        if (d) {
          const mergedNotes = r.notes ? `${r.notes}\n${d.notes}` : d.notes;
          next[e.id] = { ...r, serviceCharge: d.total, notes: mergedNotes };
          touched++;
        }
      }
      return next;
    });
    toast({
      title: touched > 0 ? "Service charges pulled" : "No service charges found",
      description:
        touched > 0
          ? `Applied to ${touched} employee${touched === 1 ? "" : "s"}.`
          : `No service charge shares for pools overlapping ${periodStart} – ${periodEnd}.`,
    });
  };

  // Auto-apply on first load
  useEffect(() => {
    if (serviceChargesByEmp && employees) applyServiceCharges(serviceChargesByEmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceChargesByEmp, employees]);

  // Initialize rows whenever employees load
  useEffect(() => {
    if (!employees) return;
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const e of employees) {
        const existing = prev[e.id];
        const basic = Math.round((e.basicSalary ?? 0) as number);
        next[e.id] = existing ?? {
          basic,
          fixed: Math.round((e.fixedAllowance ?? 0) as number),
          duty: Math.round((e.dutyAllowance ?? 0) as number),
          attendance: Math.round((e.attendanceAllowance ?? 0) as number),
          living: Math.round((e.accommodationAllowance ?? 0) as number),
          additionalService: Math.round((e.additionalServiceAllowance ?? 0) as number),
          earned: basic,
          workedDays: stdDays,
          otHours: 0,
          otRate: 0,
          serviceCharge: 0,
          deductions: 0,
          notes: "",
        };
      }
      return next;
    });
  }, [employees, stdDays]);

  // Apply attendance when fetched
  useEffect(() => {
    if (!workedDaysMap || !employees) return;
    setRows((prev) => {
      const next = { ...prev };
      for (const e of employees) {
        const wd = workedDaysMap[e.id] ?? 0;
        const r = next[e.id];
        if (!r) continue;
        const earned = Math.round((r.basic / Math.max(stdDays, 1)) * wd);
        next[e.id] = { ...r, workedDays: wd, earned };
      }
      return next;
    });
    toast({ title: "Attendance loaded", description: "Earned salaries prorated from worked days." });
  }, [workedDaysMap, employees, stdDays, toast]);

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const merged = { ...cur, ...patch };
      // If basic or workedDays changed, recompute earned
      if ("basic" in patch || "workedDays" in patch) {
        merged.earned = Math.round(
          (merged.basic / Math.max(stdDays, 1)) * Math.min(merged.workedDays, stdDays),
        );
      }
      return { ...prev, [id]: merged };
    });
  };

  const computed = useMemo(() => {
    const out: Record<string, { ot: number; gross: number; net: number }> = {};
    for (const [id, r] of Object.entries(rows)) {
      const ot = Math.round((r.otHours || 0) * (r.otRate || 0));
      const gross =
        (r.earned || 0) +
        (r.fixed || 0) +
        (r.duty || 0) +
        (r.attendance || 0) +
        (r.living || 0) +
        (r.additionalService || 0) +
        (r.serviceCharge || 0) +
        ot;
      const net = gross - (r.deductions || 0);
      out[id] = { ot, gross, net };
    }
    return out;
  }, [rows]);

  const totals = useMemo(() => {
    let basic = 0, allowances = 0, ot = 0, gross = 0, ded = 0, net = 0, sc = 0;
    for (const [id, r] of Object.entries(rows)) {
      const c = computed[id];
      basic += r.earned;
      allowances += r.fixed + r.duty + r.attendance + r.living + r.additionalService;
      sc += r.serviceCharge;
      ot += c?.ot ?? 0;
      gross += c?.gross ?? 0;
      ded += r.deductions;
      net += c?.net ?? 0;
    }
    return { basic, allowances, sc, ot, gross, ded, net };
  }, [rows, computed]);



  const saveAll = useMutation({
    mutationFn: async () => {
      if (!employees) return { saved: 0, skipped: 0 };
      const companyId = employees[0]?.companyId;
      if (!companyId) throw new Error("No company context");
      let saved = 0, skipped = 0;

      for (const e of employees) {
        const r = rows[e.id];
        if (!r) { skipped++; continue; }
        if (r.basic === 0 && r.earned === 0) { skipped++; continue; }

        const c = computed[e.id];
        const payload = {
          companyId,
          employeeId: e.id,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          month: monthLabel,
          baseSalary: Math.round(r.basic) * 100,
          earnedSalary: Math.round(r.earned) * 100,
          fixedAllowance: Math.round(r.fixed) * 100,
          dutyAllowance: Math.round(r.duty) * 100,
          attendanceAllowance: Math.round(r.attendance) * 100,
          livingAllowance: Math.round(r.living) * 100,
          additionalServiceAllowance: (Math.round(r.additionalService) + Math.round(r.serviceCharge)) * 100,
          overtimeHours: r.otHours,
          overtimeRate: Math.round(r.otRate) * 100,
          overtimeAmount: Math.round(c.ot) * 100,
          grossSalary: Math.round(c.gross) * 100,
          deductions: Math.round(r.deductions) * 100,
          deductionNotes: r.notes || null,
          netPay: Math.round(c.net) * 100,
          payFrequency: "monthly",
        };

        // Upsert: check existing record for (employee, period)
        const { data: existing, error: selErr } = await supabase
          .from("payroll_records")
          .select("id")
          .eq("employeeId", e.id)
          .eq("payPeriodStart", periodStart)
          .eq("payPeriodEnd", periodEnd)
          .maybeSingle();
        if (selErr) throw selErr;

        if (existing) {
          const { error } = await supabase
            .from("payroll_records")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("payroll_records").insert(payload);
          if (error) throw error;
        }
        saved++;
      }
      return { saved, skipped };
    },
    onSuccess: ({ saved, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({
        title: "Payroll saved",
        description: `${saved} record${saved === 1 ? "" : "s"} saved${skipped ? `, ${skipped} skipped` : ""}.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save payroll", description: err.message, variant: "destructive" });
    },
  });

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const numInput = (v: number, on: (n: number) => void, w = "w-24") => (
    <Input
      type="number"
      step="0.01"
      className={`${w} h-8`}
      value={v === 0 ? "" : v}
      onChange={(e) => on(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
    />
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/payroll"><ArrowLeft className="h-4 w-4 mr-2" />Payroll</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6" /> Payroll Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Bulk-calculate and save payroll for a period in one go.
            </p>
          </div>
        </div>
        <Button
          onClick={() => saveAll.mutate()}
          disabled={saveAll.isPending || !employees?.length}
        >
          {saveAll.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save All
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Period</CardTitle>
          <CardDescription>Set the period and pull worked days from attendance.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <Label>Month</Label>
            <Input value={monthLabel} onChange={(e) => setMonthLabel(e.target.value)} />
          </div>
          <div>
            <Label>Period Start</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <Label>Period End</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div>
            <Label>Standard Days</Label>
            <Input
              type="number"
              min={1}
              value={stdDays}
              onChange={(e) => setStdDays(Math.max(1, parseInt(e.target.value || "0") || 1))}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => refetchAttendance()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" /> Pull Attendance
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={async () => {
                const { data } = await refetchDeductions();
                applyDeductions(data);
              }}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Pull Deductions
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={async () => {
                const { data } = await refetchServiceCharges();
                applyServiceCharges(data);
              }}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Pull Service Charges
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees ({employees?.length ?? 0})</CardTitle>
          <CardDescription>
            Earned salary auto-prorates: <code className="px-1">basic × workedDays / stdDays</code>.
            All amounts are whole currency units.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !employees?.length ? (
            <p className="text-sm text-muted-foreground">No active employees.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Employee</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Fixed</TableHead>
                  <TableHead>Duty</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Living</TableHead>
                  <TableHead>Add. Service</TableHead>
                  <TableHead>Service Charge</TableHead>
                  <TableHead>OT Hrs</TableHead>
                  <TableHead>OT Rate</TableHead>
                  <TableHead>OT Amt</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deduct.</TableHead>
                  <TableHead className="min-w-32">Notes</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => {
                  const r = rows[e.id];
                  if (!r) return null;
                  const c = computed[e.id] ?? { ot: 0, gross: 0, net: 0 };
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.firstName} {e.lastName}</div>
                        <div className="text-xs text-muted-foreground">{e.jobTitle}</div>
                      </TableCell>
                      <TableCell>{numInput(r.basic, (n) => updateRow(e.id, { basic: n }))}</TableCell>
                      <TableCell>{numInput(r.workedDays, (n) => updateRow(e.id, { workedDays: n }), "w-16")}</TableCell>
                      <TableCell>{numInput(r.earned, (n) => updateRow(e.id, { earned: n }))}</TableCell>
                      <TableCell>{numInput(r.fixed, (n) => updateRow(e.id, { fixed: n }))}</TableCell>
                      <TableCell>{numInput(r.duty, (n) => updateRow(e.id, { duty: n }))}</TableCell>
                      <TableCell>{numInput(r.attendance, (n) => updateRow(e.id, { attendance: n }))}</TableCell>
                      <TableCell>{numInput(r.living, (n) => updateRow(e.id, { living: n }))}</TableCell>
                      <TableCell>{numInput(r.additionalService, (n) => updateRow(e.id, { additionalService: n }))}</TableCell>
                      <TableCell>{numInput(r.serviceCharge, (n) => updateRow(e.id, { serviceCharge: n }))}</TableCell>
                      <TableCell>{numInput(r.otHours, (n) => updateRow(e.id, { otHours: n }), "w-16")}</TableCell>
                      <TableCell>{numInput(r.otRate, (n) => updateRow(e.id, { otRate: n }), "w-20")}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(c.ot)}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(c.gross)}</TableCell>
                      <TableCell>{numInput(r.deductions, (n) => updateRow(e.id, { deductions: n }))}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={r.notes}
                          onChange={(ev) => updateRow(e.id, { notes: ev.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmt(c.net)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Totals</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>{fmt(totals.basic)}</TableCell>
                  <TableCell colSpan={5}>{fmt(totals.allowances)} (allowances)</TableCell>
                  <TableCell>{fmt(totals.sc)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>{fmt(totals.ot)}</TableCell>
                  <TableCell>{fmt(totals.gross)}</TableCell>
                  <TableCell>{fmt(totals.ded)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-primary">{fmt(totals.net)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
