import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Megaphone, Plus, Send, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Audience = "all" | "department" | "project";

interface Announcement {
  id: string;
  companyId: string;
  title: string;
  body: string;
  audience: Audience;
  departmentId: string | null;
  projectId: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const sb: any = supabase;

async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await sb
    .from("announcements")
    .select("*")
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isManager = user?.role === "admin" || user?.role === "manager" || user?.role === "super_admin";

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: listAnnouncements,
  });
  const { data: departments = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/projects"] });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: "", body: "", audience: "all" as Audience,
    departmentId: "", projectId: "",
  });

  const reset = () => {
    setEditing(null);
    setForm({ title: "", body: "", audience: "all", departmentId: "", projectId: "" });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title, body: a.body, audience: a.audience,
      departmentId: a.departmentId ?? "", projectId: a.projectId ?? "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async ({ publish }: { publish: boolean }) => {
      if (!user?.companyId) throw new Error("No company");
      const payload: any = {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        departmentId: form.audience === "department" ? form.departmentId || null : null,
        projectId: form.audience === "project" ? form.projectId || null : null,
      };
      if (publish) payload.publishedAt = new Date().toISOString();

      if (editing) {
        const { error } = await sb.from("announcements").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        payload.companyId = user.companyId;
        payload.createdBy = user.id;
        const { error } = await sb.from("announcements").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.publish ? "Announcement published" : "Draft saved");
      setOpen(false); reset();
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("announcements")
        .update({ publishedAt: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Published");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("announcements").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const audienceLabel = (a: Announcement) => {
    if (a.audience === "all") return "Everyone";
    if (a.audience === "department")
      return `Dept: ${departments.find((d: any) => d.id === a.departmentId)?.name ?? "—"}`;
    return `Project: ${projects.find((p: any) => p.id === a.projectId)?.name ?? "—"}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Share company-wide news. Notifications are sent automatically when published.
          </p>
        </div>
        {isManager && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>
                <div>
                  <Label>Audience</Label>
                  <Select value={form.audience} onValueChange={(v: Audience) => setForm({ ...form, audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="department">A department</SelectItem>
                      <SelectItem value="project">A project / branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.audience === "department" && (
                  <div>
                    <Label>Department</Label>
                    <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.audience === "project" && (
                  <div>
                    <Label>Project / Branch</Label>
                    <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={!form.title || !form.body || save.isPending}
                  onClick={() => save.mutate({ publish: false })}
                >
                  Save draft
                </Button>
                <Button
                  disabled={!form.title || !form.body || save.isPending}
                  onClick={() => save.mutate({ publish: true })}
                >
                  <Send className="h-4 w-4 mr-1" /> Publish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && announcements.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No announcements yet.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    <Badge variant="outline">{audienceLabel(a)}</Badge>
                    {a.publishedAt
                      ? <Badge variant="secondary">Published {format(new Date(a.publishedAt), "PP")}</Badge>
                      : <Badge>Draft</Badge>}
                  </CardDescription>
                </div>
                {isManager && (
                  <div className="flex gap-1">
                    {!a.publishedAt && (
                      <Button size="icon" variant="ghost" onClick={() => publish.mutate(a.id)} title="Publish">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{a.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
