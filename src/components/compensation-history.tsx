import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, TrendingUp } from "lucide-react";

type Entry = {
  id: string;
  employeeId: string;
  effectiveDate: string;
  salary: number; // cents
  reason: string | null;
  approvedBy: string | null;
  createdAt: string;
};

export function CompensationHistory({
  employeeId,
  companyId,
  currency = "USD",
}: {
  employeeId: string;
  companyId: string;
  currency?: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [salary, setSalary] = useState("");
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  const queryKey = ["compensation_history", employeeId];

  const { data, isLoading, refetch } = useQuery<Entry[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compensation_history")
        .select("id, employeeId, effectiveDate, salary, reason, approvedBy, createdAt")
        .eq("employeeId", employeeId)
        .order("effectiveDate", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const cents = Math.round((parseFloat(salary) || 0) * 100);
      if (cents <= 0) throw new Error("Enter a valid salary");
      const { error } = await supabase.from("compensation_history").insert({
        companyId,
        employeeId,
        effectiveDate: date,
        salary: cents,
        reason: reason || null,
        approvedBy: approvedBy || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Compensation entry added" });
      setOpen(false);
      setSalary(""); setReason(""); setApprovedBy("");
      refetch();
    },
    onError: (err: Error) =>
      toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compensation_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Entry deleted" }); refetch(); },
    onError: (err: Error) =>
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" }),
  });

  const fmt = (cents: number) =>
    `${currency} ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Compensation History
          </CardTitle>
          <CardDescription>Track salary changes over time.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Compensation Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Salary ({currency})</Label>
                <Input
                  type="number" step="0.01" placeholder="5000.00"
                  value={salary} onChange={(e) => setSalary(e.target.value)}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  placeholder="Annual increment, promotion, …"
                  value={reason} onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <Label>Approved By</Label>
                <Input
                  placeholder="Manager name"
                  value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No compensation history yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective Date</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.effectiveDate}</TableCell>
                  <TableCell className="font-medium">{fmt(e.salary)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.reason ?? "—"}</TableCell>
                  <TableCell className="text-sm">{e.approvedBy ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(e.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
