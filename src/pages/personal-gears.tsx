import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, HardHat, Shirt } from "lucide-react";
import type { Employee, Department } from "@shared/schema";

export default function PersonalGearsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);

  const filteredEmployees = employees?.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const dept = emp.departmentId ? deptMap.get(emp.departmentId)?.toLowerCase() || "" : "";
    return (
      fullName.includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      dept.includes(searchLower) ||
      emp.uniformSize?.toLowerCase().includes(searchLower) ||
      emp.safetyShoeSize?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const uniformIssuedCount = employees?.filter(e => e.uniformIssuedDate).length || 0;
  const safetyShoeIssuedCount = employees?.filter(e => e.safetyShoeIssuedDate).length || 0;
  const pendingUniform = (employees?.length || 0) - uniformIssuedCount;
  const pendingShoes = (employees?.length || 0) - safetyShoeIssuedCount;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personal Gears</h1>
        <p className="text-muted-foreground">
          Manage employee uniform and safety equipment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Uniforms Issued</CardTitle>
            <Shirt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{uniformIssuedCount}</div>
            <p className="text-xs text-muted-foreground">{pendingUniform} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Safety Shoes Issued</CardTitle>
            <HardHat className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{safetyShoeIssuedCount}</div>
            <p className="text-xs text-muted-foreground">{pendingShoes} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Fully Equipped</CardTitle>
            <HardHat className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {employees?.filter(e => e.uniformIssuedDate && e.safetyShoeIssuedDate).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Both uniform & shoes</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Employee Equipment Details</h2>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees, department, size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-gears"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Equipment List</CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Uniform Size</TableHead>
                    <TableHead className="text-center">Uniform Issued</TableHead>
                    <TableHead className="text-center">Shoe Size</TableHead>
                    <TableHead className="text-center">Shoes Issued</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const hasUniform = !!emp.uniformIssuedDate;
                    const hasShoes = !!emp.safetyShoeIssuedDate;
                    const isFullyEquipped = hasUniform && hasShoes;
                    
                    return (
                      <TableRow key={emp.id} data-testid={`row-gear-${emp.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                              <div className="text-sm text-muted-foreground">{emp.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {emp.departmentId ? deptMap.get(emp.departmentId) || "-" : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.uniformSize ? (
                            <Badge variant="outline">{emp.uniformSize}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatDate(emp.uniformIssuedDate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.safetyShoeSize ? (
                            <Badge variant="outline">{emp.safetyShoeSize}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatDate(emp.safetyShoeIssuedDate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isFullyEquipped ? (
                            <Badge className="bg-green-500 hover:bg-green-600">Equipped</Badge>
                          ) : hasUniform || hasShoes ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Partial</Badge>
                          ) : (
                            <Badge variant="destructive">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
