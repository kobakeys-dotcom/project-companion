import { useLocation, Link } from "@/lib/wouter-compat";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  Home,
  FileText,
  ClipboardList,
  LogOut,
  Sparkles,
  DollarSign,
  Target,
  Calculator,
  Clock,
  Receipt,
  Settings,
  GitBranch,
  BarChart3,
  FolderKanban,
  HardHat,
  UserPlus,
  Shield,
  FileWarning,
  Landmark,
  Megaphone,
  CalendarClock,
  Fingerprint,
  Camera,
  ClipboardCheck,
  UtensilsCrossed,
  ShieldAlert,
  MinusCircle,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { LogoutDialog } from "@/components/logout-dialog";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Personal Gears", url: "/personal-gears", icon: HardHat },
  { title: "Org Chart", url: "/org-chart", icon: GitBranch },
  { title: "Time Off", url: "/time-off", icon: Calendar },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Attendance Selfies", url: "/attendance-selfies", icon: Camera },
  { title: "Biometric Devices", url: "/biometric-devices", icon: Fingerprint },
  { title: "Shifts", url: "/shifts", icon: CalendarClock },
  { title: "Payroll", url: "/payroll", icon: DollarSign },
  { title: "Payroll Calculator", url: "/payroll-calculator", icon: Calculator },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Performance", url: "/performance", icon: Target },
  { title: "Appraisals", url: "/appraisals", icon: ClipboardCheck },
  { title: "Service Charges", url: "/service-charges", icon: UtensilsCrossed },
  { title: "Disciplinary", url: "/disciplinary", icon: ShieldAlert },
  { title: "Deductions", url: "/deductions", icon: MinusCircle },
  { title: "Loans", url: "/loans", icon: Wallet },
  { title: "Departments", url: "/departments", icon: Building2 },
  { title: "Projects / Branches", url: "/projects", icon: FolderKanban },
  { title: "Accommodations", url: "/accommodations", icon: Home },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Documents Status", url: "/documents-status", icon: FileWarning },
  { title: "Bank Details", url: "/bank-details", icon: Landmark },
  { title: "Recruitment", url: "/recruitment", icon: UserPlus },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "User Management", url: "/user-management", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">HRM Pro</span>
            <span className="text-xs text-muted-foreground">HR Management</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/10 p-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="p-2 rounded-md hover-elevate text-muted-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
      <LogoutDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onLogout={() => {
          setShowLogoutDialog(false);
          logout();
        }}
      />
    </Sidebar>
  );
}
