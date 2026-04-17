/**
 * Manage biometric devices (ZKTeco / CrossChex compatible),
 * the PIN ↔ employee mapping, and recent raw punch logs.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Copy, Fingerprint, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

const sb: any = supabase;

interface Device {
  id: string;
  companyId: string;
  name: string;
  deviceKey: string;
  serialNumber: string | null;
  model: string | null;
  ipAddress: string | null;
  location: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

interface PinMap {
  id: string;
  deviceId: string | null;
  employeeId: string;
  pin: string;
}

interface RawLog {
  id: string;
  deviceId: string | null;
  pin: string | null;
  employeeId: string | null;
  statusCode: number;
  verifyMode: number | null;
  punchedAt: string;
  matched: boolean;
  errorMessage: string | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_LABEL: Record<number, string> = {
  0: "Check-in",
  1: "Check-out",
  2: "Break-out",
  3: "Break-in",
  4: "OT-in",
  5: "OT-out",
};

function genKey() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function BiometricDevicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", location: "", serialNumber: "", model: "", ipAddress: "",
  });

  const [pinOpen, setPinOpen] = useState(false);
  const [pinForm, setPinForm] = useState({ deviceId: "", employeeId: "", pin: "" });

  const webhookUrl = useMemo(
    () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-webhook`,
    [],
  );

  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["biometric_devices", user?.companyId],
    enabled: !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("biometric_devices")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await sb.from("employees").select("id,firstName,lastName").order("firstName");
      return data ?? [];
    },
  });

  const { data: pinMap = [] } = useQuery<PinMap[]>({
    queryKey: ["biometric_pin_map", user?.companyId],
    enabled: !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await sb.from("biometric_pin_map").select("*").order("pin");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rawLogs = [] } = useQuery<RawLog[]>({
    queryKey: ["biometric_raw_logs", user?.companyId],
    enabled: !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("biometric_raw_logs")
        .select("*")
        .order("punchedAt", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const createDevice = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      const { error } = await sb.from("biometric_devices").insert({
        companyId: user!.companyId,
        name: form.name.trim(),
        location: form.location.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        model: form.model.trim() || null,
        ipAddress: form.ipAddress.trim() || null,
        deviceKey: genKey(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Device created" });
      setOpen(false);
      setForm({ name: "", location: "", serialNumber: "", model: "", ipAddress: "" });
      qc.invalidateQueries({ queryKey: ["biometric_devices"] });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await sb.from("biometric_devices").update({ isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biometric_devices"] }),
  });

  const removeDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("biometric_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Device removed" });
      qc.invalidateQueries({ queryKey: ["biometric_devices"] });
    },
  });

  const createPin = useMutation({
    mutationFn: async () => {
      if (!pinForm.employeeId) throw new Error("Employee required");
      if (!pinForm.pin.trim()) throw new Error("PIN required");
      const { error } = await sb.from("biometric_pin_map").insert({
        companyId: user!.companyId,
        deviceId: pinForm.deviceId || null,
        employeeId: pinForm.employeeId,
        pin: pinForm.pin.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "PIN mapped" });
      setPinOpen(false);
      setPinForm({ deviceId: "", employeeId: "", pin: "" });
      qc.invalidateQueries({ queryKey: ["biometric_pin_map"] });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removePin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("biometric_pin_map").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biometric_pin_map"] }),
  });

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast({ title: "Copied" });
  };

  const empName = (id: string | null) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "—";
  };
  const devName = (id: string | null) =>
    devices.find((d) => d.id === id)?.name ?? (id ? "—" : "Any device");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Fingerprint className="h-7 w-7" /> Biometric Devices
        </h1>
        <p className="text-muted-foreground">
          ZKTeco / CrossChex compatible attendance terminals.
        </p>
      </div>

      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="pins">PIN Mapping ({pinMap.length})</TabsTrigger>
          <TabsTrigger value="logs">Raw Logs ({rawLogs.length})</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
        </TabsList>

        {/* DEVICES */}
        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Device</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New biometric device</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main entrance" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Serial number</Label>
                      <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="ZK1234567" />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="iClock580" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>IP address</Label>
                      <Input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="192.168.1.10" />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="HQ – Lobby" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createDevice.mutate()} disabled={createDevice.isPending}>
                    {createDevice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : devices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No devices registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {devices.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Fingerprint className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{d.name}</p>
                          <Badge variant={d.isActive ? "default" : "secondary"}>
                            {d.isActive ? "Active" : "Disabled"}
                          </Badge>
                          {d.model && <Badge variant="outline">{d.model}</Badge>}
                        </div>
                        {(d.location || d.ipAddress) && (
                          <p className="text-xs text-muted-foreground">
                            {[d.location, d.ipAddress].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          {d.serialNumber && (
                            <span className="text-muted-foreground">
                              SN: <code className="bg-muted px-1 py-0.5 rounded">{d.serialNumber}</code>
                            </span>
                          )}
                          <span className="text-muted-foreground">Key:</span>
                          <code className="bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">{d.deviceKey}</code>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(d.deviceKey)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {d.lastSeenAt && (
                          <p className="text-xs text-muted-foreground">
                            Last seen: {format(new Date(d.lastSeenAt), "MMM d, yyyy h:mm a")}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={d.isActive}
                        onCheckedChange={(v) => toggleActive.mutate({ id: d.id, isActive: v })}
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeDevice.mutate(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PIN MAP */}
        <TabsContent value="pins" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={pinOpen} onOpenChange={setPinOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Map PIN</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Map device PIN to employee</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Employee *</Label>
                    <Select value={pinForm.employeeId} onValueChange={(v) => setPinForm({ ...pinForm, employeeId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>PIN *</Label>
                    <Input value={pinForm.pin} onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value })} placeholder="1001" />
                  </div>
                  <div>
                    <Label>Device (optional — leave blank for any device)</Label>
                    <Select value={pinForm.deviceId || "any"} onValueChange={(v) => setPinForm({ ...pinForm, deviceId: v === "any" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any device</SelectItem>
                        {devices.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createPin.mutate()} disabled={createPin.isPending}>
                    {createPin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PIN</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pinMap.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No PIN mappings yet. Add one to let device punches resolve to employees.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pinMap.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell><code className="bg-muted px-2 py-0.5 rounded">{m.pin}</code></TableCell>
                        <TableCell>{empName(m.employeeId)}</TableCell>
                        <TableCell className="text-muted-foreground">{devName(m.deviceId)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => removePin.mutate(m.id)}>
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

        {/* RAW LOGS */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent punches</CardTitle>
              <CardDescription>Last 100 raw events received from devices.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No punches received yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rawLogs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(l.punchedAt), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-xs">{devName(l.deviceId)}</TableCell>
                        <TableCell><code className="text-xs">{l.pin ?? "—"}</code></TableCell>
                        <TableCell className="text-xs">{empName(l.employeeId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{STATUS_LABEL[l.statusCode] ?? `#${l.statusCode}`}</Badge>
                        </TableCell>
                        <TableCell>
                          {l.matched ? (
                            <span className="flex items-center gap-1 text-xs text-primary">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Matched
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-destructive" title={l.errorMessage ?? ""}>
                              <XCircle className="h-3.5 w-3.5" /> {l.errorMessage ?? "Unmatched"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOK */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>Webhook endpoint</CardTitle>
              <CardDescription>Configure your devices (or middleware) to POST punches here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded break-all">{webhookUrl}</code>
                <Button size="sm" variant="outline" onClick={() => copy(webhookUrl)}><Copy className="h-3 w-3" /></Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">{`POST ${webhookUrl}
Content-Type: application/json
x-device-sn: <serial>          // or x-device-key: <key>

{
  "deviceSerial": "ZK1234567",
  "punches": [
    {
      "pin": "1001",
      "statusCode": 0,            // 0=in 1=out 2=break-out 3=break-in 4=ot-in 5=ot-out
      "verifyMode": 1,            // 0=pwd 1=fp 15=face (optional)
      "punchedAt": "2026-04-17T08:00:00Z"
    }
  ]
}`}</pre>
              <p className="text-xs text-muted-foreground">
                Status codes follow ZKTeco convention. Each unmatched punch is still
                stored in <strong>Raw Logs</strong> so you can trace device issues.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
