import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, ChevronDown, ChevronRight } from "lucide-react";
import type { Employee, Department } from "@shared/schema";
import { useState, useMemo } from "react";

type EmployeeWithReports = Employee & { reports: EmployeeWithReports[] };

function buildHierarchy(employees: Employee[]): EmployeeWithReports[] {
  const employeeMap = new Map<string, EmployeeWithReports>();
  
  employees.forEach((emp) => {
    employeeMap.set(emp.id, { ...emp, reports: [] });
  });
  
  const roots: EmployeeWithReports[] = [];
  
  employees.forEach((emp) => {
    const empWithReports = employeeMap.get(emp.id)!;
    if (emp.managerId && employeeMap.has(emp.managerId)) {
      const manager = employeeMap.get(emp.managerId)!;
      manager.reports.push(empWithReports);
    } else {
      roots.push(empWithReports);
    }
  });
  
  return roots;
}

function EmployeeNode({ employee, level = 0 }: { employee: EmployeeWithReports; level?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasReports = employee.reports && employee.reports.length > 0;

  return (
    <div className="flex flex-col">
      <div 
        className={`flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer ${level === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}
        style={{ marginLeft: level * 24 }}
        onClick={() => hasReports && setExpanded(!expanded)}
        data-testid={`org-node-${employee.id}`}
      >
        {hasReports ? (
          <button className="p-0.5">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={employee.profileImageUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{employee.firstName} {employee.lastName}</p>
          <p className="text-sm text-muted-foreground truncate">{employee.jobTitle}</p>
        </div>
        {hasReports && (
          <Badge variant="secondary" className="shrink-0">
            {employee.reports.length} {employee.reports.length === 1 ? 'report' : 'reports'}
          </Badge>
        )}
        <Badge variant="outline" className="shrink-0">
          {employee.employmentType?.replace("_", " ")}
        </Badge>
      </div>
      {hasReports && expanded && (
        <div className="mt-2 space-y-2 border-l-2 border-muted ml-6">
          {employee.reports.map((report) => (
            <EmployeeNode key={report.id} employee={report} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentSection({ department, employees }: { department: Department; employees: Employee[] }) {
  const [expanded, setExpanded] = useState(true);
  const deptEmployees = employees.filter((e) => e.departmentId === department.id);
  
  const hierarchy = useMemo(() => buildHierarchy(deptEmployees), [deptEmployees]);

  return (
    <Card data-testid={`dept-section-${department.id}`}>
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${department.color}20` }}
          >
            <Building2 className="h-5 w-5" style={{ color: department.color || "#6366f1" }} />
          </div>
          <div className="flex-1">
            <span>{department.name}</span>
            <Badge variant="secondary" className="ml-2">
              {deptEmployees.length} {deptEmployees.length === 1 ? 'member' : 'members'}
            </Badge>
          </div>
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {deptEmployees.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No employees in this department</p>
          ) : (
            <div className="space-y-2">
              {hierarchy.map((emp) => (
                <EmployeeNode key={emp.id} employee={emp} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function OrgChartPage() {
  const { data: employees, isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments, isLoading: deptLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const isLoading = empLoading || deptLoading;

  const unassignedEmployees = employees?.filter((e) => !e.departmentId) || [];
  const unassignedHierarchy = useMemo(() => buildHierarchy(unassignedEmployees), [unassignedEmployees]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-36 sm:w-48" />
        <div className="grid gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-20 sm:h-24 w-full" />
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Organization Chart</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Visual overview of your company structure</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Building2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-500/10">
              <Users className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unassignedEmployees.length}</p>
              <p className="text-sm text-muted-foreground">Unassigned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {departments?.map((dept) => (
          <DepartmentSection 
            key={dept.id} 
            department={dept} 
            employees={employees || []} 
          />
        ))}

        {unassignedEmployees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <span>Unassigned Employees</span>
                <Badge variant="secondary">{unassignedEmployees.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unassignedHierarchy.map((emp) => (
                  <EmployeeNode key={emp.id} employee={emp} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
