import { useParams, useLocation } from "@/lib/wouter-compat";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-leave`;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Calendar, User, Building2, CheckCircle2, XCircle, Clock, ArrowLeft, Users, Shield } from "lucide-react";
import { useState } from "react";

interface ApprovalPageProps {
  type: "dept" | "mgmt";
}

interface TimeOffRequestDetails {
  id: string;
  employeeName: string;
  employeeEmail: string;
  departmentName: string | null;
  leaveTypeName: string;
  leaveTypeColor: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  deptApprovalStatus: string | null;
  mgmtApprovalStatus: string | null;
  adminApprovalStatus: string | null;
  requiresDeptApproval: boolean;
  requiresMgmtApproval: boolean;
}

function ApprovalPage({ type }: ApprovalPageProps) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");

  // Extract token from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  const { data: request, isLoading, error, refetch } = useQuery<TimeOffRequestDetails>({
    queryKey: [`approve-leave`, type, id, token],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const apikey = (supabase as any).supabaseKey as string;
      const response = await fetch(`${FN_URL}/${type}/${id}?token=${encodeURIComponent(token)}`, {
        headers: {
          apikey,
          Authorization: `Bearer ${session?.access_token ?? apikey}`,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to fetch request");
      }
      return response.json();
    },
    retry: false,
    enabled: !!token,
  });

  const approvalMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const { data: { session } } = await supabase.auth.getSession();
      const apikey = (supabase as any).supabaseKey as string;
      const response = await fetch(`${FN_URL}/${type}/${id}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey,
          Authorization: `Bearer ${session?.access_token ?? apikey}`,
        },
        body: JSON.stringify({ action, notes }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to process approval");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: data.message || "Approval processed successfully" 
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // If no token provided, show error
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Approval Link</h2>
            <p className="text-muted-foreground mb-4">
              This approval link is missing the required security token. Please use the complete link provided by your administrator.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeLabel = type === "dept" ? "Department Head" : "Management";
  const statusField = type === "dept" ? request?.deptApprovalStatus : request?.mgmtApprovalStatus;
  
  const canApprove = () => {
    if (!request) return false;
    if (request.status === "rejected") return false;
    
    if (type === "dept") {
      return request.deptApprovalStatus === "pending" && request.requiresDeptApproval;
    } else {
      const deptOk = !request.requiresDeptApproval || request.deptApprovalStatus === "approved";
      return deptOk && request.mgmtApprovalStatus === "pending" && request.requiresMgmtApproval;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading request details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Request Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This leave request could not be found or you don't have permission to view it.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Leave Request Approval</h1>
          <p className="text-muted-foreground">{typeLabel} Approval</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: request.leaveTypeColor || "#6366f1" }}
                  />
                  {request.leaveTypeName}
                </CardTitle>
                <CardDescription>
                  Requested by {request.employeeName}
                </CardDescription>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Employee</Label>
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {request.employeeName}
                </p>
                <p className="text-sm text-muted-foreground">{request.employeeEmail}</p>
              </div>
              {request.departmentName && (
                <div>
                  <Label className="text-muted-foreground text-xs">Department</Label>
                  <p className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {request.departmentName}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Start Date</Label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(request.startDate), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">End Date</Label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(request.endDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            {request.reason && (
              <div>
                <Label className="text-muted-foreground text-xs">Reason</Label>
                <p className="text-sm italic">"{request.reason}"</p>
              </div>
            )}

            <div className="border-t pt-4">
              <Label className="text-muted-foreground text-xs mb-2 block">Approval Status</Label>
              <div className="flex flex-wrap gap-4">
                {request.requiresDeptApproval && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Department:</span>
                    {getStatusBadge(request.deptApprovalStatus)}
                  </div>
                )}
                {request.requiresMgmtApproval && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Management:</span>
                    {getStatusBadge(request.mgmtApprovalStatus)}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Admin:</span>
                  {getStatusBadge(request.adminApprovalStatus)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {canApprove() ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Decision</CardTitle>
              <CardDescription>
                As {typeLabel.toLowerCase()}, please review and approve or reject this leave request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about your decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="input-approval-notes"
                />
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => approvalMutation.mutate("approve")}
                  disabled={approvalMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-approve"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => approvalMutation.mutate("reject")}
                  disabled={approvalMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-reject"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : statusField === "approved" || statusField === "rejected" ? (
          <Card>
            <CardContent className="py-8 text-center">
              {statusField === "approved" ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Already Approved</h3>
                  <p className="text-muted-foreground">
                    You have already approved this leave request.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Request Rejected</h3>
                  <p className="text-muted-foreground">
                    This leave request has been rejected.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : type === "mgmt" && request.requiresDeptApproval && request.deptApprovalStatus !== "approved" ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Awaiting Department Approval</h3>
              <p className="text-muted-foreground">
                This request needs department head approval before management can review it.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export function DeptApprovalPage() {
  return <ApprovalPage type="dept" />;
}

export function MgmtApprovalPage() {
  return <ApprovalPage type="mgmt" />;
}
