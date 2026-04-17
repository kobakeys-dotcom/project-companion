import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Receipt,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Settings,
  Filter,
  List,
} from "lucide-react";
import type { Expense, Employee, CompanySettings, ExpenseType } from "@shared/schema";
import { format, parseISO } from "date-fns";

// Expense Type Form Schema
const expenseTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  isActive: z.boolean().default(true),
});

type ExpenseTypeFormData = z.infer<typeof expenseTypeFormSchema>;

// Expense Form Schema
const expenseFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  expenseTypeId: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  expenseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

// Default colors for expense types
const defaultColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

// Expense Type Management Dialog
function ManageExpenseTypeDialog({ expenseType, onClose }: { expenseType?: ExpenseType; onClose: () => void }) {
  const { toast } = useToast();
  const isEditing = !!expenseType;

  const form = useForm<ExpenseTypeFormData>({
    resolver: zodResolver(expenseTypeFormSchema),
    defaultValues: {
      name: expenseType?.name || "",
      description: expenseType?.description || "",
      color: expenseType?.color || defaultColors[Math.floor(Math.random() * defaultColors.length)],
      isActive: expenseType?.isActive ?? true,
    },
  });

  const createExpenseType = useMutation({
    mutationFn: async (data: ExpenseTypeFormData) => {
      return await apiRequest("POST", "/api/expense-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-types"] });
      toast({ title: "Expense type created" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create expense type", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const updateExpenseType = useMutation({
    mutationFn: async (data: ExpenseTypeFormData) => {
      return await apiRequest("PATCH", `/api/expense-types/${expenseType!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-types"] });
      toast({ title: "Expense type updated" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update expense type", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: ExpenseTypeFormData) => {
    if (isEditing) {
      updateExpenseType.mutate(data);
    } else {
      createExpenseType.mutate(data);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Expense Type" : "Create Expense Type"}</DialogTitle>
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
                  <Input {...field} placeholder="e.g., Travel, Meals, Equipment" data-testid="input-expense-type-name" />
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
                  <Textarea {...field} placeholder="Description of this expense type" data-testid="textarea-expense-type-description" />
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
                  <div className="flex items-center gap-2">
                    <Input type="color" {...field} className="w-16 h-10 p-1 cursor-pointer" data-testid="input-expense-type-color" />
                    <span className="text-sm text-muted-foreground">{field.value}</span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription className="text-sm">Allow new expenses to use this type</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-expense-type-active" />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createExpenseType.isPending || updateExpenseType.isPending} data-testid="button-save-expense-type">
              {createExpenseType.isPending || updateExpenseType.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// Submit Expense Dialog
function SubmitExpenseDialog({ employees, expenseTypes }: { employees: Employee[]; expenseTypes: ExpenseType[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });
  const currency = settings?.defaultCurrency || "USD";

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      employeeId: "",
      expenseTypeId: "",
      amount: 0,
      description: "",
      expenseDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      return await apiRequest("POST", "/api/expenses", {
        ...data,
        amount: Math.round(data.amount * 100),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense submitted successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit expense", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const activeExpenseTypes = expenseTypes.filter(t => t.isActive);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-submit-expense">
          <Plus className="h-4 w-4 mr-2" />
          Submit Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createExpense.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-employee">
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
              name="expenseTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-type">
                        <SelectValue placeholder="Select expense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeExpenseTypes.length === 0 ? (
                        <SelectItem value="none" disabled>No expense types available</SelectItem>
                      ) : (
                        activeExpenseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ({currency})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-expense-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expense-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief description" data-testid="input-expense-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." data-testid="textarea-expense-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createExpense.isPending} data-testid="button-create-expense">
                {createExpense.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [editingExpenseType, setEditingExpenseType] = useState<ExpenseType | null>(null);
  const [showExpenseTypeDialog, setShowExpenseTypeDialog] = useState(false);

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: expenseTypes, isLoading: typesLoading } = useQuery<ExpenseType[]>({
    queryKey: ["/api/expense-types"],
  });

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.defaultCurrency || "USD";

  const formatCurrency = (dollars: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(dollars);
    } catch {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
    }
  };

  const updateExpenseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/expenses/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update expense", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete expense", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteExpenseType = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/expense-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-types"] });
      toast({ title: "Expense type deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete expense type", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const getEmployeeById = (id: string) => employees?.find((e) => e.id === id);
  const getExpenseTypeById = (id: string | null) => expenseTypes?.find((t) => t.id === id);

  // Apply filters
  const filteredExpenses = (expenses || []).filter((expense) => {
    const typeMatch = selectedTypeFilter === "all" || expense.expenseTypeId === selectedTypeFilter;
    const statusMatch = selectedStatusFilter === "all" || expense.status === selectedStatusFilter;
    return typeMatch && statusMatch;
  });

  // Calculate totals by expense type
  const totalsByType = (expenseTypes || []).map((type) => {
    const typeExpenses = (expenses || []).filter((e) => e.expenseTypeId === type.id);
    const total = typeExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { type, total, count: typeExpenses.length };
  });

  // Calculate overall totals
  const totalPending = (expenses || []).filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);
  const totalApproved = (expenses || []).filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const isLoading = expensesLoading || typesLoading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <Skeleton className="h-14 sm:h-16 w-full" />
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage expense claims and reimbursements</p>
        </div>
        <SubmitExpenseDialog employees={employees || []} expenseTypes={expenseTypes || []} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(totalPending)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(totalApproved)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-purple-500/10">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{(expenses || []).length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Claims</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10">
              <List className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{(expenseTypes || []).length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Expense Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses" data-testid="tab-expenses">
            <Receipt className="h-4 w-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="types" data-testid="tab-expense-types">
            <Settings className="h-4 w-4 mr-2" />
            Manage Types
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="filter-expense-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {(expenseTypes || []).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="filter-expense-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="reimbursed">Reimbursed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto text-sm text-muted-foreground">
                  Filtered Total: <span className="font-semibold text-foreground">{formatCurrency(totalFiltered)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals by Type */}
          {totalsByType.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {totalsByType.map(({ type, total, count }) => (
                <Card key={type.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedTypeFilter(type.id)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                      <span className="text-sm font-medium truncate">{type.name}</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(total)}</p>
                    <p className="text-xs text-muted-foreground">{count} expense{count !== 1 ? "s" : ""}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Claims ({filteredExpenses.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No expenses found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((expense) => {
                        const employee = getEmployeeById(expense.employeeId);
                        const expenseType = getExpenseTypeById(expense.expenseTypeId);
                        return (
                          <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                            <TableCell className="whitespace-nowrap">
                              {expense.expenseDate ? format(parseISO(expense.expenseDate), "MMM d, yyyy") : "-"}
                            </TableCell>
                            <TableCell>
                              {employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}
                            </TableCell>
                            <TableCell>
                              {expenseType ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expenseType.color }} />
                                  <span>{expenseType.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  expense.status === "approved" ? "default" :
                                  expense.status === "rejected" ? "destructive" :
                                  expense.status === "reimbursed" ? "secondary" : "outline"
                                }
                              >
                                {expense.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`expense-actions-${expense.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {expense.status === "pending" && (
                                    <>
                                      <DropdownMenuItem onClick={() => updateExpenseStatus.mutate({ id: expense.id, status: "approved" })}>
                                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateExpenseStatus.mutate({ id: expense.id, status: "rejected" })}>
                                        <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                        Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {expense.status === "approved" && (
                                    <DropdownMenuItem onClick={() => updateExpenseStatus.mutate({ id: expense.id, status: "reimbursed" })}>
                                      <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                                      Mark Reimbursed
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => deleteExpense.mutate(expense.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expense Types</CardTitle>
              <Button onClick={() => setShowExpenseTypeDialog(true)} data-testid="button-add-expense-type">
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expenseTypes || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No expense types defined. Click "Add Type" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (expenseTypes || []).map((type) => {
                        const typeStats = totalsByType.find((t) => t.type.id === type.id);
                        return (
                          <TableRow key={type.id} data-testid={`expense-type-row-${type.id}`}>
                            <TableCell>
                              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: type.color }} />
                            </TableCell>
                            <TableCell className="font-medium">{type.name}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {type.description || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={type.isActive ? "default" : "secondary"}>
                                {type.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{typeStats?.count || 0}</TableCell>
                            <TableCell>{formatCurrency(typeStats?.total || 0)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`expense-type-actions-${type.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingExpenseType(type)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteExpenseType.mutate(type.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Type Dialog */}
      <Dialog open={showExpenseTypeDialog || !!editingExpenseType} onOpenChange={(open) => {
        if (!open) {
          setShowExpenseTypeDialog(false);
          setEditingExpenseType(null);
        }
      }}>
        <ManageExpenseTypeDialog
          expenseType={editingExpenseType || undefined}
          onClose={() => {
            setShowExpenseTypeDialog(false);
            setEditingExpenseType(null);
          }}
        />
      </Dialog>
    </div>
  );
}
