import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Trash2, Pencil } from "lucide-react";
import type { Department, Employee } from "@shared/schema";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

const colorOptions = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

function EditDepartmentDialog({ department, onClose }: { department: Department; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: department.name,
      description: department.description || "",
      color: department.color || "#6366f1",
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      return await apiRequest("PATCH", `/api/departments/${department.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update department", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: DepartmentFormData) => {
    updateDepartment.mutate(data);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Department</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Engineering" data-testid="input-edit-dept-name" />
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
                    placeholder="What does this department do?"
                    data-testid="textarea-edit-dept-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`h-8 w-8 rounded-md transition-all ${
                          field.value === color ? "ring-2 ring-offset-2 ring-primary" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`edit-color-${color.replace("#", "")}`}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateDepartment.isPending} data-testid="button-save-dept">
              {updateDepartment.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function DepartmentCard({
  department,
  employees,
  onDelete,
}: {
  department: Department;
  employees: Employee[];
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const deptEmployees = employees.filter((e) => e.departmentId === department.id);

  return (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <Card className="hover-elevate" data-testid={`card-department-${department.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${department.color}20` }}
            >
              <Building2 className="h-6 w-6" style={{ color: department.color || "#6366f1" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold truncate">{department.name}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground"
                    onClick={() => setEditOpen(true)}
                    data-testid={`button-edit-${department.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground"
                    onClick={onDelete}
                    data-testid={`button-delete-${department.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {department.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {department.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {deptEmployees.slice(0, 4).map((emp) => (
                  <Avatar key={emp.id} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={emp.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {emp.firstName.charAt(0)}
                      {emp.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {deptEmployees.length > 4 && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    <span className="text-xs text-muted-foreground">+{deptEmployees.length - 4}</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {deptEmployees.length} member{deptEmployees.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    {editOpen && <EditDepartmentDialog department={department} onClose={() => setEditOpen(false)} />}
    </Dialog>
  );
}

function AddDepartmentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6366f1",
    },
  });

  const createDepartment = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      return await apiRequest("POST", "/api/departments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Department created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create department", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: DepartmentFormData) => {
    createDepartment.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-department">
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Engineering" data-testid="input-dept-name" />
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
                      placeholder="What does this department do?"
                      data-testid="textarea-dept-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`h-8 w-8 rounded-md transition-all ${
                            field.value === color ? "ring-2 ring-offset-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`color-${color.replace("#", "")}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDepartment.isPending} data-testid="button-submit-dept">
                {createDepartment.isPending ? "Creating..." : "Create Department"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentsPage() {
  const { toast } = useToast();

  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Department deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete department", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  if (departmentsLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-32 sm:w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Organize your team structure</p>
        </div>
        <AddDepartmentDialog />
      </div>

      {!departments || departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No departments yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Create departments to organize your team members effectively.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              employees={employees || []}
              onDelete={() => deleteDepartment.mutate(department.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
