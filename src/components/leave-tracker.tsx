/**
 * Leave Tracker — single component with three sub-views:
 *   - Balances: per-employee vacation/sick used vs total (computed from
 *     approved time_off_requests).
 *   - Calendar: month grid showing who is off each day, color-coded by
 *     leave type.
 *   - Usage:    horizontal bar chart of approved days per leave type for
 *               the selected period.
 *
 * Export button on top dumps all approved time-off rows in the selected
 * period to .xlsx.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Calendar as CalIcon, BarChart3, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  vacationDaysTotal?: number | null;
  vacationDaysUsed?: number | null;
  sickDaysTotal?: number | null;
  sickDaysUsed?: number | null;
};

type LeaveType = {
  id: string;
  name: string;
  color?: string | null;
};

type TimeOffRequest = {
  id: string;
  employeeId: string;
  leaveTypeId?: string | null;
  startDate: string;
  endDate: string;
  actualReturnDate?: string | null;
  status: string;
  type?: string | null;
  reason?: string | null;
};

interface LeaveTrackerProps {
  employees: Employee[];
  leaveTypes: LeaveType[];
  requests: TimeOffRequest[];
}

// Inclusive date diff in days
function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function fmtMonth(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function LeaveTracker({ employees, leaveTypes, requests }: LeaveTrackerProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"balances" | "calendar" | "usage">("balances");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11

  const periodStart = useMemo(() => isoDate(new Date(year, 0, 1)), [year]);
  const periodEnd = useMemo(() => isoDate(new Date(year, 11, 31)), [year]);

  const approved = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests],
  );

  // Approved rows that overlap [periodStart, periodEnd]
  const approvedInYear = useMemo(
    () =>
      approved.filter(
        (r) => r.endDate >= periodStart && r.startDate <= periodEnd,
      ),
    [approved, periodStart, periodEnd],
  );

  const empById = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const ltById = useMemo(() => {
    const m = new Map<string, LeaveType>();
    leaveTypes.forEach((l) => m.set(l.id, l));
    return m;
  }, [leaveTypes]);

  // ---------- Balances ----------
  // Dynamic per-leave-type usage built from the company's configured leave_types.
  type BalanceRow = {
    employee: Employee;
    // leaveTypeId -> days used (key "__other__" for unmatched)
    used: Record<string, number>;
    otherUsed: number;
  };

  const balances: BalanceRow[] = useMemo(() => {
    const rows = new Map<string, BalanceRow>();
    employees.forEach((e) => {
      rows.set(e.id, { employee: e, used: {}, otherUsed: 0 });
    });
    approvedInYear.forEach((r) => {
      const row = rows.get(r.employeeId);
      if (!row) return;
      const days = daysBetween(r.startDate, r.actualReturnDate ?? r.endDate);
      if (r.leaveTypeId && ltById.has(r.leaveTypeId)) {
        row.used[r.leaveTypeId] = (row.used[r.leaveTypeId] ?? 0) + days;
      } else if (r.type) {
        // Try to match legacy type string against a configured leave type by name
        const match = leaveTypes.find(
          (lt) => lt.name.toLowerCase() === r.type!.toLowerCase(),
        );
        if (match) row.used[match.id] = (row.used[match.id] ?? 0) + days;
        else row.otherUsed += days;
      } else {
        row.otherUsed += days;
      }
    });
    return Array.from(rows.values()).sort((a, b) =>
      `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
        `${b.employee.firstName} ${b.employee.lastName}`,
      ),
    );
  }, [employees, approvedInYear, ltById, leaveTypes]);

  // ---------- Calendar ----------
  const calendarCells = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay(); // 0=Sun
    const totalDays = last.getDate();
    type Cell = { day: number | null; iso?: string; entries: Array<{ emp: Employee; lt?: LeaveType }> };
    const cells: Cell[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, entries: [] });
    for (let d = 1; d <= totalDays; d++) {
      const iso = isoDate(new Date(year, month, d));
      const entries: Cell["entries"] = [];
      approved.forEach((r) => {
        const end = r.actualReturnDate ?? r.endDate;
        if (iso >= r.startDate && iso <= end) {
          const emp = empById.get(r.employeeId);
          if (emp) entries.push({ emp, lt: r.leaveTypeId ? ltById.get(r.leaveTypeId) : undefined });
        }
      });
      cells.push({ day: d, iso, entries });
    }
    return cells;
  }, [year, month, approved, empById, ltById]);

  // ---------- Usage chart ----------
  type UsageRow = { id: string; name: string; color: string; days: number };

  const usage: UsageRow[] = useMemo(() => {
    const map = new Map<string, UsageRow>();
    leaveTypes.forEach((lt) =>
      map.set(lt.id, { id: lt.id, name: lt.name, color: lt.color || "#6366f1", days: 0 }),
    );
    map.set("__other__", { id: "__other__", name: "Other / Unspecified", color: "#94a3b8", days: 0 });
    approvedInYear.forEach((r) => {
      const days = daysBetween(r.startDate, r.actualReturnDate ?? r.endDate);
      const key = r.leaveTypeId && map.has(r.leaveTypeId) ? r.leaveTypeId : "__other__";
      map.get(key)!.days += days;
    });
    return Array.from(map.values()).filter((u) => u.days > 0).sort((a, b) => b.days - a.days);
  }, [leaveTypes, approvedInYear]);

  const usageMax = Math.max(1, ...usage.map((u) => u.days));

  // ---------- Export ----------
  const handleExport = () => {
    if (approvedInYear.length === 0) {
      toast({ title: "Nothing to export", description: `No approved leaves in ${year}.`, variant: "destructive" });
      return;
    }
    const rows = approvedInYear.map((r) => {
      const emp = empById.get(r.employeeId);
      const lt = r.leaveTypeId ? ltById.get(r.leaveTypeId) : undefined;
      return {
        Employee: `${emp?.firstName ?? ""} ${emp?.lastName ?? ""}`.trim(),
        "Leave Type": lt?.name ?? r.type ?? "",
        "Start Date": r.startDate,
        "End Date": r.endDate,
        "Actual Return": r.actualReturnDate ?? "",
        Days: daysBetween(r.startDate, r.actualReturnDate ?? r.endDate),
        Reason: r.reason ?? "",
        Status: r.status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Leaves ${year}`);
    XLSX.writeFile(wb, `leave_tracker_${year}.xlsx`);
    toast({ title: "Export complete", description: `${rows.length} leave rows exported.` });
  };

  const monthLabel = fmtMonth(new Date(year, month, 1));

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Year</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || "0", 10) || today.getFullYear())}
            className="w-24"
            data-testid="input-tracker-year"
          />
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export-leaves">
          <Download className="h-4 w-4 mr-2" /> Export {year} approved leaves
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="balances"><Users className="h-4 w-4 mr-1.5" />Balances</TabsTrigger>
          <TabsTrigger value="calendar"><CalIcon className="h-4 w-4 mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="usage"><BarChart3 className="h-4 w-4 mr-1.5" />Usage</TabsTrigger>
        </TabsList>

        {/* ---- Balances (table) ---- */}
        <TabsContent value="balances" className="mt-4">
          {balances.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No employees</CardContent></Card>
          ) : leaveTypes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No leave types configured</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3 sticky left-0 bg-muted/50 z-10">Employee</th>
                      {leaveTypes.map((lt) => (
                        <th key={lt.id} className="text-left font-medium px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: lt.color || "hsl(var(--primary))" }}
                            />
                            {lt.name}
                          </span>
                        </th>
                      ))}
                      <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Other</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((row) => {
                      const e = row.employee;
                      const initials = `${e.firstName?.[0] ?? ""}${e.lastName?.[0] ?? ""}`.toUpperCase() || "?";
                      return (
                        <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3 sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={e.profileImageUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">{e.firstName} {e.lastName}</span>
                            </div>
                          </td>
                          {leaveTypes.map((lt) => {
                            const used = row.used[lt.id] ?? 0;
                            const total = (lt as any).daysAllowed ?? 0;
                            const remaining = Math.max(0, total - used);
                            return (
                              <td key={lt.id} className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium">
                                  {used}{total > 0 ? ` / ${total}` : ""} <span className="text-muted-foreground font-normal">days</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {total > 0 ? `${remaining} remaining` : "—"}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.otherUsed > 0 ? (
                              <Badge variant="secondary">{row.otherUsed}d</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Calendar ---- */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{monthLabel}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  const d = new Date(year, month - 1, 1);
                  setYear(d.getFullYear()); setMonth(d.getMonth());
                }}>‹ Prev</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const d = new Date(today.getFullYear(), today.getMonth(), 1);
                  setYear(d.getFullYear()); setMonth(d.getMonth());
                }}>Today</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const d = new Date(year, month + 1, 1);
                  setYear(d.getFullYear()); setMonth(d.getMonth());
                }}>Next ›</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-1">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="px-2 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, i) => {
                  if (cell.day === null) return <div key={i} className="min-h-20 rounded-md bg-muted/30" />;
                  const isToday = cell.iso === isoDate(today);
                  return (
                    <div
                      key={i}
                      className={`min-h-20 rounded-md border p-1.5 text-xs space-y-0.5 ${isToday ? "border-primary" : "border-border"}`}
                    >
                      <div className={`text-[11px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {cell.day}
                      </div>
                      {cell.entries.slice(0, 3).map((entry, idx) => (
                        <div
                          key={idx}
                          className="truncate rounded px-1 py-0.5 text-white"
                          style={{ backgroundColor: entry.lt?.color || "#6366f1" }}
                          title={`${entry.emp.firstName} ${entry.emp.lastName} — ${entry.lt?.name ?? "Leave"}`}
                        >
                          {entry.emp.firstName} {entry.emp.lastName?.[0] ?? ""}.
                        </div>
                      ))}
                      {cell.entries.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{cell.entries.length - 3} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Usage ---- */}
        <TabsContent value="usage" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved days by leave type — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              {usage.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No approved leaves in {year}</div>
              ) : (
                <div className="space-y-3">
                  {usage.map((u) => (
                    <div key={u.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-muted-foreground">{u.days} days</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(u.days / usageMax) * 100}%`, backgroundColor: u.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved days by employee — {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {balances.length === 0 || leaveTypes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3 sticky left-0 bg-muted/50 z-10">Employee</th>
                      {leaveTypes.map((lt) => (
                        <th key={lt.id} className="text-right font-medium px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: lt.color || "hsl(var(--primary))" }}
                            />
                            {lt.name}
                          </span>
                        </th>
                      ))}
                      <th className="text-right font-medium px-4 py-3 whitespace-nowrap">Other</th>
                      <th className="text-right font-medium px-4 py-3 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((row) => {
                      const e = row.employee;
                      const initials = `${e.firstName?.[0] ?? ""}${e.lastName?.[0] ?? ""}`.toUpperCase() || "?";
                      const total =
                        leaveTypes.reduce((s, lt) => s + (row.used[lt.id] ?? 0), 0) + row.otherUsed;
                      return (
                        <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3 sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={e.profileImageUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">{e.firstName} {e.lastName}</span>
                            </div>
                          </td>
                          {leaveTypes.map((lt) => {
                            const used = row.used[lt.id] ?? 0;
                            return (
                              <td key={lt.id} className="px-4 py-3 text-right whitespace-nowrap">
                                {used > 0 ? <span className="font-medium">{used}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {row.otherUsed > 0 ? row.otherUsed : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
