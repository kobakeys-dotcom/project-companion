/**
 * Public careers page — anyone can browse open jobs and apply.
 * No authentication required. RLS allows anonymous SELECT on open jobs
 * and anonymous INSERT into job_candidates with required fields.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, MapPin, Building2, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const sb: any = supabase;

interface JobRow {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  postedDate: string | null;
}

const applySchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  email: z.string().trim().email("Valid email required").max(160),
  phone: z.string().trim().max(40).optional(),
  coverLetter: z.string().trim().max(4000).optional(),
});
type ApplyForm = z.infer<typeof applySchema>;

function ApplyDialog({ job }: { job: JobRow }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", coverLetter: "" },
  });

  const submit = useMutation({
    mutationFn: async (v: ApplyForm) => {
      const { error } = await sb.from("job_candidates").insert({
        companyId: job.companyId,
        jobId: job.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || null,
        coverLetter: v.coverLetter || null,
        stage: "applied",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Application submitted", description: "We'll be in touch soon." });
      qc.invalidateQueries({ queryKey: ["careers:jobs"] });
      form.reset();
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed to apply", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Apply now</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for {job.title}</DialogTitle>
          <DialogDescription>Tell us a little about yourself.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem><FormLabel>First name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Last name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone (optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="coverLetter" render={({ field }) => (
              <FormItem><FormLabel>Cover letter (optional)</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit application
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CareersPage() {
  const { data: jobs = [], isLoading } = useQuery<JobRow[]>({
    queryKey: ["careers:jobs"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("postedDate", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as JobRow[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Open Positions</h1>
          <p className="text-muted-foreground">Find your next role with us.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No open roles right now</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((j) => (
              <Card key={j.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-xl">{j.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{j.employmentType.replace("_", " ")}</span>
                        {j.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                        {(j.salaryMin || j.salaryMax) && (
                          <Badge variant="secondary">
                            {j.salaryMin ? `$${j.salaryMin.toLocaleString()}` : ""}
                            {j.salaryMin && j.salaryMax ? " – " : ""}
                            {j.salaryMax ? `$${j.salaryMax.toLocaleString()}` : ""}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <ApplyDialog job={j} />
                  </div>
                </CardHeader>
                {(j.description || j.requirements) && (
                  <CardContent className="space-y-3">
                    {j.description && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">About the role</p>
                        <p className="text-sm whitespace-pre-line">{j.description}</p>
                      </div>
                    )}
                    {j.requirements && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Requirements</p>
                        <p className="text-sm whitespace-pre-line">{j.requirements}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
