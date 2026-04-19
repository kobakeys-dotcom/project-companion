import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, AlertCircle, CheckCircle, FileWarning, Search } from "lucide-react";
import { Employee } from "@shared/schema";
import { useState, useMemo } from "react";

type DocumentStatus = "expired" | "expiring_soon" | "valid" | "not_set";

interface DocumentInfo {
  expiryDate: string | null;
  status: DocumentStatus;
  daysUntilExpiry: number | null;
}

function getDocumentStatus(expiryDate: string | null, warningMonths: number): DocumentInfo {
  if (!expiryDate) {
    return { expiryDate, status: "not_set", daysUntilExpiry: null };
  }
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const warningDays = warningMonths * 30;
  
  if (diffDays < 0) {
    return { expiryDate, status: "expired", daysUntilExpiry: diffDays };
  } else if (diffDays <= warningDays) {
    return { expiryDate, status: "expiring_soon", daysUntilExpiry: diffDays };
  }
  return { expiryDate, status: "valid", daysUntilExpiry: diffDays };
}

function DocumentCell({ info }: { info: DocumentInfo }) {
  const statusColor = {
    expired: "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800",
    expiring_soon: "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800",
    valid: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    not_set: "bg-muted/30 border-muted",
  };

  const textColor = {
    expired: "text-red-700 dark:text-red-400",
    expiring_soon: "text-amber-700 dark:text-amber-400",
    valid: "text-green-700 dark:text-green-400",
    not_set: "text-muted-foreground",
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusText = () => {
    switch (info.status) {
      case "expired":
        return `Expired (${Math.abs(info.daysUntilExpiry || 0)}d ago)`;
      case "expiring_soon":
        return `${info.daysUntilExpiry}d left`;
      case "valid":
        return "Valid";
      case "not_set":
        return "Not Set";
    }
  };

  return (
    <div className={`px-2 py-1 rounded border text-center text-xs ${statusColor[info.status]}`}>
      <div className="font-medium">{formatDate(info.expiryDate)}</div>
      <div className={`text-[10px] ${textColor[info.status]}`}>{getStatusText()}</div>
    </div>
  );
}

interface EmployeeDocuments {
  employee: Employee;
  passport: DocumentInfo;
  visa: DocumentInfo;
  workPermit: DocumentInfo;
  insurance: DocumentInfo;
  medical: DocumentInfo;
  quota: DocumentInfo;
  hasAlert: boolean;
}

function getEmployeeDocumentsRow(employee: Employee): EmployeeDocuments {
  const passport = getDocumentStatus(employee.passportExpiryDate, 3);
  const visa = getDocumentStatus(employee.visaExpiryDate, 1);
  const workPermit = getDocumentStatus(employee.workPermitExpiryDate, 1);
  const insurance = getDocumentStatus(employee.insuranceExpiryDate, 1);
  const medical = getDocumentStatus(employee.medicalExpiryDate, 1);
  const quota = getDocumentStatus(employee.quotaExpiryDate, 1);

  const allDocs = [passport, visa, workPermit, insurance, medical, quota];
  const hasAlert = allDocs.some(d => d.status === "expired" || d.status === "expiring_soon");

  return { employee, passport, visa, workPermit, insurance, medical, quota, hasAlert };
}

export default function DocumentsStatusPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { alertEmployees, employeeRows, expiredCount, expiringSoonCount, validCount } = useMemo(() => {
    if (!employees) return { alertEmployees: [], employeeRows: [], expiredCount: 0, expiringSoonCount: 0, validCount: 0 };

    const rows = employees.map(emp => getEmployeeDocumentsRow(emp));
    const alertEmps = rows.filter(r => r.hasAlert).map(r => r.employee);

    let expired = 0, expiringSoon = 0, valid = 0;
    rows.forEach(row => {
      [row.passport, row.visa, row.workPermit, row.insurance, row.medical, row.quota].forEach(doc => {
        if (doc.status === "expired") expired++;
        else if (doc.status === "expiring_soon") expiringSoon++;
        else if (doc.status === "valid") valid++;
      });
    });

    return {
      alertEmployees: alertEmps,
      employeeRows: rows,
      expiredCount: expired,
      expiringSoonCount: expiringSoon,
      validCount: valid,
    };
  }, [employees]);

  const filteredRows = useMemo(() => {
    return employeeRows.filter((row) => {
      const matchesSearch =
        searchTerm === "" ||
        `${row.employee.firstName} ${row.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === "all") return matchesSearch;
      if (statusFilter === "alert") return matchesSearch && row.hasAlert;
      
      const allDocs = [row.passport, row.visa, row.workPermit, row.insurance, row.medical, row.quota];
      const hasStatus = allDocs.some(d => d.status === statusFilter);
      return matchesSearch && hasStatus;
    });
  }, [employeeRows, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Documents Status</h1>
          <p className="text-muted-foreground">
            Track employee document expiry dates and alerts
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-expired-count">
              {expiredCount}
            </div>
            <p className="text-xs text-muted-foreground">documents need attention</p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-expiring-count">
              {expiringSoonCount}
            </div>
            <p className="text-xs text-muted-foreground">documents expiring within threshold</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Valid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-valid-count">
              {validCount}
            </div>
            <p className="text-xs text-muted-foreground">documents are up to date</p>
          </CardContent>
        </Card>
      </div>

      {alertEmployees.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <FileWarning className="h-5 w-5" />
              Employees Requiring Attention ({alertEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alertEmployees.map((emp) => (
                <Badge key={emp.id} variant="outline" className="bg-background">
                  {emp.firstName} {emp.lastName} ({emp.employeeCode || "—"})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Employee Documents</CardTitle>
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="alert">With Alerts</SelectItem>
                <SelectItem value="expired">Has Expired</SelectItem>
                <SelectItem value="expiring_soon">Has Expiring Soon</SelectItem>
                <SelectItem value="valid">Has Valid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Employee ID</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Employee Name</th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">
                    <div className="text-xs">Passport</div>
                    <div className="text-[10px] text-muted-foreground font-normal">(3 mo. warning)</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">
                    <div className="text-xs">Visa</div>
                    <div className="text-[10px] text-muted-foreground font-normal">(1 mo. warning)</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">
                    <div className="text-xs">Work Permit</div>
                    <div className="text-[10px] text-muted-foreground font-normal">(1 mo. warning)</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">
                    <div className="text-xs">Insurance</div>
                    <div className="text-[10px] text-muted-foreground font-normal">(1 mo. warning)</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">
                    <div className="text-xs">Medical</div>
                    <div className="text-[10px] text-muted-foreground font-normal">(1 mo. warning)</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium whitespace-nowrap">
                    <div className="text-xs">Quota</div>
                    <div className="text-[10px] text-muted-foreground font-normal">(1 mo. warning)</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No employees found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.employee.id} className={`border-b hover:bg-muted/30 ${row.hasAlert ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                      <td className="py-3 px-3 font-mono text-xs" data-testid={`text-employee-id-${idx}`}>
                        {row.employee.employeeCode || "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap" data-testid={`text-employee-name-${idx}`}>
                        <div className="flex items-center gap-2">
                          {row.hasAlert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          <span>{row.employee.firstName} {row.employee.lastName}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2" data-testid={`text-passport-${idx}`}>
                        <DocumentCell info={row.passport} />
                      </td>
                      <td className="py-2 px-2" data-testid={`text-visa-${idx}`}>
                        <DocumentCell info={row.visa} />
                      </td>
                      <td className="py-2 px-2" data-testid={`text-workpermit-${idx}`}>
                        <DocumentCell info={row.workPermit} />
                      </td>
                      <td className="py-2 px-2" data-testid={`text-insurance-${idx}`}>
                        <DocumentCell info={row.insurance} />
                      </td>
                      <td className="py-2 px-2" data-testid={`text-medical-${idx}`}>
                        <DocumentCell info={row.medical} />
                      </td>
                      <td className="py-2 px-2" data-testid={`text-quota-${idx}`}>
                        <DocumentCell info={row.quota} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
