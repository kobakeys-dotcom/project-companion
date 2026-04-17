import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Target,
  Plus,
  Star,
  TrendingUp,
  CheckCircle,
  Clock,
  Award,
  Users,
  Pencil,
  Trash2,
  FileDown,
} from "lucide-react";
import type { Goal, PerformanceReview, Employee } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { downloadAppraisalPdf } from "@/lib/appraisal-pdf";

const goalFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  category: z.string().optional(),
});

const ratingField = z
  .union([z.number().min(1).max(5), z.nan()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

const reviewFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  reviewPeriodStart: z.string().min(1, "Start date is required"),
  reviewPeriodEnd: z.string().min(1, "End date is required"),
  productivityRating: ratingField,
  qualityRating: ratingField,
  teamworkRating: ratingField,
  communicationRating: ratingField,
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  goals: z.string().optional(),
  comments: z.string().optional(),
  status: z.enum(["draft", "submitted", "completed"]).default("draft"),
});

type GoalFormData = z.infer<typeof goalFormSchema>;
type ReviewFormData = z.infer<typeof reviewFormSchema>;

const editGoalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "cancelled"]),
  progress: z.number().min(0).max(100),
});

type EditGoalFormData = z.infer<typeof editGoalFormSchema>;

const statusConfig = {
  not_started: { label: "Not Started", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

const reviewStatusConfig = {
  draft: { label: "Draft", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

function avgRating(...vals: Array<number | null | undefined>): number | undefined {
  const nums = vals.filter((v): v is number => typeof v === "number" && v > 0);
  if (!nums.length) return undefined;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function AddGoalDialog({ employees }: { employees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      employeeId: "",
      title: "",
      description: "",
      targetDate: "",
      category: "",
    },
  });

  const createGoal = useMutation({
    mutationFn: async (data: GoalFormData) => {
      return await apiRequest("POST", "/api/goals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal created successfully" });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create goal", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-goal">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createGoal.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-goal-employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input data-testid="input-goal-title" placeholder="Enter goal title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea data-testid="textarea-goal-description" placeholder="Describe the goal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-goal-target-date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input data-testid="input-goal-category" placeholder="e.g., Skills, Project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createGoal.isPending} data-testid="button-submit-goal">
              {createGoal.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RatingStars({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? undefined : n)}
          className="p-0.5"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              value && n <= value
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground w-10">
        {value ? `${value}/5` : "—"}
      </span>
    </div>
  );
}

function ReviewDialog({
  employees,
  review,
  open,
  onOpenChange,
}: {
  employees: Employee[];
  review?: PerformanceReview | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const isEdit = !!review;

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      employeeId: review?.employeeId ?? "",
      reviewPeriodStart: review?.reviewPeriodStart ?? "",
      reviewPeriodEnd: review?.reviewPeriodEnd ?? "",
      productivityRating: review?.productivityRating ?? undefined,
      qualityRating: review?.qualityRating ?? undefined,
      teamworkRating: review?.teamworkRating ?? undefined,
      communicationRating: review?.communicationRating ?? undefined,
      strengths: review?.strengths ?? "",
      improvements: review?.improvements ?? "",
      goals: review?.goals ?? "",
      comments: review?.comments ?? "",
      status: (review?.status as ReviewFormData["status"]) ?? "draft",
    },
  });

  const watched = form.watch();
  const computedOverall = avgRating(
    watched.productivityRating,
    watched.qualityRating,
    watched.teamworkRating,
    watched.communicationRating,
  );

  const saveReview = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      const payload = {
        ...data,
        overallRating: computedOverall ?? null,
        reviewDate: data.status !== "draft" ? new Date().toISOString().slice(0, 10) : null,
      };
      if (isEdit && review) {
        return await apiRequest("PATCH", `/api/reviews/${review.id}`, payload);
      }
      return await apiRequest("POST", "/api/reviews", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: isEdit ? "Review updated" : "Performance review created" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save review",
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Performance Appraisal" : "New Performance Appraisal"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => saveReview.mutate(d))}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                    <FormControl>
                      <SelectTrigger data-testid="select-review-employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reviewPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-review-start" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reviewPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period End</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-review-end" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Competency Ratings</h4>
                <Badge variant="outline" className="font-mono">
                  Overall: {computedOverall ? `${computedOverall}/5` : "—"}
                </Badge>
              </div>
              {([
                ["productivityRating", "Productivity"],
                ["qualityRating", "Quality of Work"],
                ["teamworkRating", "Teamwork"],
                ["communicationRating", "Communication"],
              ] as const).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 space-y-0">
                      <FormLabel className="text-sm font-normal">{label}</FormLabel>
                      <FormControl>
                        <RatingStars
                          value={field.value as number | undefined}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strengths</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-strengths"
                      placeholder="Key strengths observed"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="improvements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Areas for Improvement</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-improvement"
                      placeholder="Areas to focus on"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goals & Development Plan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Goals for the next period"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Comments</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveReview.isPending}
                data-testid="button-submit-review"
              >
                {saveReview.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Appraisal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditGoalDialog({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<EditGoalFormData>({
    resolver: zodResolver(editGoalFormSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description || "",
      targetDate: goal.targetDate || "",
      category: goal.category || "",
      status: (goal.status as EditGoalFormData["status"]) || "not_started",
      progress: goal.progress || 0,
    },
  });

  const updateGoal = useMutation({
    mutationFn: async (data: EditGoalFormData) => {
      return await apiRequest("PATCH", `/api/goals/${goal.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update goal", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Goal</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => updateGoal.mutate(d))} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-edit-goal-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} data-testid="textarea-edit-goal-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-edit-goal-target-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-goal-category" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-goal-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid="input-edit-goal-progress"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateGoal.isPending} data-testid="button-save-goal">
              {updateGoal.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function GoalCard({ goal, employee, onEdit, onDelete }: { goal: Goal; employee?: Employee; onEdit: () => void; onDelete: () => void }) {
  const config = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.not_started;

  return (
    <Card className="hover-elevate" data-testid={`card-goal-${goal.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{goal.title}</h3>
            {employee && (
              <p className="text-sm text-muted-foreground">
                {employee.firstName} {employee.lastName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={config.color}>{config.label}</Badge>
            <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-goal-${goal.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-goal-${goal.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {goal.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{goal.description}</p>
        )}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress || 0}%</span>
          </div>
          <Progress value={goal.progress || 0} className="h-2" />
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          {goal.targetDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(parseISO(goal.targetDate), "MMM d, yyyy")}</span>
            </div>
          )}
          {goal.category && <Badge variant="outline">{goal.category}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformancePage() {
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const { toast } = useToast();

  const { data: goals, isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery<PerformanceReview[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete goal", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const employeeMap = new Map(employees?.map((e) => [e.id, e]) || []);

  const completedGoals = goals?.filter((g) => g.status === "completed").length || 0;
  const inProgressGoals = goals?.filter((g) => g.status === "in_progress").length || 0;
  const avgProgress = goals?.length
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Performance</h1>
          <p className="text-muted-foreground">Track goals and performance reviews</p>
        </div>
        <div className="flex gap-2">
          {!loadingEmployees && employees && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditReview(null);
                  setReviewOpen(true);
                }}
                data-testid="button-add-review"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appraisal
              </Button>
              <AddGoalDialog employees={employees} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-goals">
                {goals?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-completed-goals">
                {completedGoals}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600" data-testid="text-in-progress">
                {inProgressGoals}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-progress">
                {avgProgress}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          {loadingGoals ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !goals?.length ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground" data-testid="text-no-goals">
                No goals yet. Create your first goal to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  employee={employeeMap.get(goal.employeeId)}
                  onEdit={() => setEditGoal(goal)}
                  onDelete={() => deleteGoal.mutate(goal.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {loadingReviews ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !reviews?.length ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground" data-testid="text-no-reviews">
                No performance reviews yet. Create your first review.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const employee = employeeMap.get(review.employeeId);
                const config =
                  reviewStatusConfig[review.status as keyof typeof reviewStatusConfig] ||
                  reviewStatusConfig.draft;
                return (
                  <Card
                    key={review.id}
                    className="hover-elevate"
                    data-testid={`card-review-${review.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-medium">
                            {employee
                              ? `${employee.firstName} ${employee.lastName}`
                              : "Unknown Employee"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Period: {format(parseISO(review.reviewPeriodStart), "MMM d")} –{" "}
                            {format(parseISO(review.reviewPeriodEnd), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {review.overallRating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{review.overallRating}/5</span>
                            </div>
                          )}
                          <Badge className={config.color}>{config.label}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditReview(review);
                              setReviewOpen(true);
                            }}
                            data-testid={`button-edit-review-${review.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              employee &&
                              downloadAppraisalPdf(review as any, employee as any)
                            }
                            disabled={!employee}
                            data-testid={`button-pdf-review-${review.id}`}
                            title="Download PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {review.strengths && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-green-600">Strengths</p>
                          <p className="text-sm text-muted-foreground">{review.strengths}</p>
                        </div>
                      )}
                      {review.improvements && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-orange-600">
                            Areas for Improvement
                          </p>
                          <p className="text-sm text-muted-foreground">{review.improvements}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editGoal} onOpenChange={(open) => !open && setEditGoal(null)}>
        {editGoal && <EditGoalDialog goal={editGoal} onClose={() => setEditGoal(null)} />}
      </Dialog>

      {employees && (
        <ReviewDialog
          employees={employees}
          review={editReview}
          open={reviewOpen}
          onOpenChange={(o) => {
            setReviewOpen(o);
            if (!o) setEditReview(null);
          }}
        />
      )}
    </div>
  );
}
