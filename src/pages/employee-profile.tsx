import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "@/lib/wouter-compat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Briefcase,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  Edit,
  Target,
  DollarSign,
  Timer,
  Coffee,
  LogIn,
  LogOut,
  Star,
  TrendingUp,
  UserCheck,
  Award,
  Wrench,
  Plus,
  Trash2,
  KeyRound,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Employee, Department, TimeOffRequest, Document, OnboardingTask, Goal, PayrollRecord, TimeEntry, Skill, Certification, Company, CompanySettings } from "@shared/schema";
import { differenceInMinutes } from "date-fns";
import { format, parseISO } from "date-fns";
import { CompensationHistory } from "@/components/compensation-history";

function ProfileSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
            <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full mx-auto md:mx-0" />
            <div className="flex-1 space-y-2 text-center md:text-left">
              <Skeleton className="h-6 sm:h-7 w-32 sm:w-48 mx-auto md:mx-0" />
              <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mx-auto md:mx-0" />
              <Skeleton className="h-3 sm:h-4 w-48 sm:w-64 mx-auto md:mx-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employees", id],
    enabled: !!id,
  });

  const { data: department } = useQuery<Department>({
    queryKey: ["/api/departments", employee?.departmentId],
    enabled: !!employee?.departmentId,
  });

  const { data: timeOffRequests } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/employees", id, "time-off"],
    enabled: !!id,
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/employees", id, "documents"],
    enabled: !!id,
  });

  const { data: onboardingTasks } = useQuery<OnboardingTask[]>({
    queryKey: ["/api/employees", id, "onboarding"],
    enabled: !!id,
  });

  const { data: goals } = useQuery<Goal[]>({
    queryKey: ["/api/employees", id, "goals"],
    enabled: !!id,
  });

  const { data: payrollRecords } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/employees", id, "payroll"],
    enabled: !!id,
  });

  const { data: timeEntries } = useQuery<TimeEntry[]>({
    queryKey: ["/api/employees", id, "attendance"],
    enabled: !!id,
  });

  const { data: skills } = useQuery<Skill[]>({
    queryKey: ["/api/employees", id, "skills"],
    enabled: !!id,
  });

  const { data: certifications } = useQuery<Certification[]>({
    queryKey: ["/api/employees", id, "certifications"],
    enabled: !!id,
  });

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", employee?.companyId],
    enabled: !!employee?.companyId,
  });

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.defaultCurrency || "USD";
  
  const formatCurrency = (cents: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
    } catch {
      return `${currency} ${(cents / 100).toFixed(2)}`;
    }
  };

  // Format salary values (stored in whole currency units, not cents)
  const formatSalary = (amount: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const completeOnboardingTask = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("PATCH", `/api/onboarding/${taskId}`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", id, "onboarding"] });
      toast({ title: "Task marked as complete" });
    },
  });

  // Skills state and mutations
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", level: "intermediate", yearsOfExperience: "" });

  const createSkillMutation = useMutation({
    mutationFn: async (data: { employeeId: string; name: string; level: string; yearsOfExperience: number | null }) => {
      return await apiRequest("POST", "/api/skills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", id, "skills"] });
      toast({ title: "Skill added successfully" });
      setSkillDialogOpen(false);
      setNewSkill({ name: "", level: "intermediate", yearsOfExperience: "" });
    },
    onError: () => {
      toast({ title: "Failed to add skill", variant: "destructive" });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      return await apiRequest("DELETE", `/api/skills/${skillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", id, "skills"] });
      toast({ title: "Skill removed" });
    },
  });

  // Certifications state and mutations
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [newCert, setNewCert] = useState({
    name: "",
    issuingOrganization: "",
    issueDate: "",
    expirationDate: "",
    credentialId: "",
    credentialUrl: "",
  });

  const createCertMutation = useMutation({
    mutationFn: async (data: {
      employeeId: string;
      name: string;
      issuingOrganization: string | null;
      issueDate: string | null;
      expirationDate: string | null;
      credentialId: string | null;
      credentialUrl: string | null;
    }) => {
      return await apiRequest("POST", "/api/certifications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", id, "certifications"] });
      toast({ title: "Certification added successfully" });
      setCertDialogOpen(false);
      setNewCert({ name: "", issuingOrganization: "", issueDate: "", expirationDate: "", credentialId: "", credentialUrl: "" });
    },
    onError: () => {
      toast({ title: "Failed to add certification", variant: "destructive" });
    },
  });

  const deleteCertMutation = useMutation({
    mutationFn: async (certId: string) => {
      return await apiRequest("DELETE", `/api/certifications/${certId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", id, "certifications"] });
      toast({ title: "Certification removed" });
    },
  });

  const handleAddSkill = () => {
    if (!id || !newSkill.name.trim()) return;
    createSkillMutation.mutate({
      employeeId: id,
      name: newSkill.name.trim(),
      level: newSkill.level,
      yearsOfExperience: newSkill.yearsOfExperience ? parseInt(newSkill.yearsOfExperience) : null,
    });
  };

  const handleAddCert = () => {
    if (!id || !newCert.name.trim()) return;
    createCertMutation.mutate({
      employeeId: id,
      name: newCert.name.trim(),
      issuingOrganization: newCert.issuingOrganization || null,
      issueDate: newCert.issueDate || null,
      expirationDate: newCert.expirationDate || null,
      credentialId: newCert.credentialId || null,
      credentialUrl: newCert.credentialUrl || null,
    });
  };

  if (employeeLoading) {
    return <ProfileSkeleton />;
  }

  if (!employee) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold mb-2">Employee not found</h3>
            <p className="text-muted-foreground mb-4">This employee doesn't exist or has been removed.</p>
            <Button variant="outline" onClick={() => navigate("/employees")}>
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "on_leave":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "resigned":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "terminated":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const vacationProgress = employee.vacationDaysTotal
    ? ((employee.vacationDaysUsed || 0) / employee.vacationDaysTotal) * 100
    : 0;
  const sickProgress = employee.sickDaysTotal
    ? ((employee.sickDaysUsed || 0) / employee.sickDaysTotal) * 100
    : 0;

  const completedTasks = onboardingTasks?.filter((t) => t.status === "completed").length || 0;
  const totalTasks = onboardingTasks?.length || 0;
  const onboardingProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      const response = await fetch(`/api/employees/${id}/export/${format}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${employee?.firstName}_${employee?.lastName}_export.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Export successful",
        description: `Employee data exported to ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export employee data",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/employees")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Employee Profile</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("excel")} data-testid="menu-export-excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="menu-export-pdf">
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 mx-auto md:mx-0">
              <AvatarImage src={employee.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">
                  {employee.firstName} {employee.lastName}
                </h2>
                <Badge className={getStatusColor(employee.employmentStatus)}>
                  {employee.employmentStatus}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">{employee.jobTitle}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {employee.phone}
                  </span>
                )}
                {department && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {department.name}
                  </span>
                )}
                {employee.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {employee.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Started {format(parseISO(employee.startDate), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="skills" data-testid="tab-skills">Skills & Certs</TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">Payroll</TabsTrigger>
          <TabsTrigger value="compensation" data-testid="tab-compensation">Compensation</TabsTrigger>
          <TabsTrigger value="time-off" data-testid="tab-time-off">Time Off</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="font-medium font-mono">{(employee as any).employeeCode || <span className="italic text-muted-foreground">Not set</span>}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{employee.employmentType?.replace("_", " ")}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{department?.name || "—"}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">{format(parseISO(employee.startDate), "MMM d, yyyy")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Vacation Days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {employee.vacationDaysUsed || 0} / {employee.vacationDaysTotal || 0} days
                  </span>
                </div>
                <Progress value={vacationProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {(employee.vacationDaysTotal || 0) - (employee.vacationDaysUsed || 0)} days remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Sick Days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {employee.sickDaysUsed || 0} / {employee.sickDaysTotal || 0} days
                  </span>
                </div>
                <Progress value={sickProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {(employee.sickDaysTotal || 0) - (employee.sickDaysUsed || 0)} days remaining
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Salary Package Section */}
          {(employee.basicSalary || employee.foodAllowance || employee.accommodationAllowance || employee.otherAllowance) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Salary Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Basic Salary</p>
                    <p className="text-lg font-bold">{formatSalary(employee.basicSalary || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Food Allowance</p>
                    <p className="text-lg font-bold">{formatSalary(employee.foodAllowance || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Accommodation</p>
                    <p className="text-lg font-bold">{formatSalary(employee.accommodationAllowance || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Other Allowances</p>
                    <p className="text-lg font-bold">{formatSalary(employee.otherAllowance || 0)}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Total Package</span>
                  <span className="text-xl font-bold text-primary">
                    {formatSalary(
                      (employee.basicSalary || 0) + 
                      (employee.foodAllowance || 0) + 
                      (employee.accommodationAllowance || 0) + 
                      (employee.otherAllowance || 0)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {employee.bio && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{employee.bio}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.emergencyContactName ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{employee.emergencyContactName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{employee.emergencyContactPhone || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Relationship</span>
                    <span className="font-medium">{employee.emergencyContactRelation || "—"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No emergency contact on file</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Employee Portal Login Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                Share these credentials with the employee so they can access the Employee Portal to clock in/out and view their information.
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee ID (for login)</span>
                <span className="font-medium font-mono text-primary">{(employee as any).employeeCode || <span className="italic text-muted-foreground">Not set — edit employee to assign one</span>}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Password</span>
                <span className="font-medium text-muted-foreground italic">Set during employee creation</span>
              </div>
              {company && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Company Name</span>
                    <span className="font-medium">{company.name}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Skills
                  </CardTitle>
                  <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-skill">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Skill</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="skill-name">Skill Name *</Label>
                          <Input
                            id="skill-name"
                            value={newSkill.name}
                            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                            placeholder="e.g., JavaScript, Project Management"
                            data-testid="input-skill-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="skill-level">Proficiency Level</Label>
                          <Select
                            value={newSkill.level}
                            onValueChange={(value) => setNewSkill({ ...newSkill, level: value })}
                          >
                            <SelectTrigger data-testid="select-skill-level">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="skill-years">Years of Experience</Label>
                          <Input
                            id="skill-years"
                            type="number"
                            min="0"
                            value={newSkill.yearsOfExperience}
                            onChange={(e) => setNewSkill({ ...newSkill, yearsOfExperience: e.target.value })}
                            placeholder="e.g., 5"
                            data-testid="input-skill-years"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleAddSkill}
                          disabled={!newSkill.name.trim() || createSkillMutation.isPending}
                          data-testid="button-save-skill"
                        >
                          {createSkillMutation.isPending ? "Adding..." : "Add Skill"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!skills || skills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No skills added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {skills.map((skill) => (
                      <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`skill-${skill.id}`}>
                        <div className="flex-1">
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {skill.level && <span className="capitalize">{skill.level}</span>}
                            {skill.level && skill.yearsOfExperience && " • "}
                            {skill.yearsOfExperience && `${skill.yearsOfExperience} years`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSkillMutation.mutate(skill.id)}
                          disabled={deleteSkillMutation.isPending}
                          data-testid={`button-delete-skill-${skill.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Certifications
                  </CardTitle>
                  <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-certification">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Certification</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="cert-name">Certification Name *</Label>
                          <Input
                            id="cert-name"
                            value={newCert.name}
                            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                            placeholder="e.g., AWS Solutions Architect"
                            data-testid="input-cert-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cert-org">Issuing Organization</Label>
                          <Input
                            id="cert-org"
                            value={newCert.issuingOrganization}
                            onChange={(e) => setNewCert({ ...newCert, issuingOrganization: e.target.value })}
                            placeholder="e.g., Amazon Web Services"
                            data-testid="input-cert-org"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cert-issue-date">Issue Date</Label>
                            <Input
                              id="cert-issue-date"
                              type="date"
                              value={newCert.issueDate}
                              onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                              data-testid="input-cert-issue-date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cert-exp-date">Expiration Date</Label>
                            <Input
                              id="cert-exp-date"
                              type="date"
                              value={newCert.expirationDate}
                              onChange={(e) => setNewCert({ ...newCert, expirationDate: e.target.value })}
                              data-testid="input-cert-exp-date"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cert-id">Credential ID</Label>
                          <Input
                            id="cert-id"
                            value={newCert.credentialId}
                            onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                            placeholder="e.g., ABC123XYZ"
                            data-testid="input-cert-id"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cert-url">Credential URL</Label>
                          <Input
                            id="cert-url"
                            value={newCert.credentialUrl}
                            onChange={(e) => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                            placeholder="https://..."
                            data-testid="input-cert-url"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleAddCert}
                          disabled={!newCert.name.trim() || createCertMutation.isPending}
                          data-testid="button-save-certification"
                        >
                          {createCertMutation.isPending ? "Adding..." : "Add Certification"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!certifications || certifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Award className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No certifications added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="p-3 rounded-lg bg-muted/50" data-testid={`cert-${cert.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{cert.name}</p>
                            {cert.issuingOrganization && (
                              <p className="text-sm text-muted-foreground">{cert.issuingOrganization}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {cert.issueDate && (
                                <span>Issued: {format(parseISO(cert.issueDate), "MMM yyyy")}</span>
                              )}
                              {cert.expirationDate && (
                                <span>Expires: {format(parseISO(cert.expirationDate), "MMM yyyy")}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {cert.credentialUrl && (
                              <a 
                                href={cert.credentialUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm mr-2"
                              >
                                View
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCertMutation.mutate(cert.id)}
                              disabled={deleteCertMutation.isPending}
                              data-testid={`button-delete-cert-${cert.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Personal Goals
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {goals?.filter((g) => g.status === "completed").length || 0} / {goals?.length || 0} completed
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {!goals || goals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No goals assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => {
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      not_started: { label: "Not Started", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
                      in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                      completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
                      cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
                    };
                    const config = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.not_started;
                    return (
                      <div key={goal.id} className="p-4 rounded-lg border hover-elevate" data-testid={`goal-${goal.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{goal.title}</h4>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                            )}
                          </div>
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{goal.progress || 0}%</span>
                          </div>
                          <Progress value={goal.progress || 0} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                          {goal.targetDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due {format(parseISO(goal.targetDate), "MMM d, yyyy")}</span>
                            </div>
                          )}
                          {goal.category && <Badge variant="outline">{goal.category}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!timeEntries || timeEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Timer className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No attendance records</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeEntries.slice(0, 15).map((entry) => {
                    const clockIn = new Date(entry.clockIn);
                    const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
                    const totalMins = clockOut
                      ? differenceInMinutes(clockOut, clockIn) - (entry.breakMinutes || 0)
                      : 0;
                    const hours = Math.floor(totalMins / 60);
                    const mins = totalMins % 60;
                    const duration = clockOut ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`) : null;

                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`attendance-${entry.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <LogIn className="h-3 w-3 text-green-500" />
                            <span>{format(clockIn, "h:mm a")}</span>
                          </div>
                          {clockOut && (
                            <div className="flex items-center gap-2 text-sm">
                              <LogOut className="h-3 w-3 text-red-500" />
                              <span>{format(clockOut, "h:mm a")}</span>
                            </div>
                          )}
                          {entry.breakMinutes ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Coffee className="h-3 w-3" />
                              <span>{entry.breakMinutes}m</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(entry.date), "MMM d, yyyy")}
                          </span>
                          {duration ? (
                            <Badge variant="outline">{duration}</Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-600">Active</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pay Stubs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!payrollRecords || payrollRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No payroll records</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payrollRecords.map((record) => (
                      <div key={record.id} className="p-4 rounded-lg border hover-elevate" data-testid={`payroll-${record.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium">
                              {format(parseISO(record.payPeriodStart), "MMM d")} -{" "}
                              {format(parseISO(record.payPeriodEnd), "MMM d, yyyy")}
                            </h4>
                            <p className="text-sm text-muted-foreground capitalize">
                              {record.payFrequency?.replace("_", " ")} Pay Period
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{formatCurrency(record.netPay)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Base</p>
                            <p className="font-medium">{formatCurrency(record.baseSalary)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Bonus</p>
                            <p className="font-medium text-green-600">+{formatCurrency(record.bonus || 0)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deductions</p>
                            <p className="font-medium text-red-600">-{formatCurrency(record.deductions || 0)}</p>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-4">
          {employee && (
            <CompensationHistory
              employeeId={employee.id}
              companyId={employee.companyId}
            />
          )}
        </TabsContent>

        <TabsContent value="time-off" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Time Off History</CardTitle>
            </CardHeader>
            <CardContent>
              {!timeOffRequests || timeOffRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No time off requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeOffRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium capitalize">{request.type.replace("_", " ")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(request.startDate), "MMM d")} -{" "}
                          {format(parseISO(request.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge
                        className={
                          request.status === "approved"
                            ? "bg-green-500/10 text-green-600"
                            : request.status === "rejected"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-yellow-500/10 text-yellow-600"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!documents || documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border hover-elevate">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.category}</p>
                      </div>
                      <Badge variant="outline">{doc.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Onboarding Progress</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {completedTasks} of {totalTasks} completed
                </span>
              </div>
              <Progress value={onboardingProgress} className="h-2 mt-2" />
            </CardHeader>
            <CardContent>
              {!onboardingTasks || onboardingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No onboarding tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {onboardingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                    >
                      <button
                        onClick={() => task.status !== "completed" && completeOnboardingTask.mutate(task.id)}
                        className="shrink-0"
                        disabled={task.status === "completed"}
                        data-testid={`button-complete-task-${task.id}`}
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {format(parseISO(task.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
