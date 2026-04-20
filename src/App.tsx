import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { queryClient } from "@/lib/queryClient";

import LandingPage from "@/pages/landing";
import ContactPage from "@/pages/contact";
import DashboardPage from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees";
import EmployeeProfilePage from "@/pages/employee-profile";
import PersonalGearsPage from "@/pages/personal-gears";
import TimeOffPage from "@/pages/time-off";
import DepartmentsPage from "@/pages/departments";
import ProjectsPage from "@/pages/projects";
import AccommodationsPage from "@/pages/accommodations";
import DocumentsPage from "@/pages/documents";
import DocumentsStatusPage from "@/pages/documents-status";
import BankDetailsPage from "@/pages/bank-details";
import OnboardingPage from "@/pages/onboarding";
import RecruitmentPage from "@/pages/recruitment";
import PayrollPage from "@/pages/payroll";
import PayrollCalculatorPage from "@/pages/payroll-calculator";
import PerformancePage from "@/pages/performance";
import AttendancePage from "@/pages/attendance";
import ExpensesPage from "@/pages/expenses";
import BenefitsPage from "@/pages/benefits";
import SettingsPage from "@/pages/settings";
import OrgChartPage from "@/pages/org-chart";
import ReportsPage from "@/pages/reports";
import AdminRegisterPage from "@/pages/admin-register";
import AdminLoginPage from "@/pages/admin-login";
import EmployeeLoginPage from "@/pages/employee-login";
import EmployeePortalPage from "@/pages/employee-portal";
import SuperAdminLoginPage from "@/pages/super-admin-login";
import SuperAdminDashboardPage from "@/pages/super-admin-dashboard";
import { DeptApprovalPage, MgmtApprovalPage } from "@/pages/approval";
import { LoanDeptApprovalPage, LoanMgmtApprovalPage } from "@/pages/loan-approval";
import LoansPage from "@/pages/loans";
import PricingPage from "@/pages/pricing";
import SubscriptionSuccessPage from "@/pages/subscription-success";
import SubscriptionCancelPage from "@/pages/subscription-cancel";
import SubscriptionPendingPage from "@/pages/subscription-pending";
import BankTransferCheckoutPage from "@/pages/bank-transfer-checkout";
import UserManagementPage from "@/pages/user-management";
import CareersPage from "@/pages/careers";
import AnnouncementsPage from "@/pages/announcements";
import ShiftsPage from "@/pages/shifts";
import BiometricDevicesPage from "@/pages/biometric-devices";
import AttendanceSelfiesPage from "@/pages/attendance-selfies";
import AppraisalPage from "@/pages/appraisal";
import ServiceChargesPage from "@/pages/service-charges";
import DisciplinaryPage from "@/pages/disciplinary";
import DeductionsPage from "@/pages/deductions";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <SubscriptionBanner />
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center animate-pulse">
            <Skeleton className="h-6 w-6" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace state={{ from: location.pathname }} />;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/admin/register" element={<AdminRegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/employee/login" element={<EmployeeLoginPage />} />
            <Route path="/employee/portal" element={<EmployeePortalPage />} />
            <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
            <Route path="/super-admin" element={<SuperAdminDashboardPage />} />
            <Route path="/approve/dept/:id" element={<DeptApprovalPage />} />
            <Route path="/approve/mgmt/:id" element={<MgmtApprovalPage />} />
            <Route path="/approve/loan/dept/:id" element={<LoanDeptApprovalPage />} />
            <Route path="/approve/loan/mgmt/:id" element={<LoanMgmtApprovalPage />} />
            <Route path="/careers" element={<CareersPage />} />

            {/* Protected app routes */}
            <Route path="/" element={<ProtectedShell><DashboardPage /></ProtectedShell>} />
            <Route path="/dashboard" element={<ProtectedShell><DashboardPage /></ProtectedShell>} />
            <Route path="/employees" element={<ProtectedShell><EmployeesPage /></ProtectedShell>} />
            <Route path="/employees/:id" element={<ProtectedShell><EmployeeProfilePage /></ProtectedShell>} />
            <Route path="/personal-gears" element={<ProtectedShell><PersonalGearsPage /></ProtectedShell>} />
            <Route path="/time-off" element={<ProtectedShell><TimeOffPage /></ProtectedShell>} />
            <Route path="/attendance" element={<ProtectedShell><AttendancePage /></ProtectedShell>} />
            <Route path="/payroll" element={<ProtectedShell><PayrollPage /></ProtectedShell>} />
            <Route path="/payroll-calculator" element={<ProtectedShell><PayrollCalculatorPage /></ProtectedShell>} />
            <Route path="/performance" element={<ProtectedShell><PerformancePage /></ProtectedShell>} />
            <Route path="/appraisals" element={<ProtectedShell><AppraisalPage /></ProtectedShell>} />
            <Route path="/expenses" element={<ProtectedShell><ExpensesPage /></ProtectedShell>} />
            <Route path="/benefits" element={<ProtectedShell><BenefitsPage /></ProtectedShell>} />
            <Route path="/departments" element={<ProtectedShell><DepartmentsPage /></ProtectedShell>} />
            <Route path="/projects" element={<ProtectedShell><ProjectsPage /></ProtectedShell>} />
            <Route path="/accommodations" element={<ProtectedShell><AccommodationsPage /></ProtectedShell>} />
            <Route path="/documents" element={<ProtectedShell><DocumentsPage /></ProtectedShell>} />
            <Route path="/documents-status" element={<ProtectedShell><DocumentsStatusPage /></ProtectedShell>} />
            <Route path="/bank-details" element={<ProtectedShell><BankDetailsPage /></ProtectedShell>} />
            <Route path="/onboarding" element={<ProtectedShell><OnboardingPage /></ProtectedShell>} />
            <Route path="/recruitment" element={<ProtectedShell><RecruitmentPage /></ProtectedShell>} />
            <Route path="/org-chart" element={<ProtectedShell><OrgChartPage /></ProtectedShell>} />
            <Route path="/reports" element={<ProtectedShell><ReportsPage /></ProtectedShell>} />
            <Route path="/settings" element={<ProtectedShell><SettingsPage /></ProtectedShell>} />
            <Route path="/user-management" element={<ProtectedShell><UserManagementPage /></ProtectedShell>} />
            <Route path="/announcements" element={<ProtectedShell><AnnouncementsPage /></ProtectedShell>} />
            <Route path="/shifts" element={<ProtectedShell><ShiftsPage /></ProtectedShell>} />
            <Route path="/biometric-devices" element={<ProtectedShell><BiometricDevicesPage /></ProtectedShell>} />
            <Route path="/attendance-selfies" element={<ProtectedShell><AttendanceSelfiesPage /></ProtectedShell>} />
            <Route path="/service-charges" element={<ProtectedShell><ServiceChargesPage /></ProtectedShell>} />
            <Route path="/disciplinary" element={<ProtectedShell><DisciplinaryPage /></ProtectedShell>} />
            <Route path="/deductions" element={<ProtectedShell><DeductionsPage /></ProtectedShell>} />
            <Route path="/loans" element={<ProtectedShell><LoansPage /></ProtectedShell>} />
            <Route path="/pricing" element={<ProtectedShell><PricingPage /></ProtectedShell>} />
            <Route path="/subscription/success" element={<ProtectedShell><SubscriptionSuccessPage /></ProtectedShell>} />
            <Route path="/subscription/cancel" element={<ProtectedShell><SubscriptionCancelPage /></ProtectedShell>} />
            <Route path="/subscription/pending" element={<ProtectedShell><SubscriptionPendingPage /></ProtectedShell>} />
            <Route path="/bank-transfer-checkout" element={<ProtectedShell><BankTransferCheckoutPage /></ProtectedShell>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
