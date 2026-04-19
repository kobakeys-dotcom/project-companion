import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@/lib/wouter-compat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  Globe,
  Clock,
  DollarSign,
  Calendar,
  Save,
  CreditCard,
  Users,
  Zap,
  AlertTriangle,
  Crown,
  Download,
  Upload,
  Loader2,
  Database,
  Shield,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CompanySettings } from "@shared/schema";

interface SubscriptionInfo {
  companyId: string;
  companyName: string;
  currentPlan: string;
  planName: string;
  planPrice: string;
  maxEmployees: number;
  employeeCount: number;
  employeesRemaining: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  upgradePlans: Array<{ plan: string; name: string; maxEmployees: number; price: number | null; priceDisplay: string }>;
  accountStatus: string;
}

const settingsFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  fiscalYearStart: z.string().optional(),
  defaultCurrency: z.string().optional(),
  workWeekDays: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const currencies = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "LKR", name: "Sri Lankan Rupee" },
];

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });

  const { data: subscription, isLoading: loadingSubscription } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: settings?.companyName || "My Company",
      industry: settings?.industry || "",
      website: settings?.website || "",
      address: settings?.address || "",
      city: settings?.city || "",
      country: settings?.country || "",
      timezone: settings?.timezone || "UTC",
      fiscalYearStart: settings?.fiscalYearStart || "January",
      defaultCurrency: settings?.defaultCurrency || "USD",
      workWeekDays: settings?.workWeekDays || "Mon,Tue,Wed,Thu,Fri",
    },
    values: settings ? {
      companyName: settings.companyName,
      industry: settings.industry || "",
      website: settings.website || "",
      address: settings.address || "",
      city: settings.city || "",
      country: settings.country || "",
      timezone: settings.timezone || "UTC",
      fiscalYearStart: settings.fiscalYearStart || "January",
      defaultCurrency: settings.defaultCurrency || "USD",
      workWeekDays: settings.workWeekDays || "Mon,Tue,Wed,Thu,Fri",
    } : undefined,
  });

  const updateSettings = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PATCH", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-9 sm:h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Configure your company settings and preferences</p>
      </div>

      {/* Subscription Panel */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription & Plan
          </CardTitle>
          <CardDescription>View your current subscription status and upgrade options</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubscription ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : subscription ? (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${
                    subscription.currentPlan === "enterprise" ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20" :
                    subscription.currentPlan === "smart" ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20" :
                    subscription.currentPlan === "pro" ? "bg-blue-500/20" :
                    subscription.currentPlan === "free_trial" ? "bg-purple-500/20" :
                    "bg-slate-500/20"
                  }`}>
                    <Crown className={`h-6 w-6 ${
                      subscription.currentPlan === "enterprise" ? "text-yellow-500" :
                      subscription.currentPlan === "smart" ? "text-purple-500" :
                      subscription.currentPlan === "pro" ? "text-blue-500" :
                      subscription.currentPlan === "free_trial" ? "text-purple-500" :
                      "text-slate-500"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{subscription.planName}</span>
                      <Badge variant={subscription.isTrialActive ? "secondary" : subscription.isExpired ? "destructive" : "default"}>
                        {subscription.isTrialActive ? "Trial" : subscription.isExpired ? "Expired" : "Active"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{subscription.planPrice}</p>
                  </div>
                </div>
                {subscription.daysRemaining > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {subscription.isTrialActive ? "Trial ends in" : "Renews in"}
                    </p>
                    <p className={`font-semibold ${subscription.daysRemaining <= 7 ? "text-orange-500" : ""}`}>
                      {subscription.daysRemaining} days
                    </p>
                  </div>
                )}
              </div>

              {/* Employee Usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Employee Usage</span>
                  </div>
                  <span className="text-sm">
                    <span className={subscription.isAtLimit ? "text-red-500 font-semibold" : subscription.isNearLimit ? "text-orange-500 font-semibold" : ""}>
                      {subscription.employeeCount}
                    </span>
                    <span className="text-muted-foreground"> / {subscription.maxEmployees} employees</span>
                  </span>
                </div>
                <Progress 
                  value={(subscription.employeeCount / subscription.maxEmployees) * 100} 
                  className={`h-2 ${subscription.isAtLimit ? "[&>div]:bg-red-500" : subscription.isNearLimit ? "[&>div]:bg-orange-500" : ""}`}
                />
                {subscription.isAtLimit && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Employee limit reached. Upgrade your plan to add more employees.</span>
                  </div>
                )}
                {subscription.isNearLimit && !subscription.isAtLimit && (
                  <div className="flex items-center gap-2 text-orange-500 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Approaching employee limit ({subscription.employeesRemaining} remaining)</span>
                  </div>
                )}
              </div>

              {/* Upgrade Options */}
              {subscription.upgradePlans.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Upgrade Options
                    </h4>
                    <Link href="/pricing">
                      <Button size="sm" variant="default" data-testid="button-view-all-plans">
                        View All Plans
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subscription.upgradePlans.slice(0, 3).map((plan) => (
                      <Link 
                        key={plan.plan} 
                        href="/pricing"
                        className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer block"
                        data-testid={`upgrade-plan-${plan.plan}`}
                      >
                        <div className="font-medium" data-testid={`text-plan-name-${plan.plan}`}>{plan.name}</div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-plan-employees-${plan.plan}`}>Up to {plan.maxEmployees} employees</div>
                        <div className="text-sm font-semibold text-primary mt-1" data-testid={`text-plan-price-${plan.plan}`}>{plan.priceDisplay}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load subscription information</p>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Basic information about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your Company Name" data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Technology" data-testid="input-industry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com" data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Location
              </CardTitle>
              <CardDescription>Company location and regional settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street address" data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Country" data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Settings
              </CardTitle>
              <CardDescription>Currency and fiscal year configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code} - {c.name}
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
                  name="fiscalYearStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Year Start</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-fiscal-year">
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["January", "February", "March", "April", "May", "June", 
                            "July", "August", "September", "October", "November", "December"].map((month) => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Work Schedule
              </CardTitle>
              <CardDescription>Configure work week settings</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="workWeekDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Week Days</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mon,Tue,Wed,Thu,Fri" data-testid="input-work-days" />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of work days (e.g., Mon,Tue,Wed,Thu,Fri)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-settings">
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>

      <Separator className="my-8" />

      <DataManagement />
    </div>
  );
}

function DataManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [backupFile, setBackupFile] = useState<any>(null);
  const [backupInfo, setBackupInfo] = useState<{ exportedAt: string; companyName: string; counts: Record<string, number> } | null>(null);

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/backup/download", { credentials: "include" });
      if (!response.ok) throw new Error("Backup failed");

      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] || "hrmpro-backup.json";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Backup downloaded", description: "Your company data backup has been saved." });
    } catch {
      toast({ title: "Backup failed", description: "Could not download backup.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data || !parsed.exportedAt) {
          toast({ title: "Invalid file", description: "This does not appear to be a valid HRM Pro backup file.", variant: "destructive" });
          return;
        }

        const counts: Record<string, number> = {};
        for (const [key, val] of Object.entries(parsed.data)) {
          if (Array.isArray(val)) counts[key] = val.length;
        }

        setBackupFile(parsed);
        setBackupInfo({
          exportedAt: parsed.exportedAt,
          companyName: parsed.companyName || "Unknown",
          counts,
        });
        setShowRestoreConfirm(true);
      } catch {
        toast({ title: "Invalid file", description: "Could not parse the backup file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRestore = async () => {
    if (!backupFile) return;
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(backupFile),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      toast({
        title: result.warnings ? "Backup restored with warnings" : "Backup restored",
        description: `Restored ${result.summary?.employees || 0} employees, ${result.summary?.departments || 0} departments, and more.${result.warnings ? ` (${result.warnings.length} warnings)` : ""}`,
      });

      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
    } finally {
      setIsRestoring(false);
      setBackupFile(null);
      setBackupInfo(null);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold tracking-tight mb-4">Data Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Backup
            </CardTitle>
            <CardDescription>
              Download a complete JSON backup of all your company data including employees, attendance, time-off, payroll, documents, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              className="w-full"
              data-testid="button-download-backup-settings"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading ? "Downloading..." : "Download Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore Backup
            </CardTitle>
            <CardDescription>
              Upload a previously downloaded backup file to restore your company data. This will replace all existing data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-restore-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="w-full"
              data-testid="button-restore-backup"
            >
              {isRestoring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isRestoring ? "Restoring..." : "Upload & Restore Backup"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent data-testid="dialog-restore-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Data Restore
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will <strong>permanently replace</strong> all existing company data with the backup data. This action cannot be undone.
                </p>
                {backupInfo && (
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                    <p><strong>Backup from:</strong> {backupInfo.companyName}</p>
                    <p><strong>Created:</strong> {new Date(backupInfo.exportedAt).toLocaleString()}</p>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {Object.entries(backupInfo.counts).map(([key, count]) => (
                        <span key={key} className="text-muted-foreground">
                          {key}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-destructive font-medium">
                  It is strongly recommended to download a backup of your current data first.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-restore"
            >
              <Database className="h-4 w-4 mr-2" />
              Yes, Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
