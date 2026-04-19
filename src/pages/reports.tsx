import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Building2,
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Employee, Department, TimeOffRequest, PayrollRecord, Goal, TimeEntry } from "@shared/schema";
import { differenceInDays, startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { useCompanySettings, formatMoneyCents } from "@/hooks/use-company-settings";

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendDirection 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  trend?: number;
  trendDirection?: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trendDirection === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {trend}%
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function EmploymentTypeChart({ employees }: { employees: Employee[] }) {
  const types = employees.reduce((acc, emp) => {
    const type = emp.employmentType || "full_time";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeLabels: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contractor: "Contractor",
    intern: "Intern",
  };

  const colors: Record<string, string> = {
    full_time: "bg-blue-500",
    part_time: "bg-green-500",
    contractor: "bg-orange-500",
    intern: "bg-purple-500",
  };

  const total = employees.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Employment Types
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(types).map(([type, count]) => (
            <div key={type}>
              <div className="flex justify-between text-sm mb-1">
                <span>{typeLabels[type] || type}</span>
                <span className="text-muted-foreground">{count as number} ({Math.round((Number(count) / total) * 100)}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colors[type] || 'bg-gray-500'} rounded-full`}
                  style={{ width: `${(Number(count) / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentDistribution({ employees, departments }: { employees: Employee[]; departments: Department[] }) {
  const deptCounts = employees.reduce((acc, emp) => {
    const deptId = emp.departmentId || "unassigned";
    acc[deptId] = (acc[deptId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = employees.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Department Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {departments.map((dept) => {
            const count = deptCounts[dept.id] || 0;
            return (
              <div key={dept.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{dept.name}</span>
                  <span className="text-muted-foreground">{count as number}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: total > 0 ? `${(Number(count) / total) * 100}%` : '0%',
                      backgroundColor: dept.color || '#6366f1'
                    }}
                  />
                </div>
              </div>
            );
          })}
          {deptCounts["unassigned"] > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Unassigned</span>
                <span className="text-muted-foreground">{deptCounts["unassigned"]}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-400 rounded-full"
                  style={{ width: `${(deptCounts["unassigned"] / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TimeOffSummary({ timeOff }: { timeOff: TimeOffRequest[] }) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthStr = format(now, "MMMM yyyy");

  const thisMonth = timeOff.filter((t) => {
    const start = parseISO(t.startDate);
    return start >= monthStart && start <= monthEnd;
  });

  const byStatus = timeOff.reduce((acc, t) => {
    acc[t.status || "pending"] = (acc[t.status || "pending"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byType = timeOff.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Time Off Summary
        </CardTitle>
        <CardDescription>{monthStr}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <p className="text-2xl font-bold text-yellow-600">{byStatus["pending"] || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <p className="text-2xl font-bold text-green-600">{byStatus["approved"] || 0}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <p className="text-2xl font-bold text-red-600">{byStatus["rejected"] || 0}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">By Type</p>
          <div className="space-y-2">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="capitalize">{type.replace("_", " ")}</span>
                <span className="text-muted-foreground">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsSummary({ goals }: { goals: Goal[] }) {
  const byStatus = goals.reduce((acc, g) => {
    acc[g.status || "not_started"] = (acc[g.status || "not_started"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = goals.length;
  const completed = byStatus["completed"] || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Goals Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{completionRate}%</p>
          <p className="text-sm text-muted-foreground">Completion Rate</p>
        </div>
        <Progress value={completionRate} className="h-3" />
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">{byStatus["completed"] || 0}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-xl font-bold">{byStatus["in_progress"] || 0}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { data: employees, isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments, isLoading: deptLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: timeOff, isLoading: timeOffLoading } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/time-off"],
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/payroll"],
  });

  const { data: settings } = useCompanySettings();
  const currency = settings?.defaultCurrency || "USD";

  const isLoading = empLoading || deptLoading || timeOffLoading || goalsLoading || payrollLoading;

  const activeEmployees = employees?.filter((e) => e.employmentStatus === "active") || [];
  const totalPayroll = payroll?.reduce((sum, p) => sum + (p.netPay || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-36 sm:w-48" />
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm sm:text-base text-muted-foreground">HR metrics and organizational insights</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Employees"
          value={employees?.length || 0}
          icon={Users}
          trend={12}
          trendDirection="up"
        />
        <StatCard
          title="Active Employees"
          value={activeEmployees.length}
          subtitle={`${employees?.length ? Math.round((activeEmployees.length / employees.length) * 100) : 0}% of total`}
          icon={TrendingUp}
        />
        <StatCard
          title="Departments"
          value={departments?.length || 0}
          icon={Building2}
        />
        <StatCard
          title="Total Payroll"
          value={formatMoneyCents(totalPayroll, currency)}
          subtitle="This period"
          icon={DollarSign}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-reports-overview">Overview</TabsTrigger>
          <TabsTrigger value="workforce" data-testid="tab-reports-workforce">Workforce</TabsTrigger>
          <TabsTrigger value="time" data-testid="tab-reports-time">Time & Leave</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-reports-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EmploymentTypeChart employees={employees || []} />
            <DepartmentDistribution employees={employees || []} departments={departments || []} />
            <GoalsSummary goals={goals || []} />
          </div>
        </TabsContent>

        <TabsContent value="workforce">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmploymentTypeChart employees={employees || []} />
            <DepartmentDistribution employees={employees || []} departments={departments || []} />
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Employee Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div className="p-6 rounded-lg bg-green-500/10">
                    <p className="text-3xl font-bold text-green-600">
                      {employees?.filter((e) => e.employmentStatus === "active").length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Active</p>
                  </div>
                  <div className="p-6 rounded-lg bg-yellow-500/10">
                    <p className="text-3xl font-bold text-yellow-600">
                      {employees?.filter((e) => e.employmentStatus === "on_leave").length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">On Leave</p>
                  </div>
                  <div className="p-6 rounded-lg bg-red-500/10">
                    <p className="text-3xl font-bold text-red-600">
                      {employees?.filter((e) => e.employmentStatus === "terminated").length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Terminated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TimeOffSummary timeOff={timeOff || []} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Attendance analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GoalsSummary goals={goals || []} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Review analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
