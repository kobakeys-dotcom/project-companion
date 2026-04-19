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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Plus, UtensilsCrossed, Hotel, Wallet, Users, Trash2, Check } from "lucide-react";
import { format } from "date-fns";

type OutletType = "restaurant" | "guest_house" | "other";
type Distribution = "equal" | "weighted";
type PayoutStatus = "pending" | "paid";

interface Pool {
  id: string;
  companyId: string;
  outletName: string;
  outletType: OutletType;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  currency: string;
  distributionMethod: Distribution;
  notes: string | null;
  createdAt: string;
}

interface Share {
  id: string;
  poolId: string;
  employeeId: string;
  weight: number;
  shareAmount: number;
  payoutStatus: PayoutStatus;
  paidAt: string | null;
  notes: string | null;
}

interface EmployeeLite {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

const outletIcon = (t: OutletType) =>
  t === "restaurant" ? <UtensilsCrossed className="h-4 w-4" /> : t === "guest_house" ? <Hotel className="h-4 w-4" /> : <Wallet className="h-4 w-4" />;

export default function ServiceChargesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useCompanySettings();
  const companyId = user?.companyId ?? null;
  const companyCurrency = settings?.defaultCurrency || "USD";

  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<Pool[]>([]);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [form, setForm] = useState({
    outletName: "",
    outletType: "restaurant" as OutletType,
    periodStart: format(new Date(), "yyyy-MM-01"),
    periodEnd: format(new Date(), "yyyy-MM-dd"),
    totalAmount: "",
    currency: companyCurrency,
    distributionMethod: "equal" as Distribution,
    notes: "",
    employeeIds: [] as string[],
    weights: {} as Record<string, string>,
  });

  // Keep form currency synced when settings load / change.
  useEffect(() => {
    setForm((f) => ({ ...f, currency: companyCurrency }));
  }, [companyCurrency]);

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: poolsData }, { data: empData }] = await Promise.all([
      supabase
        .from("service_charge_pools" as any)
        .select("*")
        .eq("companyId", companyId)
        .order("periodStart", { ascending: false }),
      supabase
        .from("employees" as any)
        .select("id, firstName, lastName, jobTitle")
        .eq("companyId", companyId)
        .eq("employmentStatus", "active")
        .order("firstName"),
    ]);
    setPools((poolsData ?? []) as any);
    setEmployees((empData ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadShares = async (pool: Pool) => {
    setSelectedPool(pool);
    setSharesLoading(true);
    const { data } = await supabase
      .from("service_charge_shares" as any)
      .select("*")
      .eq("poolId", pool.id);
    setShares((data ?? []) as any);
    setSharesLoading(false);
  };

  const totalsByOutlet = useMemo(() => {
    const map = { restaurant: 0, guest_house: 0, other: 0 } as Record<OutletType, number>;
    for (const p of pools) map[p.outletType] += Number(p.totalAmount || 0);
    return map;
  }, [pools]);

  const handleCreate = async () => {
    if (!companyId) return;
    const total = parseFloat(form.totalAmount);
    if (!form.outletName || isNaN(total) || total <= 0 || form.employeeIds.length === 0) {
      toast({ title: "Missing info", description: "Outlet, total amount, and at least one employee are required.", variant: "destructive" });
      return;
    }

    const { data: pool, error: pErr } = await supabase
      .from("service_charge_pools" as any)
      .insert({
        companyId,
        outletName: form.outletName,
        outletType: form.outletType,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        totalAmount: total,
        currency: form.currency,
        distributionMethod: form.distributionMethod,
        notes: form.notes || null,
      } as any)
      .select()
      .single();

    if (pErr || !pool) {
      toast({ title: "Failed to create pool", description: pErr?.message, variant: "destructive" });
      return;
    }

    const weights = form.employeeIds.map((id) =>
      form.distributionMethod === "weighted" ? Math.max(parseFloat(form.weights[id] || "1"), 0.01) : 1,
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const shareRows = form.employeeIds.map((id, i) => ({
      poolId: (pool as any).id,
      companyId,
      employeeId: id,
      weight: weights[i],
      shareAmount: Number(((total * weights[i]) / totalWeight).toFixed(2)),
      payoutStatus: "pending" as const,
    }));

    const { error: sErr } = await supabase.from("service_charge_shares" as any).insert(shareRows as any);
    if (sErr) {
      toast({ title: "Pool created but shares failed", description: sErr.message, variant: "destructive" });
    } else {
      toast({ title: "Service charge pool created" });
    }

    setOpenCreate(false);
    setForm({
      outletName: "",
      outletType: "restaurant",
      periodStart: format(new Date(), "yyyy-MM-01"),
      periodEnd: format(new Date(), "yyyy-MM-dd"),
      totalAmount: "",
      currency: companyCurrency,
      distributionMethod: "equal",
      notes: "",
      employeeIds: [],
      weights: {},
    });
    loadAll();
  };

  const togglePaid = async (s: Share) => {
    const next: PayoutStatus = s.payoutStatus === "paid" ? "pending" : "paid";
    const { error } = await supabase
      .from("service_charge_shares" as any)
      .update({ payoutStatus: next, paidAt: next === "paid" ? new Date().toISOString() : null } as any)
      .eq("id", s.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    if (selectedPool) loadShares(selectedPool);
  };

  const deletePool = async (id: string) => {
    if (!confirm("Delete this pool and all its shares?")) return;
    const { error } = await supabase.from("service_charge_pools" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setSelectedPool(null);
    loadAll();
  };

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Charges</h1>
          <p className="text-muted-foreground">Pool service charges from restaurants & guest houses, then distribute to employees.</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Pool</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Service Charge Pool</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Outlet name</Label>
                <Input value={form.outletName} onChange={(e) => setForm({ ...form, outletName: e.target.value })} placeholder="e.g. Sunset Restaurant" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Outlet type</Label>
                <Select value={form.outletType} onValueChange={(v) => setForm({ ...form, outletType: v as OutletType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="guest_house">Guest House</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period start</Label>
                <Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
              </div>
              <div>
                <Label>Total amount</Label>
                <Input type="number" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} readOnly disabled className="bg-muted" />
              </div>
              <div className="col-span-2">
                <Label>Distribution method</Label>
                <Select value={form.distributionMethod} onValueChange={(v) => setForm({ ...form, distributionMethod: v as Distribution })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal split</SelectItem>
                    <SelectItem value="weighted">Weighted (custom weight per employee)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Assign employees</Label>
                <div className="border rounded-md max-h-56 overflow-y-auto p-2 space-y-1">
                  {employees.map((e) => {
                    const checked = form.employeeIds.includes(e.id);
                    return (
                      <div key={e.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(ev) => {
                            const next = ev.target.checked
                              ? [...form.employeeIds, e.id]
                              : form.employeeIds.filter((x) => x !== e.id);
                            setForm({ ...form, employeeIds: next });
                          }}
                        />
                        <span className="flex-1">{e.firstName} {e.lastName} <span className="text-muted-foreground">— {e.jobTitle}</span></span>
                        {checked && form.distributionMethod === "weighted" && (
                          <Input
                            className="w-20 h-7"
                            type="number"
                            step="0.1"
                            placeholder="1"
                            value={form.weights[e.id] ?? ""}
                            onChange={(ev) => setForm({ ...form, weights: { ...form.weights, [e.id]: ev.target.value } })}
                          />
                        )}
                      </div>
                    );
                  })}
                  {employees.length === 0 && <p className="text-sm text-muted-foreground">No active employees found.</p>}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Pool</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" />Restaurants</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalsByOutlet.restaurant.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Hotel className="h-4 w-4" />Guest Houses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalsByOutlet.guest_house.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" />Other</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalsByOutlet.other.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pools</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : pools.length === 0 ? (
            <p className="text-muted-foreground text-sm">No service charge pools yet. Create your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">{outletIcon(p.outletType)}<span className="font-medium">{p.outletName}</span></div>
                      <Badge variant="secondary" className="mt-1">{p.outletType.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(p.periodStart), "MMM d")} – {format(new Date(p.periodEnd), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-mono">{p.currency} {Number(p.totalAmount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline">{p.distributionMethod}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => loadShares(p)}><Users className="h-4 w-4 mr-1" />Shares</Button>
                      <Button size="sm" variant="ghost" onClick={() => deletePool(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPool} onOpenChange={(o) => !o && setSelectedPool(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPool && <>Shares — {selectedPool.outletName} ({format(new Date(selectedPool.periodStart), "MMM d")} – {format(new Date(selectedPool.periodEnd), "MMM d")})</>}
            </DialogTitle>
          </DialogHeader>
          {sharesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Share</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{empName(s.employeeId)}</TableCell>
                    <TableCell>{Number(s.weight).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{selectedPool?.currency} {Number(s.shareAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={s.payoutStatus === "paid" ? "default" : "secondary"}>{s.payoutStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => togglePaid(s)}>
                        <Check className="h-4 w-4 mr-1" />
                        Mark {s.payoutStatus === "paid" ? "pending" : "paid"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
