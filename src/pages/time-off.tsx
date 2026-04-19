import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveTracker } from "@/components/leave-tracker";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Link2,
  Copy,
  Trash2,
  Edit,
  Users,
  Building2,
  Shield,
} from "lucide-react";
import type { TimeOffRequest, Employee, LeaveType } from "@shared/schema";
import { format, parseISO, differenceInDays } from "date-fns";

const leaveTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  daysAllowed: z.number().min(0, "Days must be 0 or more"),
  color: z.string().default("#6366f1"),
  requiresDeptApproval: z.boolean().default(true),
  requiresMgmtApproval: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type LeaveTypeFormData = z.infer<typeof leaveTypeFormSchema>;

function getApprovalStatusBadge(status: string | null) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
}

function getOverallStatusBadge(status: string | null) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    case "dept_approved":
      return <Badge className="bg-blue-500/10 text-blue-600"><Users className="h-3 w-3 mr-1" />Dept Approved</Badge>;
    case "mgmt_approved":
      return <Badge className="bg-purple-500/10 text-purple-600"><Building2 className="h-3 w-3 mr-1" />Mgmt Approved</Badge>;
    default:
      return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
}

function LeaveTypeDialog({ 
  leaveType, 
  onClose 
}: { 
  leaveType?: LeaveType; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!leaveType;

  const form = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeFormSchema),
    defaultValues: {
      name: leaveType?.name || "",
      description: leaveType?.description || "",
      daysAllowed: leaveType?.daysAllowed || 0,
      color: leaveType?.color || "#6366f1",
      requiresDeptApproval: leaveType?.requiresDeptApproval ?? true,
      requiresMgmtApproval: leaveType?.requiresMgmtApproval ?? true,
      isActive: leaveType?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaveTypeFormData) => {
      return await apiRequest("POST", "/api/leave-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      toast({ title: "Leave type created successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create leave type", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LeaveTypeFormData) => {
      return await apiRequest("PATCH", `/api/leave-types/${leaveType?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      toast({ title: "Leave type updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update leave type", variant: "destructive" });
    },
  });

  const onSubmit = (data: LeaveTypeFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual Leave" {...field} data-testid="input-leave-type-name" />
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
                <Textarea placeholder="Optional description" {...field} data-testid="input-leave-type-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="daysAllowed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Days Allowed (per year)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-leave-type-days" 
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
                <div className="flex gap-2 items-center">
                  <Input type="color" className="w-16 h-10" {...field} data-testid="input-leave-type-color" />
                  <span className="text-sm text-muted-foreground">{field.value}</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requiresDeptApproval"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Requires Department Head Approval</FormLabel>
                <FormDescription className="text-xs">
                  Request must be approved by department head first
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-dept-approval" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requiresMgmtApproval"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Requires Top Management Approval</FormLabel>
                <FormDescription className="text-xs">
                  Request must be approved by top management after department
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-mgmt-approval" />
              </FormControl>
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
                <FormDescription className="text-xs">
                  Employees can only request active leave types
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-leave-type">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-leave-type">
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function LeaveRequestCard({
  request,
  employee,
  leaveType,
  onRefresh,
}: {
  request: TimeOffRequest;
  employee?: Employee;
  leaveType?: LeaveType;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showApprovalLinks, setShowApprovalLinks] = useState(false);
  // Use actualReturnDate if set, otherwise use endDate
  const effectiveEndDate = request.actualReturnDate || request.endDate;
  const days = differenceInDays(parseISO(effectiveEndDate), parseISO(request.startDate)) + 1;

  const baseUrl = window.location.origin;
  const [tokens, setTokens] = useState<{ dept_token?: string; mgmt_token?: string } | null>(null);
  const deptApprovalLink = tokens?.dept_token
    ? `${baseUrl}/approve/dept/${request.id}?token=${tokens.dept_token}`
    : null;
  const mgmtApprovalLink = tokens?.mgmt_token
    ? `${baseUrl}/approve/mgmt/${request.id}?token=${tokens.mgmt_token}`
    : null;

  const loadTokens = async () => {
    if (tokens) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await (supabase as any).rpc("get_time_off_tokens", { _request_id: request.id });
    if (!error && Array.isArray(data) && data.length > 0) setTokens(data[0]);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} link copied to clipboard` });
  };

  const deptApprovalMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      return await apiRequest("PATCH", `/api/time-off/${request.id}/dept-approval`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off"] });
      toast({ title: "Department approval updated" });
      onRefresh();
    },
  });

  const mgmtApprovalMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      return await apiRequest("PATCH", `/api/time-off/${request.id}/mgmt-approval`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off"] });
      toast({ title: "Management approval updated" });
      onRefresh();
    },
  });

  const adminApprovalMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      return await apiRequest("PATCH", `/api/time-off/${request.id}/admin-approval`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off"] });
      toast({ title: "Leave request " + (request.status === "approved" ? "approved" : "processed") });
      onRefresh();
    },
  });

  const requiresDept = leaveType?.requiresDeptApproval ?? true;
  const requiresMgmt = leaveType?.requiresMgmtApproval ?? true;

  const canAdminApprove = 
    (!requiresDept || request.deptApprovalStatus === "approved") &&
    (!requiresMgmt || request.mgmtApprovalStatus === "approved") &&
    request.status !== "approved" && 
    request.status !== "rejected";

  return (
    <Card data-testid={`card-leave-request-${request.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div 
              className="p-2 rounded-lg" 
              style={{ backgroundColor: `${leaveType?.color || "#6366f1"}20` }}
            >
              <Calendar className="h-5 w-5" style={{ color: leaveType?.color || "#6366f1" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {employee && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {employee.firstName.charAt(0)}
                      {employee.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="font-medium truncate">
                  {employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}
                </span>
                {getOverallStatusBadge(request.status)}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {leaveType?.name || "Leave"} - {days} day{days > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(parseISO(request.startDate), "MMM d")} -{" "}
                  {format(parseISO(effectiveEndDate), "MMM d, yyyy")}
                  {request.actualReturnDate && request.actualReturnDate !== request.endDate && (
                    <span className="text-green-600 dark:text-green-400 ml-1">(Returned early)</span>
                  )}
                </span>
              </div>
              {request.reason && (
                <p className="text-sm text-muted-foreground mt-2 italic">"{request.reason}"</p>
              )}
            </div>
          </div>

          {/* Approval Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t pt-3">
            {requiresDept && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Department Head
                </span>
                {getApprovalStatusBadge(request.deptApprovalStatus)}
              </div>
            )}
            {requiresMgmt && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Top Management
                </span>
                {getApprovalStatusBadge(request.mgmtApprovalStatus)}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Admin
              </span>
              {getApprovalStatusBadge(request.adminApprovalStatus)}
            </div>
          </div>

          {/* Action Buttons */}
          {request.status !== "approved" && request.status !== "rejected" && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {/* Approval Links Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowApprovalLinks(!showApprovalLinks); if (!showApprovalLinks) loadTokens(); }}
                data-testid="button-show-approval-links"
              >
                <Link2 className="h-4 w-4 mr-1" />
                Approval Links
              </Button>

              {/* Quick Approve Buttons for Dept/Mgmt if admin wants to do it directly */}
              {requiresDept && request.deptApprovalStatus === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deptApprovalMutation.mutate("approve")}
                    disabled={deptApprovalMutation.isPending}
                    data-testid="button-dept-approve"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Dept Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deptApprovalMutation.mutate("reject")}
                    disabled={deptApprovalMutation.isPending}
                    data-testid="button-dept-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dept Reject
                  </Button>
                </>
              )}

              {requiresMgmt && request.deptApprovalStatus === "approved" && request.mgmtApprovalStatus === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mgmtApprovalMutation.mutate("approve")}
                    disabled={mgmtApprovalMutation.isPending}
                    data-testid="button-mgmt-approve"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mgmt Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mgmtApprovalMutation.mutate("reject")}
                    disabled={mgmtApprovalMutation.isPending}
                    data-testid="button-mgmt-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Mgmt Reject
                  </Button>
                </>
              )}

              {canAdminApprove && (
                <>
                  <Button
                    size="sm"
                    onClick={() => adminApprovalMutation.mutate("approve")}
                    disabled={adminApprovalMutation.isPending}
                    data-testid="button-admin-approve"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Final Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adminApprovalMutation.mutate("reject")}
                    disabled={adminApprovalMutation.isPending}
                    data-testid="button-admin-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Shareable Approval Links */}
          {showApprovalLinks && request.status !== "approved" && request.status !== "rejected" && (
            <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">Share these links for external approval:</p>
              {requiresDept && request.deptApprovalStatus === "pending" && deptApprovalLink && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    Dept Head: {deptApprovalLink}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(deptApprovalLink, "Department approval")}
                    data-testid="button-copy-dept-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {requiresMgmt && request.deptApprovalStatus === "approved" && request.mgmtApprovalStatus === "pending" && mgmtApprovalLink && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    Management: {mgmtApprovalLink}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(mgmtApprovalLink, "Management approval")}
                    data-testid="button-copy-mgmt-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TimeOffPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("requests");
  const [leaveTypeDialogOpen, setLeaveTypeDialogOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | undefined>();

  const { data: leaveTypes, isLoading: leaveTypesLoading, refetch: refetchLeaveTypes } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: timeOffRequests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/time-off"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/leave-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      toast({ title: "Leave type deleted" });
    },
  });

  const openEditDialog = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setLeaveTypeDialogOpen(true);
  };

  const closeDialog = () => {
    setLeaveTypeDialogOpen(false);
    setEditingLeaveType(undefined);
  };

  const getEmployeeById = (id: string) => employees?.find(e => e.id === id);
  const getLeaveTypeById = (id: string | null) => id ? leaveTypes?.find(lt => lt.id === id) : undefined;

  const pendingRequests = timeOffRequests?.filter(r => r.status !== "approved" && r.status !== "rejected") || [];
  const processedRequests = timeOffRequests?.filter(r => r.status === "approved" || r.status === "rejected") || [];

  // Get employees currently on leave (approved leave, today is within start-end date, no actual return date or return date is in future)
  const today = new Date().toISOString().split('T')[0];
  const employeesOnLeave = timeOffRequests?.filter(r => {
    if (r.status !== 'approved') return false;
    if (r.startDate > today) return false;
    // If actual return date is set and is in the past, employee has returned
    if (r.actualReturnDate && r.actualReturnDate <= today) return false;
    // If no actual return date, use end date
    if (!r.actualReturnDate && r.endDate < today) return false;
    return true;
  }) || [];

  const updateReturnDateMutation = useMutation({
    mutationFn: async ({ requestId, actualReturnDate }: { requestId: string; actualReturnDate: string }) => {
      return await apiRequest("PATCH", `/api/time-off/${requestId}/return-date`, { actualReturnDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off"] });
      toast({ title: "Return date updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update return date", variant: "destructive" });
    },
  });

  const [returnDateDialogOpen, setReturnDateDialogOpen] = useState(false);
  const [selectedRequestForReturn, setSelectedRequestForReturn] = useState<TimeOffRequest | null>(null);
  const [returnDate, setReturnDate] = useState("");

  // Add Leave Record dialog state
  const [addLeaveDialogOpen, setAddLeaveDialogOpen] = useState(false);
  const [newLeaveEmployeeId, setNewLeaveEmployeeId] = useState("");
  const [newLeaveTypeId, setNewLeaveTypeId] = useState("");
  const [newLeaveStart, setNewLeaveStart] = useState("");
  const [newLeaveEnd, setNewLeaveEnd] = useState("");
  const [newLeaveReason, setNewLeaveReason] = useState("");

  const addLeaveRecordMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/time-off", {
        employeeId: newLeaveEmployeeId,
        leaveTypeId: newLeaveTypeId || null,
        startDate: newLeaveStart,
        endDate: newLeaveEnd,
        reason: newLeaveReason || null,
        status: "approved",
        deptApprovalStatus: "approved",
        mgmtApprovalStatus: "approved",
        adminApprovalStatus: "approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off"] });
      toast({ title: "Leave record added successfully" });
      setAddLeaveDialogOpen(false);
      setNewLeaveEmployeeId("");
      setNewLeaveTypeId("");
      setNewLeaveStart("");
      setNewLeaveEnd("");
      setNewLeaveReason("");
    },
    onError: (e: any) => {
      toast({ title: "Failed to add leave record", description: e?.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Time Off Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage leave types and process employee leave requests
          </p>
        </div>
        <Button onClick={() => setAddLeaveDialogOpen(true)} data-testid="button-add-leave-record">
          <Plus className="h-4 w-4 mr-2" />
          Add Leave Record
        </Button>
      </div>

      {/* Add Leave Record Dialog */}
      <Dialog open={addLeaveDialogOpen} onOpenChange={setAddLeaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Leave Record</DialogTitle>
            <DialogDescription>
              Manually create an approved leave record for an employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={newLeaveEmployeeId} onValueChange={setNewLeaveEmployeeId}>
                <SelectTrigger data-testid="select-leave-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Leave Type</label>
              <Select value={newLeaveTypeId} onValueChange={setNewLeaveTypeId}>
                <SelectTrigger data-testid="select-leave-type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes?.filter(lt => lt.isActive).map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={newLeaveStart} onChange={(e) => setNewLeaveStart(e.target.value)} data-testid="input-leave-start" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={newLeaveEnd} onChange={(e) => setNewLeaveEnd(e.target.value)} data-testid="input-leave-end" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea value={newLeaveReason} onChange={(e) => setNewLeaveReason(e.target.value)} placeholder="Reason for leave" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddLeaveDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addLeaveRecordMutation.mutate()}
                disabled={!newLeaveEmployeeId || !newLeaveStart || !newLeaveEnd || addLeaveRecordMutation.isPending}
                data-testid="button-save-leave-record"
              >
                {addLeaveRecordMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="requests" data-testid="tab-requests">
            Leave Requests
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-500/20 text-yellow-600">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tracker" data-testid="tab-tracker">Leave Tracker</TabsTrigger>
          <TabsTrigger value="leave-types" data-testid="tab-leave-types">Leave Types</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="space-y-4">
          <LeaveTracker
            employees={(employees ?? []) as any}
            leaveTypes={(leaveTypes ?? []) as any}
            requests={(timeOffRequests ?? []) as any}
          />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {/* Employees Currently On Leave Section */}
          {employeesOnLeave.length > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-600" />
                  Employees Currently On Leave ({employeesOnLeave.length})
                </CardTitle>
                <CardDescription>Employees with approved leave who are currently away</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {employeesOnLeave.map(request => {
                    const employee = getEmployeeById(request.employeeId);
                    const leaveType = getLeaveTypeById(request.leaveTypeId);
                    return (
                      <Card key={request.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {employee ? `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}` : '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">{leaveType?.name || request.type}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              setSelectedRequestForReturn(request);
                              setReturnDate(request.actualReturnDate || '');
                              setReturnDateDialogOpen(true);
                            }}
                            data-testid={`button-set-return-${request.id}`}
                          >
                            Set Return
                          </Button>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p>Leave: {format(parseISO(request.startDate), 'MMM d')} - {format(parseISO(request.endDate), 'MMM d, yyyy')}</p>
                          {request.actualReturnDate && (
                            <p className="text-green-600 dark:text-green-400">
                              Expected return: {format(parseISO(request.actualReturnDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Date Dialog */}
          <Dialog open={returnDateDialogOpen} onOpenChange={setReturnDateDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Set Return Date</DialogTitle>
                <DialogDescription>
                  Enter the date when the employee will return from leave
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Return Date</label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    data-testid="input-return-date"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setReturnDateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedRequestForReturn && returnDate) {
                        updateReturnDateMutation.mutate({
                          requestId: selectedRequestForReturn.id,
                          actualReturnDate: returnDate,
                        });
                        setReturnDateDialogOpen(false);
                      }
                    }}
                    disabled={!returnDate || updateReturnDateMutation.isPending}
                    data-testid="button-save-return-date"
                  >
                    {updateReturnDateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {requestsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <>
              {pendingRequests.length === 0 && processedRequests.length === 0 && employeesOnLeave.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No leave requests</h3>
                    <p className="text-muted-foreground">
                      Leave requests submitted by employees will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {pendingRequests.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        Pending Requests ({pendingRequests.length})
                      </h2>
                      {pendingRequests.map(request => (
                        <LeaveRequestCard
                          key={request.id}
                          request={request}
                          employee={getEmployeeById(request.employeeId)}
                          leaveType={getLeaveTypeById(request.leaveTypeId)}
                          onRefresh={refetchRequests}
                        />
                      ))}
                    </div>
                  )}

                  {processedRequests.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold">Processed Requests</h2>
                      {processedRequests.map(request => (
                        <LeaveRequestCard
                          key={request.id}
                          request={request}
                          employee={getEmployeeById(request.employeeId)}
                          leaveType={getLeaveTypeById(request.leaveTypeId)}
                          onRefresh={refetchRequests}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="leave-types" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={leaveTypeDialogOpen} onOpenChange={(open) => {
              if (!open) closeDialog();
              else setLeaveTypeDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-leave-type">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Leave Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingLeaveType ? "Edit Leave Type" : "Create Leave Type"}</DialogTitle>
                  <DialogDescription>
                    {editingLeaveType ? "Update the leave type settings" : "Create a new leave type for your employees"}
                  </DialogDescription>
                </DialogHeader>
                <LeaveTypeDialog leaveType={editingLeaveType} onClose={closeDialog} />
              </DialogContent>
            </Dialog>
          </div>

          {leaveTypesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : leaveTypes?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No leave types configured</h3>
                <p className="text-muted-foreground mb-4">
                  Create leave types so employees can request time off
                </p>
                <Button onClick={() => setLeaveTypeDialogOpen(true)} data-testid="button-create-first-leave-type">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Leave Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leaveTypes?.map(leaveType => (
                <Card key={leaveType.id} data-testid={`card-leave-type-${leaveType.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: leaveType.color || "#6366f1" }}
                        />
                        <CardTitle className="text-base">{leaveType.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(leaveType)}
                          data-testid={`button-edit-leave-type-${leaveType.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteLeaveTypeMutation.mutate(leaveType.id)}
                          data-testid={`button-delete-leave-type-${leaveType.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{leaveType.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">{leaveType.daysAllowed} days/year</Badge>
                      {!leaveType.isActive && <Badge variant="secondary">Inactive</Badge>}
                      {leaveType.requiresDeptApproval && <Badge variant="outline" className="text-xs">Dept</Badge>}
                      {leaveType.requiresMgmtApproval && <Badge variant="outline" className="text-xs">Mgmt</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
