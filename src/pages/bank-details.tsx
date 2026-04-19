import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Landmark, Search, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { Employee } from "@shared/schema";
import { useState, useMemo } from "react";

export default function BankDetailsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { filteredEmployees, stats } = useMemo(() => {
    if (!employees) return { filteredEmployees: [], stats: { total: 0, withBank: 0, withoutBank: 0 } };
    
    let withBank = 0;
    let withoutBank = 0;
    
    employees.forEach((emp) => {
      const hasAnyBank = emp.bankName1 || emp.accountNumber1 || emp.currency1 || 
                         emp.bankName2 || emp.accountNumber2 || emp.currency2;
      if (hasAnyBank) {
        withBank++;
      } else {
        withoutBank++;
      }
    });

    const filtered = searchTerm 
      ? employees.filter((emp) =>
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : employees;
    
    return { 
      filteredEmployees: filtered, 
      stats: { total: employees.length, withBank, withoutBank } 
    };
  }, [employees, searchTerm]);

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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Landmark className="h-6 w-6" />
            Bank Details
          </h1>
          <p className="text-muted-foreground">
            View employee bank account information
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-count">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">employees in system</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Accounts Open</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-open-count">
              {stats.withBank}
            </div>
            <p className="text-xs text-muted-foreground">employees with bank details</p>
          </CardContent>
        </Card>
        
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Not Open</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-not-open-count">
              {stats.withoutBank}
            </div>
            <p className="text-xs text-muted-foreground">employees without bank details</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Bank Accounts</CardTitle>
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Employee ID</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Employee Name</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Bank Name 1</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Account Number 1</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Currency 1</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Bank Name 2</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Account Number 2</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Currency 2</th>
                  <th className="text-center py-3 px-3 font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => {
                    const hasAnyBankDetails = emp.bankName1 || emp.accountNumber1 || emp.currency1 || 
                                              emp.bankName2 || emp.accountNumber2 || emp.currency2;
                    return (
                      <tr key={emp.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-3 font-mono text-xs" data-testid={`text-bank-emp-id-${idx}`}>
                          {emp.employeeCode || "—"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap" data-testid={`text-bank-emp-name-${idx}`}>
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="py-3 px-3" data-testid={`text-bank1-name-${idx}`}>
                          {emp.bankName1 || ""}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs" data-testid={`text-bank1-account-${idx}`}>
                          {emp.accountNumber1 || ""}
                        </td>
                        <td className="py-3 px-3" data-testid={`text-bank1-currency-${idx}`}>
                          {emp.currency1 || ""}
                        </td>
                        <td className="py-3 px-3" data-testid={`text-bank2-name-${idx}`}>
                          {emp.bankName2 || ""}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs" data-testid={`text-bank2-account-${idx}`}>
                          {emp.accountNumber2 || ""}
                        </td>
                        <td className="py-3 px-3" data-testid={`text-bank2-currency-${idx}`}>
                          {emp.currency2 || ""}
                        </td>
                        <td className="py-3 px-3 text-center" data-testid={`text-bank-status-${idx}`}>
                          {!hasAnyBankDetails && (
                            <span className="text-muted-foreground italic text-xs">Not Open</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
