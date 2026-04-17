import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  Trash2,
  Pencil,
} from "lucide-react";
import type { OnboardingTask, Employee } from "@shared/schema";
import { format, parseISO } from "date-fns";

const taskFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  order: z.number().default(0),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

const editTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
});

type EditTaskFormData = z.infer<typeof editTaskFormSchema>;

interface EmployeeOnboarding {
  employee: Employee;
  tasks: OnboardingTask[];
}

function EditTaskDialog({ task, onClose }: { task: OnboardingTask; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate || "",
      status: (task.status as EditTaskFormData["status"]) || "not_started",
    },
  });

  const updateTask = useMutation({
    mutationFn: async (data: EditTaskFormData) => {
      return await apiRequest("PATCH", `/api/onboarding/${task.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      toast({ title: "Task updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: EditTaskFormData) => {
    updateTask.mutate(data);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Task</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Complete HR paperwork" data-testid="input-edit-task-title" />
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
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Additional details about this task..."
                    data-testid="textarea-edit-task-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-edit-task-due-date" />
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
                    <SelectTrigger data-testid="select-edit-task-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTask.isPending} data-testid="button-save-task">
              {updateTask.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function OnboardingTaskItem({
  task,
  onComplete,
  onDelete,
}: {
  task: OnboardingTask;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "in_progress":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className={`h-5 w-5 ${getStatusColor(status)}`} />;
      case "in_progress":
        return <Clock className={`h-5 w-5 ${getStatusColor(status)}`} />;
      default:
        return <Circle className={`h-5 w-5 ${getStatusColor(status)}`} />;
    }
  };

  return (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <div className="flex items-center gap-3 p-3 rounded-lg border hover-elevate" data-testid={`task-${task.id}`}>
        <button
          onClick={onComplete}
          disabled={task.status === "completed"}
          className="shrink-0"
          data-testid={`button-complete-${task.id}`}
        >
          {getStatusIcon(task.status)}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
          )}
        </div>
        {task.dueDate && (
          <span className="text-xs text-muted-foreground shrink-0">
            <Calendar className="h-3 w-3 inline mr-1" />
            {format(parseISO(task.dueDate), "MMM d")}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => setEditOpen(true)}
          data-testid={`button-edit-${task.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={onDelete}
          data-testid={`button-delete-${task.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {editOpen && <EditTaskDialog task={task} onClose={() => setEditOpen(false)} />}
    </Dialog>
  );
}

function EmployeeOnboardingCard({
  data,
  onCompleteTask,
  onDeleteTask,
}: {
  data: EmployeeOnboarding;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const { employee, tasks } = data;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <AccordionItem value={employee.id} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={employee.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                {employee.firstName} {employee.lastName}
              </h3>
              <Badge variant="secondary">
                {completedCount}/{tasks.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
          </div>
          <div className="w-32">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pb-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No onboarding tasks assigned yet.
            </p>
          ) : (
            tasks.map((task) => (
              <OnboardingTaskItem
                key={task.id}
                task={task}
                onComplete={() => onCompleteTask(task.id)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AddTaskDialog({ employees }: { employees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      employeeId: "",
      title: "",
      description: "",
      dueDate: "",
      order: 0,
    },
  });

  const createTask = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return await apiRequest("POST", "/api/onboarding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      toast({ title: "Task created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create task", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    createTask.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-task">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Onboarding Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-employee">
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
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Complete HR paperwork" data-testid="input-task-title" />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional details about this task..."
                      data-testid="textarea-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-task-due-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending} data-testid="button-submit-task">
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function OnboardingPage() {
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<OnboardingTask[]>({
    queryKey: ["/api/onboarding"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/onboarding/${id}`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      toast({ title: "Task completed" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/onboarding/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      toast({ title: "Task deleted" });
    },
  });

  const employeeOnboardingData: EmployeeOnboarding[] = (employees || [])
    .map((employee) => ({
      employee,
      tasks: (tasks || []).filter((t) => t.employeeId === employee.id).sort((a, b) => (a.order || 0) - (b.order || 0)),
    }))
    .filter((data) => data.tasks.length > 0);

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress").length || 0;

  if (tasksLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-32 sm:w-40" />
        </div>
        <div className="space-y-3 sm:space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <Skeleton className="h-16 sm:h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track new hire progress</p>
        </div>
        <AddTaskDialog employees={employees || []} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <ClipboardList className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressTasks}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {employeeOnboardingData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No onboarding tasks</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Create onboarding tasks to help new employees get up to speed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {employeeOnboardingData.map((data) => (
            <EmployeeOnboardingCard
              key={data.employee.id}
              data={data}
              onCompleteTask={(taskId) => completeTask.mutate(taskId)}
              onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
