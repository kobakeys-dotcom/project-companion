import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Calendar,
  Building2,
  TrendingUp,
  Clock,
  UserPlus,
  Receipt,
  Briefcase,
} from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingTimeOff: number;
  departmentCount: number;
  newHiresThisMonth: number;
  onLeaveToday: number;
  pendingExpenses: number;
  openJobs: number;
}

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  profileImageUrl: string | null;
  employmentStatus: string;
  startDate: string | null;
};

type TimeOffRow = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
  type: string | null;
};

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">{title}</p>
            <p className="text-xl sm:text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 flex items-center gap-1">
                {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeListItem({ employee }: { employee: EmployeeRow }) {
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
      <Avatar className="h-10 w-10">
        <AvatarImage src={employee.profileImageUrl || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {employee.firstName} {employee.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{employee.jobTitle}</p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {employee.employmentStatus === "active" ? "Active" : employee.employmentStatus}
      </Badge>
    </div>
  );
}

function TimeOffRequestItem({
  request,
  employee,
}: {
  request: TimeOffRow;
  employee?: EmployeeRow;
}) {
  const statusColor =
    request.status === "approved"
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : request.status === "rejected"
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {employee ? `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}` : "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground">
          {request.type ?? "Leave"} · {format(parseISO(request.startDate), "MMM d")} →{" "}
          {format(parseISO(request.endDate), "MMM d")}
        </p>
      </div>
      <Badge className={statusColor}>{request.status}</Badge>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setCompanyId(profile?.company_id ?? null);
    })();
  }, [user]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

    (async () => {
      const [empRes, toRes, deptRes, expRes, jobsRes] = await Promise.all([
        supabase
          .from("employees")
          .select(
            'id, firstName, lastName, jobTitle, profileImageUrl, employmentStatus, startDate'
          )
          .eq("companyId", companyId)
          .order("createdAt", { ascending: false }),
        supabase
          .from("time_off_requests")
          .select("id, employeeId, startDate, endDate, status, type")
          .eq("companyId", companyId)
          .order("createdAt", { ascending: false }),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("companyId", companyId),
        supabase
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("companyId", companyId)
          .eq("status", "pending"),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("companyId", companyId)
          .eq("status", "open"),
      ]);

      const emps = (empRes.data ?? []) as EmployeeRow[];
      const tos = (toRes.data ?? []) as TimeOffRow[];

      setEmployees(emps);
      setTimeOff(tos);
      setStats({
        totalEmployees: emps.length,
        activeEmployees: emps.filter((e) => e.employmentStatus === "active").length,
        pendingTimeOff: tos.filter((r) => r.status === "pending").length,
        departmentCount: deptRes.count ?? 0,
        newHiresThisMonth: emps.filter((e) => e.startDate && e.startDate >= monthStart).length,
        onLeaveToday: tos.filter(
          (r) => r.status === "approved" && r.startDate <= today && r.endDate >= today
        ).length,
        pendingExpenses: expRes.count ?? 0,
        openJobs: jobsRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, [companyId]);

  const recentEmployees = employees.slice(0, 5);
  const pendingRequests = timeOff.filter((r) => r.status === "pending").slice(0, 5);
  const getEmployeeById = (id: string) => employees.find((e) => e.id === id);

  if (loading || !stats) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-4 w-20 sm:w-24 mb-2" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your organization</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          subtitle={stats.newHiresThisMonth ? `+${stats.newHiresThisMonth} this month` : undefined}
          trend="up"
        />
        <StatCard title="On Leave Today" value={stats.onLeaveToday} icon={Calendar} />
        <StatCard title="Pending Time Off" value={stats.pendingTimeOff} icon={Clock} />
        <StatCard title="Departments" value={stats.departmentCount} icon={Building2} />
        <StatCard title="Active Employees" value={stats.activeEmployees} icon={Users} />
        <StatCard title="Pending Expenses" value={stats.pendingExpenses} icon={Receipt} />
        <StatCard title="Open Jobs" value={stats.openJobs} icon={Briefcase} />
        <StatCard title="New Hires (Month)" value={stats.newHiresThisMonth} icon={UserPlus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Pending Time Off Requests</CardTitle>
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingRequests.map((request) => (
                    <TimeOffRequestItem
                      key={request.id}
                      request={request}
                      employee={getEmployeeById(request.employeeId)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">Recent Employees</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {recentEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No employees yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentEmployees.map((employee) => (
                    <EmployeeListItem key={employee.id} employee={employee} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
