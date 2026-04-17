import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "@/lib/wouter-compat";
import { apiRequest, queryClient, parseErrorMessage } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Building2,
  Users,
  LogOut,
  Pause,
  Play,
  Trash2,
  Edit,
  RefreshCw,
  Calendar,
  Search,
  UserCog,
  Key,
  CreditCard,
  Settings,
  Check,
  X,
  Clock,
  ExternalLink,
  Mail,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Company {
  id: string;
  name: string;
  companyId: string;
  accountStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
  maxEmployees: number | null;
  notes: string | null;
  createdAt: string;
  adminCount: number;
  employeeCount: number;
}

const SUBSCRIPTION_PLANS = {
  free_trial: { name: "Free Trial", maxEmployees: 300, price: "$0 (14 days)" },
  basic: { name: "Basic", maxEmployees: 30, price: "$299/year" },
  pro: { name: "Pro", maxEmployees: 100, price: "$699/year" },
  smart: { name: "Smart", maxEmployees: 300, price: "$1,699/year" },
  enterprise: { name: "Enterprise", maxEmployees: 9999, price: "Contact Us" }
};

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyId: string;
  companyName: string;
  createdAt: string;
}

interface BankTransferSettings {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
  branchCode: string | null;
  swiftCode: string | null;
  iban: string | null;
  additionalInstructions: string | null;
  isActive: boolean;
}

interface BankTransferPayment {
  id: string;
  companyId: string;
  companyName: string;
  planType: string;
  amount: number;
  currency: string;
  payerName: string;
  payerEmail: string;
  transferDate: string;
  referenceNumber: string | null;
  slipUrl: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface PlatformContactSettings {
  id: string;
  companyName: string | null;
  email: string | null;
  supportEmail: string | null;
  salesEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
}

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"company" | "admin">("company");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bankSettingsForm, setBankSettingsForm] = useState<Partial<BankTransferSettings>>({});
  const [selectedPayment, setSelectedPayment] = useState<BankTransferPayment | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [contactSettingsForm, setContactSettingsForm] = useState<Partial<PlatformContactSettings>>({});

  const { data: superAdmin, isLoading: loadingSuperAdmin } = useQuery<{ id: string; name: string; email: string }>({
    queryKey: ["/api/superadmin/me"],
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/superadmin/companies"],
  });

  const { data: admins = [], isLoading: loadingAdmins } = useQuery<AdminAccount[]>({
    queryKey: ["/api/superadmin/admins"],
  });

  const { data: bankSettings, isLoading: loadingBankSettings } = useQuery<BankTransferSettings | null>({
    queryKey: ["/api/superadmin/bank-transfer-settings"],
  });

  const { data: bankPayments = [], isLoading: loadingBankPayments } = useQuery<BankTransferPayment[]>({
    queryKey: ["/api/superadmin/bank-transfer-payments"],
  });

  const { data: contactSettings, isLoading: loadingContactSettings } = useQuery<PlatformContactSettings | null>({
    queryKey: ["/api/superadmin/platform-contact-settings"],
  });

  const updateContactSettingsMutation = useMutation({
    mutationFn: async (data: Partial<PlatformContactSettings>) => {
      const response = await apiRequest("PUT", "/api/superadmin/platform-contact-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/platform-contact-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-contact-settings"] });
      toast({ title: "Platform contact settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const updateBankSettingsMutation = useMutation({
    mutationFn: async (data: Partial<BankTransferSettings>) => {
      const response = await apiRequest("PUT", "/api/superadmin/bank-transfer-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/bank-transfer-settings"] });
      toast({ title: "Bank transfer settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/bank-transfer-payments/${id}`, { status, adminNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/bank-transfer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/companies"] });
      toast({ title: "Payment status updated" });
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
      setAdminNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update payment", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/companies/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/companies"] });
      toast({ title: "Company updated successfully" });
      setEditDialogOpen(false);
      setSelectedCompany(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update company", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/superadmin/companies/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins"] });
      toast({ title: "Company deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedCompany(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete company", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/superadmin/admins/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/admins"] });
      toast({ title: "Admin account deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedAdmin(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete admin", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, plan, extendTrial }: { id: string; plan?: string; extendTrial?: number }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/companies/${id}/subscription`, { plan, extendTrial });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/companies"] });
      toast({ title: "Subscription updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update subscription", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/superadmin/logout");
      return response.json();
    },
    onSuccess: () => {
      setLocation("/super-admin/login");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/superadmin/change-password", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleStatusChange = (company: Company, status: string) => {
    updateCompanyMutation.mutate({ id: company.id, data: { accountStatus: status } });
  };

  const handleRenew = (company: Company) => {
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    updateCompanyMutation.mutate({
      id: company.id,
      data: {
        accountStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
      },
    });
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAdmins = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "on_hold":
        return "bg-yellow-500";
      case "expired":
        return "bg-red-500";
      case "cancelled":
        return "bg-gray-500";
      default:
        return "bg-green-500";
    }
  };

  if (loadingSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!superAdmin) {
    setLocation("/super-admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Super Admin Dashboard</h1>
                <p className="text-xs text-slate-400">{superAdmin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                data-testid="button-change-password"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{companies.length}</p>
                  <p className="text-sm text-slate-400">Total Companies</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {companies.filter((c) => c.accountStatus === "active" || !c.accountStatus).length}
                  </p>
                  <p className="text-sm text-slate-400">Active Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{admins.length}</p>
                  <p className="text-sm text-slate-400">Admin Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {companies.reduce((sum, c) => sum + c.employeeCount, 0)}
                  </p>
                  <p className="text-sm text-slate-400">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-white">Management Console</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage companies, admin accounts, and subscriptions
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="companies" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-slate-700 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="companies"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white px-6 py-3"
                  data-testid="tab-companies"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Companies
                </TabsTrigger>
                <TabsTrigger
                  value="admins"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white px-6 py-3"
                  data-testid="tab-admins"
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Admin Accounts
                </TabsTrigger>
                <TabsTrigger
                  value="bank-payments"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white px-6 py-3"
                  data-testid="tab-bank-payments"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Bank Payments
                  {bankPayments.filter(p => p.status === "pending").length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs" data-testid="badge-pending-payments">
                      {bankPayments.filter(p => p.status === "pending").length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="bank-settings"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white px-6 py-3"
                  data-testid="tab-bank-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Bank Settings
                </TabsTrigger>
                <TabsTrigger
                  value="contact-settings"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-white px-6 py-3"
                  data-testid="tab-contact-settings"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="companies" className="mt-0">
                {loadingCompanies ? (
                  <div className="p-8 text-center text-slate-400">Loading companies...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-slate-400">Company</TableHead>
                          <TableHead className="text-slate-400">Company ID</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400">Plan</TableHead>
                          <TableHead className="text-slate-400">Admins</TableHead>
                          <TableHead className="text-slate-400">Employees</TableHead>
                          <TableHead className="text-slate-400">Expiry</TableHead>
                          <TableHead className="text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow
                            key={company.id}
                            className="border-slate-700 hover:bg-slate-700/50"
                            data-testid={`row-company-${company.id}`}
                          >
                            <TableCell className="text-white font-medium">{company.name}</TableCell>
                            <TableCell className="text-slate-300 font-mono text-sm">
                              {company.companyId}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(company.accountStatus)} text-white`}>
                                {company.accountStatus || "active"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge className={`${
                                  company.subscriptionPlan === "free_trial" ? "bg-purple-600" :
                                  company.subscriptionPlan === "enterprise" ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                                  company.subscriptionPlan === "smart" ? "bg-gradient-to-r from-blue-500 to-purple-500" :
                                  company.subscriptionPlan === "pro" ? "bg-blue-600" :
                                  "bg-slate-600"
                                } text-white capitalize`}>
                                  {company.subscriptionPlan || "basic"}
                                </Badge>
                                {company.subscriptionPlan === "free_trial" && company.trialEndDate && (
                                  <span className="text-xs text-slate-400">
                                    Ends: {new Date(company.trialEndDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">{company.adminCount}</TableCell>
                            <TableCell className="text-slate-300">
                              {company.employeeCount} / {company.maxEmployees || 50}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {company.subscriptionEndDate
                                ? new Date(company.subscriptionEndDate).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {company.accountStatus === "on_hold" ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(company, "active")}
                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                                    title="Activate"
                                    data-testid={`button-activate-${company.id}`}
                                  >
                                    <Play className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(company, "on_hold")}
                                    className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
                                    title="Put on Hold"
                                    data-testid={`button-hold-${company.id}`}
                                  >
                                    <Pause className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRenew(company)}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                  title="Renew (1 year)"
                                  data-testid={`button-renew-${company.id}`}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setEditDialogOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-white hover:bg-slate-600"
                                  title="Edit"
                                  data-testid={`button-edit-${company.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setDeleteType("company");
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  title="Delete"
                                  data-testid={`button-delete-${company.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredCompanies.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                              No companies found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="admins" className="mt-0">
                {loadingAdmins ? (
                  <div className="p-8 text-center text-slate-400">Loading admin accounts...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-slate-400">Name</TableHead>
                          <TableHead className="text-slate-400">Email</TableHead>
                          <TableHead className="text-slate-400">Phone</TableHead>
                          <TableHead className="text-slate-400">Company</TableHead>
                          <TableHead className="text-slate-400">Created</TableHead>
                          <TableHead className="text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAdmins.map((admin) => (
                          <TableRow
                            key={admin.id}
                            className="border-slate-700 hover:bg-slate-700/50"
                            data-testid={`row-admin-${admin.id}`}
                          >
                            <TableCell className="text-white font-medium">{admin.name}</TableCell>
                            <TableCell className="text-slate-300">{admin.email}</TableCell>
                            <TableCell className="text-slate-300">{admin.phone || "-"}</TableCell>
                            <TableCell className="text-slate-300">{admin.companyName}</TableCell>
                            <TableCell className="text-slate-300">
                              {new Date(admin.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setDeleteType("admin");
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                title="Delete"
                                data-testid={`button-delete-admin-${admin.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredAdmins.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                              No admin accounts found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bank-payments" className="mt-0">
                {loadingBankPayments ? (
                  <div className="p-8 text-center text-slate-400">Loading payments...</div>
                ) : bankPayments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No bank transfer payments yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-slate-400">Company</TableHead>
                          <TableHead className="text-slate-400">Plan</TableHead>
                          <TableHead className="text-slate-400">Amount</TableHead>
                          <TableHead className="text-slate-400">Payer</TableHead>
                          <TableHead className="text-slate-400">Transfer Date</TableHead>
                          <TableHead className="text-slate-400">Status</TableHead>
                          <TableHead className="text-slate-400">Submitted</TableHead>
                          <TableHead className="text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankPayments.map((payment) => (
                          <TableRow key={payment.id} className="border-slate-700" data-testid={`row-payment-${payment.id}`}>
                            <TableCell className="text-white font-medium" data-testid={`text-payment-company-${payment.id}`}>
                              {payment.companyName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize" data-testid={`badge-payment-plan-${payment.id}`}>
                                {payment.planType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white" data-testid={`text-payment-amount-${payment.id}`}>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: payment.currency.toUpperCase(),
                              }).format(payment.amount / 100)}
                            </TableCell>
                            <TableCell>
                              <div className="text-white" data-testid={`text-payment-payer-${payment.id}`}>{payment.payerName}</div>
                              <div className="text-slate-400 text-sm">{payment.payerEmail}</div>
                            </TableCell>
                            <TableCell className="text-slate-300" data-testid={`text-payment-transfer-date-${payment.id}`}>
                              {new Date(payment.transferDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.status === "approved" ? "default" :
                                  payment.status === "rejected" ? "destructive" : "secondary"
                                }
                                className={payment.status === "pending" ? "bg-yellow-500 text-black" : ""}
                                data-testid={`badge-payment-status-${payment.id}`}
                              >
                                {payment.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                                {payment.status === "approved" && <Check className="w-3 h-3 mr-1" />}
                                {payment.status === "rejected" && <X className="w-3 h-3 mr-1" />}
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm" data-testid={`text-payment-created-${payment.id}`}>
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => window.open(payment.slipUrl, '_blank')}
                                  data-testid={`button-view-slip-${payment.id}`}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                {payment.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        setSelectedPayment(payment);
                                        setPaymentDialogOpen(true);
                                      }}
                                      data-testid={`button-review-${payment.id}`}
                                    >
                                      Review
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bank-settings" className="mt-0 p-6">
                {loadingBankSettings ? (
                  <div className="text-center text-slate-400">Loading settings...</div>
                ) : (
                  <div className="max-w-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">Bank Account Details</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Bank Transfer Enabled</span>
                        <Button
                          variant={bankSettings?.isActive ? "default" : "secondary"}
                          size="sm"
                          onClick={() => updateBankSettingsMutation.mutate({
                            ...bankSettings,
                            isActive: !bankSettings?.isActive
                          })}
                          data-testid="button-toggle-bank-transfer"
                        >
                          {bankSettings?.isActive ? "Active" : "Inactive"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Bank Name *</Label>
                        <Input
                          value={bankSettingsForm.bankName ?? bankSettings?.bankName ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, bankName: e.target.value })}
                          placeholder="e.g., First National Bank"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-bank-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Account Name *</Label>
                        <Input
                          value={bankSettingsForm.accountName ?? bankSettings?.accountName ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, accountName: e.target.value })}
                          placeholder="e.g., HRM Pro Inc."
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-account-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Account Number *</Label>
                        <Input
                          value={bankSettingsForm.accountNumber ?? bankSettings?.accountNumber ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, accountNumber: e.target.value })}
                          placeholder="e.g., 1234567890"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-account-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Branch Name</Label>
                        <Input
                          value={bankSettingsForm.branchName ?? bankSettings?.branchName ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, branchName: e.target.value })}
                          placeholder="e.g., Main Street Branch"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-branch-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Branch Code</Label>
                        <Input
                          value={bankSettingsForm.branchCode ?? bankSettings?.branchCode ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, branchCode: e.target.value })}
                          placeholder="e.g., 001234"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-branch-code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">SWIFT Code</Label>
                        <Input
                          value={bankSettingsForm.swiftCode ?? bankSettings?.swiftCode ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, swiftCode: e.target.value })}
                          placeholder="e.g., FNBAUS33"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-swift-code"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-300">IBAN</Label>
                        <Input
                          value={bankSettingsForm.iban ?? bankSettings?.iban ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, iban: e.target.value })}
                          placeholder="e.g., US12 3456 7890 1234 5678 90"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-iban"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-300">Additional Instructions</Label>
                        <Textarea
                          value={bankSettingsForm.additionalInstructions ?? bankSettings?.additionalInstructions ?? ""}
                          onChange={(e) => setBankSettingsForm({ ...bankSettingsForm, additionalInstructions: e.target.value })}
                          placeholder="Any additional payment instructions..."
                          className="bg-slate-700 border-slate-600 text-white min-h-20"
                          data-testid="textarea-instructions"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        const data = {
                          bankName: bankSettingsForm.bankName ?? bankSettings?.bankName ?? "",
                          accountName: bankSettingsForm.accountName ?? bankSettings?.accountName ?? "",
                          accountNumber: bankSettingsForm.accountNumber ?? bankSettings?.accountNumber ?? "",
                          branchName: bankSettingsForm.branchName ?? bankSettings?.branchName,
                          branchCode: bankSettingsForm.branchCode ?? bankSettings?.branchCode,
                          swiftCode: bankSettingsForm.swiftCode ?? bankSettings?.swiftCode,
                          iban: bankSettingsForm.iban ?? bankSettings?.iban,
                          additionalInstructions: bankSettingsForm.additionalInstructions ?? bankSettings?.additionalInstructions,
                          isActive: bankSettings?.isActive ?? true,
                        };
                        updateBankSettingsMutation.mutate(data);
                      }}
                      disabled={updateBankSettingsMutation.isPending}
                      className="w-full md:w-auto"
                      data-testid="button-save-bank-settings"
                    >
                      {updateBankSettingsMutation.isPending ? "Saving..." : "Save Bank Details"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contact-settings" className="mt-0 p-6">
                {loadingContactSettings ? (
                  <div className="text-center text-slate-400">Loading contact settings...</div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-700/30 p-4 rounded-lg mb-6">
                      <p className="text-sm text-slate-400">
                        Configure the contact information displayed on the public landing page and Contact Us page.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Company Name</Label>
                        <Input
                          value={contactSettingsForm.companyName ?? contactSettings?.companyName ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, companyName: e.target.value })}
                          placeholder="HRM Pro"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-company-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Website</Label>
                        <Input
                          value={contactSettingsForm.website ?? contactSettings?.website ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, website: e.target.value })}
                          placeholder="https://www.example.com"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-website"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">General Email</Label>
                        <Input
                          type="email"
                          value={contactSettingsForm.email ?? contactSettings?.email ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, email: e.target.value })}
                          placeholder="info@example.com"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Support Email</Label>
                        <Input
                          type="email"
                          value={contactSettingsForm.supportEmail ?? contactSettings?.supportEmail ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, supportEmail: e.target.value })}
                          placeholder="support@example.com"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-support-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Sales Email</Label>
                        <Input
                          type="email"
                          value={contactSettingsForm.salesEmail ?? contactSettings?.salesEmail ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, salesEmail: e.target.value })}
                          placeholder="sales@example.com"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-sales-email"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Phone Number</Label>
                        <Input
                          value={contactSettingsForm.phone ?? contactSettings?.phone ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, phone: e.target.value })}
                          placeholder="+1 234 567 8900"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">WhatsApp Number</Label>
                        <Input
                          value={contactSettingsForm.whatsapp ?? contactSettings?.whatsapp ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, whatsapp: e.target.value })}
                          placeholder="+1 234 567 8900"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-whatsapp"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Address</Label>
                        <Input
                          value={contactSettingsForm.address ?? contactSettings?.address ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, address: e.target.value })}
                          placeholder="123 Business St"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">City</Label>
                        <Input
                          value={contactSettingsForm.city ?? contactSettings?.city ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, city: e.target.value })}
                          placeholder="New York"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-city"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Country</Label>
                        <Input
                          value={contactSettingsForm.country ?? contactSettings?.country ?? ""}
                          onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, country: e.target.value })}
                          placeholder="United States"
                          className="bg-slate-700 border-slate-600 text-white"
                          data-testid="input-contact-country"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                      <h4 className="font-medium mb-4 text-white">Social Media Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Facebook URL</Label>
                          <Input
                            value={contactSettingsForm.facebookUrl ?? contactSettings?.facebookUrl ?? ""}
                            onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, facebookUrl: e.target.value })}
                            placeholder="https://facebook.com/yourpage"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-contact-facebook"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Twitter URL</Label>
                          <Input
                            value={contactSettingsForm.twitterUrl ?? contactSettings?.twitterUrl ?? ""}
                            onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, twitterUrl: e.target.value })}
                            placeholder="https://twitter.com/yourhandle"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-contact-twitter"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">LinkedIn URL</Label>
                          <Input
                            value={contactSettingsForm.linkedinUrl ?? contactSettings?.linkedinUrl ?? ""}
                            onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, linkedinUrl: e.target.value })}
                            placeholder="https://linkedin.com/company/yourcompany"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-contact-linkedin"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Instagram URL</Label>
                          <Input
                            value={contactSettingsForm.instagramUrl ?? contactSettings?.instagramUrl ?? ""}
                            onChange={(e) => setContactSettingsForm({ ...contactSettingsForm, instagramUrl: e.target.value })}
                            placeholder="https://instagram.com/yourhandle"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-contact-instagram"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        const data = {
                          companyName: contactSettingsForm.companyName ?? contactSettings?.companyName,
                          email: contactSettingsForm.email ?? contactSettings?.email,
                          supportEmail: contactSettingsForm.supportEmail ?? contactSettings?.supportEmail,
                          salesEmail: contactSettingsForm.salesEmail ?? contactSettings?.salesEmail,
                          phone: contactSettingsForm.phone ?? contactSettings?.phone,
                          whatsapp: contactSettingsForm.whatsapp ?? contactSettings?.whatsapp,
                          address: contactSettingsForm.address ?? contactSettings?.address,
                          city: contactSettingsForm.city ?? contactSettings?.city,
                          country: contactSettingsForm.country ?? contactSettings?.country,
                          website: contactSettingsForm.website ?? contactSettings?.website,
                          facebookUrl: contactSettingsForm.facebookUrl ?? contactSettings?.facebookUrl,
                          twitterUrl: contactSettingsForm.twitterUrl ?? contactSettings?.twitterUrl,
                          linkedinUrl: contactSettingsForm.linkedinUrl ?? contactSettings?.linkedinUrl,
                          instagramUrl: contactSettingsForm.instagramUrl ?? contactSettings?.instagramUrl,
                        };
                        updateContactSettingsMutation.mutate(data);
                      }}
                      disabled={updateContactSettingsMutation.isPending}
                      className="w-full md:w-auto"
                      data-testid="button-save-contact-settings"
                    >
                      {updateContactSettingsMutation.isPending ? "Saving..." : "Save Contact Settings"}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Review Bank Transfer Payment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Approve or reject this payment submission
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-700/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Company</span>
                  <span className="text-white font-medium" data-testid="text-review-company">{selectedPayment.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan</span>
                  <Badge variant="secondary" className="capitalize" data-testid="text-review-plan">{selectedPayment.planType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount</span>
                  <span className="text-white font-bold" data-testid="text-review-amount">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: selectedPayment.currency.toUpperCase(),
                    }).format(selectedPayment.amount / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transfer Date</span>
                  <span className="text-white" data-testid="text-review-date">{new Date(selectedPayment.transferDate).toLocaleDateString()}</span>
                </div>
                {selectedPayment.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference</span>
                    <span className="text-white font-mono" data-testid="text-review-reference">{selectedPayment.referenceNumber}</span>
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(selectedPayment.slipUrl, '_blank')}
                data-testid="button-review-view-slip"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Payment Slip
              </Button>

              <div className="space-y-2">
                <Label className="text-slate-300">Admin Notes (Optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this payment..."
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="textarea-admin-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPayment) {
                  updatePaymentStatusMutation.mutate({
                    id: selectedPayment.id,
                    status: "rejected",
                    adminNotes,
                  });
                }
              }}
              disabled={updatePaymentStatusMutation.isPending}
              data-testid="button-reject-payment"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedPayment) {
                  updatePaymentStatusMutation.mutate({
                    id: selectedPayment.id,
                    status: "approved",
                    adminNotes,
                  });
                }
              }}
              disabled={updatePaymentStatusMutation.isPending}
              data-testid="button-approve-payment"
            >
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update company details and subscription settings
            </DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Company Name</Label>
                <Input
                  value={selectedCompany.name}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="input-edit-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Account Status</Label>
                <Select
                  value={selectedCompany.accountStatus || "active"}
                  onValueChange={(value) =>
                    setSelectedCompany({ ...selectedCompany, accountStatus: value })
                  }
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Subscription Plan</Label>
                <Select
                  value={selectedCompany.subscriptionPlan || "basic"}
                  onValueChange={(value) => {
                    const plan = SUBSCRIPTION_PLANS[value as keyof typeof SUBSCRIPTION_PLANS];
                    setSelectedCompany({ 
                      ...selectedCompany, 
                      subscriptionPlan: value,
                      maxEmployees: plan?.maxEmployees || 30
                    });
                  }}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="free_trial">Free Trial (300 employees, 14 days)</SelectItem>
                    <SelectItem value="basic">Basic ($299/yr, 30 employees)</SelectItem>
                    <SelectItem value="pro">Pro ($699/yr, 100 employees)</SelectItem>
                    <SelectItem value="smart">Smart ($1,699/yr, 300 employees)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Max Employees</Label>
                <Input
                  type="number"
                  value={selectedCompany.maxEmployees || 50}
                  onChange={(e) =>
                    setSelectedCompany({ ...selectedCompany, maxEmployees: parseInt(e.target.value) })
                  }
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="input-edit-max-employees"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Start Date</Label>
                  <Input
                    type="date"
                    value={selectedCompany.subscriptionStartDate || ""}
                    onChange={(e) =>
                      setSelectedCompany({ ...selectedCompany, subscriptionStartDate: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white"
                    data-testid="input-edit-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">End Date</Label>
                  <Input
                    type="date"
                    value={selectedCompany.subscriptionEndDate || ""}
                    onChange={(e) =>
                      setSelectedCompany({ ...selectedCompany, subscriptionEndDate: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white"
                    data-testid="input-edit-end-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Notes</Label>
                <Input
                  value={selectedCompany.notes || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, notes: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Internal notes about this company"
                  data-testid="input-edit-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-slate-600 text-slate-300"
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCompany) {
                  updateCompanyMutation.mutate({
                    id: selectedCompany.id,
                    data: {
                      name: selectedCompany.name,
                      accountStatus: selectedCompany.accountStatus,
                      subscriptionPlan: selectedCompany.subscriptionPlan,
                      maxEmployees: selectedCompany.maxEmployees,
                      subscriptionStartDate: selectedCompany.subscriptionStartDate,
                      subscriptionEndDate: selectedCompany.subscriptionEndDate,
                      notes: selectedCompany.notes,
                    },
                  });
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={updateCompanyMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirm Delete</DialogTitle>
            <DialogDescription className="text-slate-400">
              {deleteType === "company" ? (
                <>
                  Are you sure you want to delete <strong>{selectedCompany?.name}</strong>? This will
                  permanently delete the company, all admin accounts, employees, and all associated data.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete admin account <strong>{selectedAdmin?.email}</strong>?
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-600 text-slate-300"
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteType === "company" && selectedCompany) {
                  deleteCompanyMutation.mutate(selectedCompany.id);
                } else if (deleteType === "admin" && selectedAdmin) {
                  deleteAdminMutation.mutate(selectedAdmin.id);
                }
              }}
              disabled={deleteCompanyMutation.isPending || deleteAdminMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteCompanyMutation.isPending || deleteAdminMutation.isPending
                ? "Deleting..."
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter your current password and a new password to update your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-slate-300">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-slate-300">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              className="border-slate-600 text-slate-300"
              data-testid="button-cancel-password"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-save-password"
            >
              {changePasswordMutation.isPending ? "Saving..." : "Save Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
