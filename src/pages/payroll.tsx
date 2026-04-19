import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Calendar,
  Users,
  CreditCard,
  Pencil,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import type { PayrollRecord, Employee, CompanySettings } from "@shared/schema";
import { format, parseISO } from "date-fns";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const payrollFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  payPeriodStart: z.string().min(1, "Start date is required"),
  payPeriodEnd: z.string().min(1, "End date is required"),
  month: z.string().min(1, "Month is required"),
  baseSalary: z.number().min(0, "Monthly salary must be positive"),
  overtimeHours: z.number().min(0).default(0),
  overtimeRate: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  deductionNotes: z.string().optional(),
});

type PayrollFormData = z.infer<typeof payrollFormSchema>;

const editPayrollFormSchema = z.object({
  payPeriodStart: z.string().min(1, "Start date is required"),
  payPeriodEnd: z.string().min(1, "End date is required"),
  month: z.string().min(1, "Month is required"),
  baseSalary: z.number().min(0, "Monthly salary must be positive"),
  overtimeHours: z.number().min(0).default(0),
  overtimeRate: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  deductionNotes: z.string().optional(),
});

type EditPayrollFormData = z.infer<typeof editPayrollFormSchema>;

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(cents / 100);
  } catch {
    return `${currencyCode} ${(cents / 100).toFixed(2)}`;
  }
}

const MONTH_INDEX: Record<string, number> = MONTHS.reduce(
  (acc, m, i) => ({ ...acc, [m]: i }),
  {} as Record<string, number>,
);

/** Resolve the YYYY-MM key used by deductions.applyToPayrollMonth from a payroll record. */
function payrollMonthKey(monthName?: string | null, periodStart?: string | null): string | null {
  if (!monthName || !(monthName in MONTH_INDEX)) return null;
  const mm = String(MONTH_INDEX[monthName] + 1).padStart(2, "0");
  let year: number | null = null;
  if (periodStart) {
    const y = Number(periodStart.slice(0, 4));
    if (Number.isFinite(y)) year = y;
  }
  if (!year) year = new Date().getFullYear();
  return `${year}-${mm}`;
}

interface DeductionRow {
  id: string;
  employeeId: string;
  amount: number; // numeric in DB (whole units)
  currency: string;
  description: string;
  deductionType: string;
  status: string;
  applyToPayrollMonth: string | null;
}

/** Load approved/deducted deductions for the company and group them by employee + YYYY-MM. */
function useApprovedDeductions() {
  return useQuery({
    queryKey: ["deductions", "approved-for-payroll"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deductions")
        .select("id, employeeId, amount, currency, description, deductionType, status, applyToPayrollMonth")
        .in("status", ["approved", "deducted"]);
      if (error) throw new Error(error.message);
      return (data ?? []) as DeductionRow[];
    },
  });
}

function groupDeductions(rows: DeductionRow[] | undefined) {
  const map = new Map<string, DeductionRow[]>();
  (rows ?? []).forEach((d) => {
    if (!d.applyToPayrollMonth) return;
    const key = `${d.employeeId}::${d.applyToPayrollMonth}`;
    const list = map.get(key) ?? [];
    list.push(d);
    map.set(key, list);
  });
  return map;
}

function formatDeductionNote(rows: DeductionRow[]): string {
  return rows
    .map((d) => `${d.deductionType.replace(/_/g, " ")}: ${d.currency} ${Number(d.amount).toFixed(2)} — ${d.description}`)
    .join("\n");
}

function sumDeductionCents(rows: DeductionRow[]): number {
  return rows.reduce((sum, d) => sum + Math.round(Number(d.amount) * 100), 0);
}

type PayrollRecordWithEmployee = any;


function EditPayrollDialog({ 
  record, 
  onClose, 
  currency,
  deductionsByKey,
}: { 
  record: PayrollRecordWithEmployee; 
  onClose: () => void;
  currency: string;
  deductionsByKey: Map<string, DeductionRow[]>;
}) {
  const { toast } = useToast();

  const form = useForm<EditPayrollFormData>({
    resolver: zodResolver(editPayrollFormSchema),
    defaultValues: {
      payPeriodStart: record.payPeriodStart,
      payPeriodEnd: record.payPeriodEnd,
      month: record.month || "January",
      baseSalary: record.baseSalary,
      overtimeHours: record.overtimeHours || 0,
      overtimeRate: record.overtimeRate || 0,
      deductions: record.deductions || 0,
      deductionNotes: record.deductionNotes || "",
    },
  });

  const watchedValues = form.watch();

  // Auto-pull approved deductions for the matching employee + month
  const matchingDeductions = useMemo(() => {
    const key = payrollMonthKey(watchedValues.month, watchedValues.payPeriodStart);
    if (!key || !record.employeeId) return [] as DeductionRow[];
    return deductionsByKey.get(`${record.employeeId}::${key}`) ?? [];
  }, [deductionsByKey, record.employeeId, watchedValues.month, watchedValues.payPeriodStart]);

  const pulledTotalCents = sumDeductionCents(matchingDeductions);

  const applyPulledDeductions = () => {
    form.setValue("deductions", pulledTotalCents, { shouldDirty: true });
    form.setValue("deductionNotes", formatDeductionNote(matchingDeductions), { shouldDirty: true });
  };

  const updatePayroll = useMutation({
    mutationFn: async (data: EditPayrollFormData) => {
      const overtimeAmount = Math.round((data.overtimeHours || 0) * (data.overtimeRate || 0));
      const grossSalary = data.baseSalary + overtimeAmount;
      const netPay = grossSalary - (data.deductions || 0);
      return await apiRequest("PATCH", `/api/payroll/${record.id}`, { 
        ...data, 
        overtimeAmount,
        grossSalary,
        netPay 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll record updated" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update payroll", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: EditPayrollFormData) => {
    updatePayroll.mutate(data);
  };

  const overtimeAmount = Math.round((watchedValues.overtimeHours || 0) * (watchedValues.overtimeRate || 0));
  const grossSalary = (watchedValues.baseSalary || 0) + overtimeAmount;
  const netPay = grossSalary - (watchedValues.deductions || 0);


  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Payroll Record</DialogTitle>
        <DialogDescription>
          Edit payroll details for {record.employee?.firstName} {record.employee?.lastName}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-month">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payPeriodStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Start</FormLabel>
                  <FormControl>
                    <Input type="date" data-testid="input-edit-pay-period-start" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payPeriodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period End</FormLabel>
                  <FormControl>
                    <Input type="date" data-testid="input-edit-pay-period-end" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="baseSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Salary</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="500.00"
                    data-testid="input-edit-base-salary"
                    {...field}
                    value={field.value ? field.value / 100 : ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="overtimeHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overtime Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="0"
                      data-testid="input-edit-overtime-hours"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overtimeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overtime Rate (/hr)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      data-testid="input-edit-overtime-rate"
                      {...field}
                      value={field.value ? field.value / 100 : ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Overtime Amount: {formatCurrency(overtimeAmount, currency)}</p>
          </div>

          {matchingDeductions.length > 0 && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {matchingDeductions.length} approved deduction{matchingDeductions.length === 1 ? "" : "s"} for this month
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyPulledDeductions}
                  data-testid="button-apply-deductions-edit"
                >
                  Apply {formatCurrency(pulledTotalCents, currency)}
                </Button>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {matchingDeductions.map((d) => (
                  <li key={d.id}>
                    • {d.deductionType.replace(/_/g, " ")} — {d.currency} {Number(d.amount).toFixed(2)} ({d.description})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FormField
            control={form.control}
            name="deductions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deductions</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="50.00"
                    data-testid="input-edit-deductions"
                    {...field}
                    value={field.value ? field.value / 100 : ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deductionNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deduction Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes about deductions..."
                    data-testid="input-edit-deduction-notes"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="p-4 bg-primary/5 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Salary:</span>
              <span className="font-medium">{formatCurrency(grossSalary, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deductions:</span>
              <span className="font-medium text-destructive">-{formatCurrency(watchedValues.deductions || 0, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Net Salary:</span>
              <span className="font-bold text-primary">{formatCurrency(netPay, currency)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={updatePayroll.isPending} data-testid="button-save-edit">
              {updatePayroll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

export default function Payroll() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecordWithEmployee | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: payrollRecords, isLoading } = useQuery<PayrollRecordWithEmployee[]>({
    queryKey: ["/api/payroll"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.defaultCurrency || "USD";

  const form = useForm<PayrollFormData>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employeeId: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      month: "January",
      baseSalary: 0,
      overtimeHours: 0,
      overtimeRate: 0,
      deductions: 0,
      deductionNotes: "",
    },
  });

  const createPayroll = useMutation({
    mutationFn: async (data: PayrollFormData) => {
      const overtimeAmount = Math.round((data.overtimeHours || 0) * (data.overtimeRate || 0));
      const grossSalary = data.baseSalary + overtimeAmount;
      const netPay = grossSalary - (data.deductions || 0);
      return await apiRequest("POST", "/api/payroll", { 
        ...data, 
        overtimeAmount,
        grossSalary,
        netPay,
        payFrequency: "monthly"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll record created" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create payroll", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const deletePayroll = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/payroll/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll record deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete payroll", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const uploadPayroll = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/payroll/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll data imported", description: `${data.imported} records imported successfully` });
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to import payroll", description: parseErrorMessage(error), variant: "destructive" });
      setIsUploading(false);
    },
  });

  const onSubmit = (data: PayrollFormData) => {
    createPayroll.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadPayroll.mutate(file);
    }
  };

  const downloadSampleExcel = () => {
    // Create sample CSV data
    const headers = ["Employee ID", "Employee Name", "Month", "Period Start", "Period End", "Monthly Salary", "Overtime Hours", "Overtime Rate", "Deductions", "Deduction Notes"];
    const sampleData = [
      ["EMP001", "John Doe", "January", "2024-01-01", "2024-01-31", "5000.00", "10", "25.00", "500.00", "Tax deduction"],
      ["EMP002", "Jane Smith", "January", "2024-01-01", "2024-01-31", "6000.00", "5", "30.00", "600.00", "Insurance"],
    ];
    
    const csvContent = [headers.join(","), ...sampleData.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Sample file downloaded", description: "Use this template to import payroll data" });
  };

  const watchedValues = form.watch();
  const overtimeAmount = Math.round((watchedValues.overtimeHours || 0) * (watchedValues.overtimeRate || 0));
  const grossSalary = (watchedValues.baseSalary || 0) + overtimeAmount;
  const netPay = grossSalary - (watchedValues.deductions || 0);

  // Filter records by month
  const filteredRecords = payrollRecords?.filter(record => 
    filterMonth === "all" || record.month === filterMonth
  ) || [];

  // Get employee details for each record
  const recordsWithEmployees = filteredRecords.map(record => ({
    ...record,
    employee: employees?.find(e => e.id === record.employeeId)
  }));

  // Calculate stats
  const totalPayroll = filteredRecords.reduce((sum, r) => sum + (r.netPay || 0), 0);
  const totalGross = filteredRecords.reduce((sum, r) => sum + (r.grossSalary || r.baseSalary || 0), 0);
  const totalDeductions = filteredRecords.reduce((sum, r) => sum + (r.deductions || 0), 0);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Payroll Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employee payroll and compensation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-payroll">
                <Plus className="h-4 w-4 mr-2" />
                Add Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Payroll Record</DialogTitle>
                <DialogDescription>Add a new payroll record for an employee</DialogDescription>
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
                            <SelectTrigger data-testid="select-employee">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees?.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName} ({employee.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-month">
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month} value={month}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payPeriodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period Start</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-pay-period-start" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payPeriodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period End</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-pay-period-end" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Salary</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="5000.00"
                            data-testid="input-base-salary"
                            {...field}
                            value={field.value ? field.value / 100 : ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="overtimeHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overtime Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="0"
                              data-testid="input-overtime-hours"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="overtimeRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overtime Rate (/hr)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="25.00"
                              data-testid="input-overtime-rate"
                              {...field}
                              value={field.value ? field.value / 100 : ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Overtime Amount: {formatCurrency(overtimeAmount, currency)}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="deductions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deductions</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            data-testid="input-deductions"
                            {...field}
                            value={field.value ? field.value / 100 : ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deductionNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deduction Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes about deductions (tax, insurance, etc.)..."
                            data-testid="input-deduction-notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Salary:</span>
                      <span className="font-medium">{formatCurrency(grossSalary, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions:</span>
                      <span className="font-medium text-destructive">-{formatCurrency(watchedValues.deductions || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Net Salary:</span>
                      <span className="font-bold text-primary">{formatCurrency(netPay, currency)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPayroll.isPending} data-testid="button-create-payroll">
                      {createPayroll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Record
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold truncate" data-testid="text-total-records">{filteredRecords.length}</div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Gross Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold truncate" data-testid="text-total-gross">{formatCurrency(totalGross, currency)}</div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-destructive truncate" data-testid="text-total-deductions">{formatCurrency(totalDeductions, currency)}</div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Net Payroll</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-primary truncate" data-testid="text-total-net">{formatCurrency(totalPayroll, currency)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" data-testid="tab-records">Payroll Records</TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">Import / Export</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          {/* Filter by Month */}
          <div className="flex items-center gap-4">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-48" data-testid="select-filter-month">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payroll Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Name</TableHead>
                      <TableHead className="whitespace-nowrap">Employee ID</TableHead>
                      <TableHead className="whitespace-nowrap">Month</TableHead>
                      <TableHead className="whitespace-nowrap">Period Start</TableHead>
                      <TableHead className="whitespace-nowrap">Period End</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Monthly Salary</TableHead>
                      <TableHead className="whitespace-nowrap text-right">OT Hrs</TableHead>
                      <TableHead className="whitespace-nowrap text-right">OT Rate</TableHead>
                      <TableHead className="whitespace-nowrap text-right">OT Amount</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Gross Salary</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Deductions</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Net Salary</TableHead>
                      <TableHead className="whitespace-nowrap">Deduction Notes</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsWithEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                          No payroll records yet. Add your first payroll record to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recordsWithEmployees.map((record) => (
                        <TableRow key={record.id} data-testid={`row-payroll-${record.id}`}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {record.employee?.firstName} {record.employee?.lastName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline">{record.employeeId}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{record.month}</TableCell>
                          <TableCell className="whitespace-nowrap">{format(parseISO(record.payPeriodStart), "MMM d, yyyy")}</TableCell>
                          <TableCell className="whitespace-nowrap">{format(parseISO(record.payPeriodEnd), "MMM d, yyyy")}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatCurrency(record.baseSalary, currency)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{record.overtimeHours || 0}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatCurrency(record.overtimeRate || 0, currency)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatCurrency(record.overtimeAmount || 0, currency)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium">{formatCurrency(record.grossSalary || record.baseSalary, currency)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-destructive">{formatCurrency(record.deductions || 0, currency)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-bold text-primary">{formatCurrency(record.netPay, currency)}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={record.deductionNotes || ""}>
                            {record.deductionNotes || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Dialog open={editingRecord?.id === record.id} onOpenChange={(open) => !open && setEditingRecord(null)}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setEditingRecord(record)}
                                    data-testid={`button-edit-${record.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                {editingRecord?.id === record.id && (
                                  <EditPayrollDialog
                                    record={record}
                                    currency={currency}
                                    onClose={() => setEditingRecord(null)}
                                  />
                                )}
                              </Dialog>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deletePayroll.mutate(record.id)}
                                data-testid={`button-delete-${record.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Payroll Data
                </CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file to bulk import payroll records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop your file here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-file"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Select File
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </CardContent>
            </Card>

            {/* Download Sample Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Sample Template
                </CardTitle>
                <CardDescription>
                  Get a sample file to understand the required format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-6">
                  <h4 className="font-medium mb-3">Required Columns:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Employee ID</li>
                    <li>• Employee Name</li>
                    <li>• Month (January - December)</li>
                    <li>• Period Start (YYYY-MM-DD)</li>
                    <li>• Period End (YYYY-MM-DD)</li>
                    <li>• Monthly Salary (e.g., 5000.00)</li>
                    <li>• Overtime Hours</li>
                    <li>• Overtime Rate (e.g., 25.00)</li>
                    <li>• Deductions (e.g., 500.00)</li>
                    <li>• Deduction Notes</li>
                  </ul>
                </div>
                <Button onClick={downloadSampleExcel} className="w-full" data-testid="button-download-sample">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <EditPayrollDialog
            record={editingRecord}
            currency={currency}
            onClose={() => setEditingRecord(null)}
          />
        </Dialog>
      )}
    </div>
  );
}
