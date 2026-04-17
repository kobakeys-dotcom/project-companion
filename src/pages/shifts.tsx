/**
 * Shifts & Daily Roster.
 * - Manage shift templates (name, time window, color, overnight flag).
 * - Weekly calendar grid: rows = employees, columns = days.
 *   Click a cell to assign / change / clear the shift for that day.
 *   "Bulk assign" applies one shift to a set of employees over a date range
 *   (skipping the days you opt out of).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, Users, Copy } from "lucide-react";
import {
  format, addDays, startOfWeek, parseISO, isSameDay, eachDayOfInterval,
} from "date-fns";

const sb: any = supabase;

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
  isOvernight: boolean;
}
interface Assignment {
  id: string;
  shiftId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
}
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
}

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ShiftsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // ---------- Shift templates ----------
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["shifts", user?.companyId],
    enabled: !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await sb.from("shifts").select("*").order("startTime");
      if (error) throw error;
      return data || [];
    },
  });

  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: "", startTime: "09:00", endTime: "17:00",
    color: "#6366f1", isOvernight: false,
  });

  const createShift = useMutation({
    mutationFn: async () => {
      if (!shiftForm.name.trim()) throw new Error("Name required");
      const { error } = await sb.from("shifts").insert({
        companyId: user!.companyId,
        name: shiftForm.name.trim(),
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        color: shiftForm.color,
        isOvernight: shiftForm.isOvernight,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      setShiftOpen(false);
      setShiftForm({ name: "", startTime: "09:00", endTime: "17:00", color: "#6366f1", isOvernight: false });
      toast({ title: "Shift created" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteShift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });

  // ---------- Employees ----------
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await sb.from("employees")
        .select("id,firstName,lastName,jobTitle")
        .order("firstName");
      return data ?? [];
    },
  });

  // ---------- Assignments for the visible week ----------
  const weekStartStr = ymd(weekStart);
  const weekEndStr = ymd(addDays(weekStart, 6));

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["shift_assignments", weekStartStr, weekEndStr],
    queryFn: async () => {
      const { data, error } = await sb
        .from("shift_assignments")
        .select("id, shiftId, employeeId, date")
        .gte("date", weekStartStr)
        .lte("date", weekEndStr);
      if (error) throw error;
      return data || [];
    },
  });

  const assignFor = (empId: string, day: Date) =>
    assignments.find((a) => a.employeeId === empId && isSameDay(parseISO(a.date), day));

  // ---------- Cell mutations ----------
  const setCell = useMutation({
    mutationFn: async ({
      employeeId, date, shiftId, existingId,
    }: { employeeId: string; date: string; shiftId: string | null; existingId?: string }) => {
      if (shiftId === null) {
        if (existingId) {
          const { error } = await sb.from("shift_assignments").delete().eq("id", existingId);
          if (error) throw error;
        }
        return;
      }
      if (existingId) {
        const { error } = await sb.from("shift_assignments").update({ shiftId }).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await sb.from("shift_assignments").insert({
          companyId: user!.companyId, employeeId, date, shiftId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift_assignments"] }),
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // ---------- Bulk assign ----------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({
    shiftId: "", from: ymd(weekStart), to: ymd(addDays(weekStart, 6)),
    employeeIds: [] as string[],
    days: [true, true, true, true, true, false, false], // Mon-Sun
  });

  // ---------- Copy week ----------
  const copyWeek = useMutation({
    mutationFn: async (direction: "next" | "prev") => {
      if (!assignments.length) throw new Error("Current week is empty — nothing to copy");
      const offsetDays = direction === "next" ? 7 : -7;
      const rows = assignments.map((a) => ({
        companyId: user!.companyId,
        employeeId: a.employeeId,
        shiftId: a.shiftId,
        date: ymd(addDays(parseISO(a.date), offsetDays)),
      }));
      const { error } = await sb
        .from("shift_assignments")
        .upsert(rows, { onConflict: "employeeId,date" });
      if (error) throw error;
      return { count: rows.length, direction };
    },
    onSuccess: ({ count, direction }) => {
      toast({ title: `Copied ${count} shifts to ${direction === "next" ? "next" : "previous"} week` });
      qc.invalidateQueries({ queryKey: ["shift_assignments"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const bulkAssign = useMutation({
    mutationFn: async () => {
      if (!bulk.shiftId) throw new Error("Pick a shift");
      if (!bulk.employeeIds.length) throw new Error("Pick at least one employee");
      const range = eachDayOfInterval({
        start: parseISO(bulk.from), end: parseISO(bulk.to),
      });
      const rows = [];
      for (const day of range) {
        // getDay: 0=Sun..6=Sat -> map to Mon=0..Sun=6
        const idx = (day.getDay() + 6) % 7;
        if (!bulk.days[idx]) continue;
        for (const empId of bulk.employeeIds) {
          rows.push({
            companyId: user!.companyId,
            employeeId: empId,
            shiftId: bulk.shiftId,
            date: ymd(day),
          });
        }
      }
      if (!rows.length) throw new Error("Nothing to assign with these settings");
      const { error } = await sb
        .from("shift_assignments")
        .upsert(rows, { onConflict: "employeeId,date" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast({ title: `Assigned ${n} shifts` });
      setBulkOpen(false);
      qc.invalidateQueries({ queryKey: ["shift_assignments"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" /> Shifts &amp; Roster
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage shift templates and the daily schedule per employee.
          </p>
        </div>
      </div>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster"><CalendarDays className="h-4 w-4 mr-2" />Weekly roster</TabsTrigger>
          <TabsTrigger value="templates">Shift templates</TabsTrigger>
        </TabsList>

        {/* ---------------- ROSTER ---------------- */}
        <TabsContent value="roster" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-medium min-w-56 text-center">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </div>
              <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => copyWeek.mutate("next")}
                disabled={copyWeek.isPending || !assignments.length}
                title="Duplicate this week's roster onto next week"
              >
                <Copy className="h-4 w-4 mr-2" /> Copy to next week
              </Button>
              <Button onClick={() => setBulkOpen(true)} disabled={!shifts.length || !employees.length}>
                <Users className="h-4 w-4 mr-2" /> Bulk assign
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56 sticky left-0 bg-background z-10">Employee</TableHead>
                    {days.map((d, i) => (
                      <TableHead key={i} className="text-center min-w-28">
                        <div className="text-xs text-muted-foreground">{DOW[i]}</div>
                        <div>{format(d, "MMM d")}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No employees yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div className="font-medium">{e.firstName} {e.lastName}</div>
                          {e.jobTitle && <div className="text-xs text-muted-foreground">{e.jobTitle}</div>}
                        </TableCell>
                        {days.map((d) => {
                          const a = assignFor(e.id, d);
                          const sh = a && shifts.find((s) => s.id === a.shiftId);
                          return (
                            <TableCell key={d.toISOString()} className="text-center p-1">
                              <CellPicker
                                shifts={shifts}
                                current={sh}
                                onPick={(shiftId) =>
                                  setCell.mutate({
                                    employeeId: e.id,
                                    date: ymd(d),
                                    shiftId,
                                    existingId: a?.id,
                                  })
                                }
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- TEMPLATES ---------------- */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShiftOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New shift
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Overnight</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No shifts yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    shifts.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <span className="inline-block h-3 w-3 rounded-full mr-2 align-middle"
                                style={{ background: s.color }} />
                          {s.name}
                        </TableCell>
                        <TableCell>{s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}</TableCell>
                        <TableCell>
                          {s.isOvernight && <Badge variant="secondary">Overnight</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => deleteShift.mutate(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- New shift dialog ---------- */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New shift template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="Morning" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <Input type="color" value={shiftForm.color} onChange={(e) => setShiftForm({ ...shiftForm, color: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="font-medium">Overnight shift</Label>
                <p className="text-xs text-muted-foreground">End time is on the following day (e.g. 22:00 → 06:00).</p>
              </div>
              <Switch checked={shiftForm.isOvernight} onCheckedChange={(v) => setShiftForm({ ...shiftForm, isOvernight: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftOpen(false)}>Cancel</Button>
            <Button onClick={() => createShift.mutate()} disabled={!shiftForm.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Bulk assign dialog ---------- */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bulk assign shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Shift</Label>
              <Select value={bulk.shiftId} onValueChange={(v) => setBulk({ ...bulk, shiftId: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a shift" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.startTime?.slice(0, 5)}–{s.endTime?.slice(0, 5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From</Label>
                <Input type="date" value={bulk.from} onChange={(e) => setBulk({ ...bulk, from: e.target.value })} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={bulk.to} onChange={(e) => setBulk({ ...bulk, to: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Days of week</Label>
              <div className="flex gap-1 mt-1">
                {DOW.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const next = [...bulk.days];
                      next[i] = !next[i];
                      setBulk({ ...bulk, days: next });
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium border ${
                      bulk.days[i] ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Employees</Label>
              <div className="mt-1 max-h-48 overflow-auto border rounded-md p-2 space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium border-b pb-1 mb-1">
                  <Checkbox
                    checked={bulk.employeeIds.length === employees.length && employees.length > 0}
                    onCheckedChange={(v) =>
                      setBulk({ ...bulk, employeeIds: v ? employees.map((e) => e.id) : [] })
                    }
                  />
                  Select all
                </label>
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={bulk.employeeIds.includes(e.id)}
                      onCheckedChange={(v) =>
                        setBulk({
                          ...bulk,
                          employeeIds: v
                            ? [...bulk.employeeIds, e.id]
                            : bulk.employeeIds.filter((x) => x !== e.id),
                        })
                      }
                    />
                    {e.firstName} {e.lastName}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={() => bulkAssign.mutate()} disabled={bulkAssign.isPending}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inline cell picker: shows the current shift chip; clicking opens a popover
 *  with all shift templates + a "Clear" button. */
function CellPicker({
  shifts, current, onPick,
}: {
  shifts: Shift[];
  current: Shift | undefined;
  onPick: (shiftId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {current ? (
          <button
            className="w-full rounded-md px-2 py-1 text-xs font-medium text-white"
            style={{ background: current.color }}
            title={`${current.name} • ${current.startTime?.slice(0,5)}–${current.endTime?.slice(0,5)}${current.isOvernight ? " (overnight)" : ""}`}
          >
            {current.name}
            <div className="text-[10px] opacity-90 font-normal">
              {current.startTime?.slice(0,5)}–{current.endTime?.slice(0,5)}
            </div>
          </button>
        ) : (
          <button className="w-full rounded-md border border-dashed py-2 text-xs text-muted-foreground hover:bg-muted">
            +
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="text-xs text-muted-foreground px-2 py-1">Pick a shift</div>
        {shifts.map((s) => (
          <button
            key={s.id}
            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
            onClick={() => { onPick(s.id); setOpen(false); }}
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="flex-1">{s.name}</span>
            <span className="text-xs text-muted-foreground">
              {s.startTime?.slice(0, 5)}
            </span>
          </button>
        ))}
        {current && (
          <>
            <div className="border-t my-1" />
            <button
              className="w-full text-left px-2 py-1.5 rounded hover:bg-destructive/10 text-sm text-destructive flex items-center gap-2"
              onClick={() => { onPick(null); setOpen(false); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
