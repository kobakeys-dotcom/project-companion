import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Users,
  MapPin,
  Timer,
  Coffee,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import type { TimeEntry, Employee } from "@shared/schema";
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

interface ExportEntry {
  employeeName: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  duration: string;
  clockInLocation: string;
  clockInMapLink: string;
  clockOutLocation: string;
  clockOutMapLink: string;
}

interface AttendanceGridData {
  employees: Array<{ id: string; name: string }>;
  dates: Date[];
  attendanceMap: Map<string, Map<string, string>>; // employeeId -> (dateStr -> status)
  presentCount: number;
  absentCount: number;
  sickCount: number;
}

function generateAttendancePDF(
  gridData: AttendanceGridData,
  period: "daily" | "weekly" | "monthly",
  dateRange: { start: Date; end: Date }
) {
  const doc = new jsPDF({ orientation: period === "monthly" ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header - Simple text style matching the example
  doc.setTextColor(99, 102, 241); // Primary purple
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HRM Pro", pageWidth / 2, 20, { align: "center" });
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Human Resource Management System", pageWidth / 2, 28, { align: "center" });
  
  // Title based on period
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  let title = "";
  if (period === "daily") {
    title = `Daily Attendance Report - ${format(dateRange.start, "MMMM d, yyyy")}`;
  } else if (period === "weekly") {
    title = `Weekly Attendance Report - ${format(dateRange.start, "MMM d")} to ${format(dateRange.end, "MMM d, yyyy")}`;
  } else {
    title = `Monthly Attendance Report - ${format(dateRange.start, "MMMM yyyy")}`;
  }
  doc.text(title, pageWidth / 2, 42, { align: "center" });
  
  // Generated timestamp
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy h:mm a")}`, pageWidth / 2, 50, { align: "center" });
  
  // Build table headers
  const headers: string[] = ["Employee Name", "ID"];
  gridData.dates.forEach(date => {
    headers.push(format(date, "d"));
  });
  
  // Build table data
  const tableData: string[][] = [];
  
  gridData.employees.forEach(emp => {
    const row: string[] = [emp.name, emp.id];
    const empAttendance = gridData.attendanceMap.get(emp.id) || new Map();
    gridData.dates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const status = empAttendance.get(dateStr) || "-";
      row.push(status);
    });
    tableData.push(row);
  });
  
  // Calculate column widths based on period
  const nameColWidth = period === "monthly" ? 35 : 45;
  const idColWidth = period === "monthly" ? 20 : 30;
  
  // Table
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [30, 30, 30],
      fontStyle: "bold",
      fontSize: period === "monthly" ? 6 : 8,
      halign: "center",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    bodyStyles: {
      fontSize: period === "monthly" ? 6 : 8,
      textColor: [50, 50, 50],
      halign: "center",
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
    },
    columnStyles: {
      0: { cellWidth: nameColWidth, halign: "left" },
      1: { cellWidth: idColWidth, halign: "left" },
    },
    margin: { left: 10, right: 10 },
    styles: {
      cellPadding: 2,
      overflow: "linebreak",
    },
  });
  
  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  
  // Legend
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Legend:", 10, finalY + 15);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("P = Present        A = Absent        S = Sick Leave        - = No Record", 10, finalY + 23);
  
  // Summary
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Summary:", 10, finalY + 35);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Total Employees: ${gridData.employees.length} | Present: ${gridData.presentCount} | Absent: ${gridData.absentCount} | Sick Leave: ${gridData.sickCount}`,
    10,
    finalY + 43
  );
  
  // Save the PDF
  let filename = "";
  if (period === "daily") {
    filename = `attendance_daily_${format(dateRange.start, "yyyy-MM-dd")}.pdf`;
  } else if (period === "weekly") {
    filename = `attendance_weekly_${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  } else {
    filename = `attendance_monthly_${format(dateRange.start, "yyyy-MM")}.pdf`;
  }
  doc.save(filename);
}

function generateDetailedAttendancePDF(
  timeEntries: TimeEntry[],
  employees: Employee[],
  period: "daily" | "weekly" | "monthly"
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const now = new Date();
  let dateRange: { start: Date; end: Date };
  let title = "";

  switch (period) {
    case "daily":
      dateRange = { start: startOfDay(now), end: endOfDay(now) };
      title = `Daily Attendance Details - ${format(dateRange.start, "MMMM d, yyyy")}`;
      break;
    case "weekly":
      dateRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      title = `Weekly Attendance Details - ${format(dateRange.start, "MMM d")} to ${format(dateRange.end, "MMM d, yyyy")}`;
      break;
    case "monthly":
      dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
      title = `Monthly Attendance Details - ${format(dateRange.start, "MMMM yyyy")}`;
      break;
  }

  // Filter entries for the period
  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, dateRange);
  });

  // Create employee lookup map
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Header
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HRM Pro", pageWidth / 2, 20, { align: "center" });
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Human Resource Management System", pageWidth / 2, 28, { align: "center" });
  
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 42, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy h:mm a")}`, pageWidth / 2, 50, { align: "center" });

  // Build table data
  const tableData: string[][] = [];
  let totalMinutesAll = 0;

  // Sort entries by date and employee
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.employeeId.localeCompare(b.employeeId);
  });

  sortedEntries.forEach(entry => {
    const employee = employeeMap.get(entry.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
    
    const clockInTime = format(new Date(entry.clockIn), "h:mm a");
    const clockOutTime = entry.clockOut ? format(new Date(entry.clockOut), "h:mm a") : "Still Active";
    
    // Calculate duration
    let durationMinutes = 0;
    let durationStr = "-";
    if (entry.clockOut) {
      durationMinutes = differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn)) - (entry.breakMinutes || 0);
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      durationStr = `${hours}h ${mins}m`;
      totalMinutesAll += durationMinutes;
    }

    // Format locations
    const clockInLoc = entry.clockInLocation || (entry.clockInLatitude && entry.clockInLongitude ? 
      `${parseFloat(entry.clockInLatitude).toFixed(4)}, ${parseFloat(entry.clockInLongitude).toFixed(4)}` : "-");
    const clockOutLoc = entry.clockOutLocation || (entry.clockOutLatitude && entry.clockOutLongitude ? 
      `${parseFloat(entry.clockOutLatitude).toFixed(4)}, ${parseFloat(entry.clockOutLongitude).toFixed(4)}` : "-");

    tableData.push([
      employeeName,
      entry.employeeId,
      format(parseISO(entry.date), "MMM d, yyyy"),
      clockInTime,
      clockInLoc,
      clockOutTime,
      clockOutLoc,
      durationStr
    ]);
  });

  // Table headers
  const headers = ["Employee", "ID", "Date", "Clock In", "In Location", "Clock Out", "Out Location", "Total Hours"];

  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [30, 30, 30],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [50, 50, 50],
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 45 },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 45 },
      7: { cellWidth: 22, halign: "center" },
    },
    margin: { left: 10, right: 10 },
    styles: {
      cellPadding: 2,
      overflow: "linebreak",
    },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  const totalHours = Math.floor(totalMinutesAll / 60);
  const totalMins = totalMinutesAll % 60;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Summary:", 10, finalY + 15);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Total Records: ${tableData.length} | Total Working Hours: ${totalHours}h ${totalMins}m`,
    10,
    finalY + 23
  );

  // Save
  let filename = "";
  if (period === "daily") {
    filename = `attendance_details_daily_${format(dateRange.start, "yyyy-MM-dd")}.pdf`;
  } else if (period === "weekly") {
    filename = `attendance_details_weekly_${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  } else {
    filename = `attendance_details_monthly_${format(dateRange.start, "yyyy-MM")}.pdf`;
  }
  doc.save(filename);
}

function ClockInOutCard({ employees }: { employees: Employee[] }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(0);
  const { toast } = useToast();

  const { data: activeEntry, isLoading: loadingActive } = useQuery<TimeEntry | null>({
    queryKey: ["/api/employees", selectedEmployee, "attendance", "active"],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      const response = await fetch(`/api/employees/${selectedEmployee}/attendance/active`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedEmployee,
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/clock-in", { employeeId: selectedEmployee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", selectedEmployee, "attendance", "active"] });
      toast({ title: "Clocked in successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clock in", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/clock-out", {
        employeeId: selectedEmployee,
        breakMinutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", selectedEmployee, "attendance", "active"] });
      toast({ title: "Clocked out successfully" });
      setBreakMinutes(0);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clock out", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const employee = employees.find((e) => e.id === selectedEmployee);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Clock In/Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Employee</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger data-testid="select-clock-employee">
              <SelectValue placeholder="Choose an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <div className="space-y-4">
            {loadingActive ? (
              <Skeleton className="h-20" />
            ) : activeEntry ? (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Currently Clocked In</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Since {format(parseISO(activeEntry.clockIn as unknown as string), "h:mm a")}
                </p>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">Break time (minutes)</label>
                  <Input
                    type="number"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                    min={0}
                    data-testid="input-break-minutes"
                  />
                </div>
                <Button
                  className="w-full mt-4"
                  variant="destructive"
                  onClick={() => clockOut.mutate()}
                  disabled={clockOut.isPending}
                  data-testid="button-clock-out"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {clockOut.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Not currently clocked in</span>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => clockIn.mutate()}
                  disabled={clockIn.isPending}
                  data-testid="button-clock-in"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {clockIn.isPending ? "Clocking In..." : "Clock In"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function generateOTExcel(
  timeEntries: TimeEntry[],
  employees: Employee[],
  period: "daily" | "weekly" | "monthly"
) {
  const now = new Date();
  let dateRange: { start: Date; end: Date };
  let periodLabel = "";

  switch (period) {
    case "daily":
      dateRange = { start: startOfDay(now), end: endOfDay(now) };
      periodLabel = format(now, "yyyy-MM-dd");
      break;
    case "weekly":
      dateRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      periodLabel = `${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}`;
      break;
    case "monthly":
      dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
      periodLabel = format(now, "yyyy-MM");
      break;
  }

  const dates: Date[] = [];
  let currentDate = new Date(dateRange.start);
  while (currentDate <= dateRange.end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, dateRange);
  });

  const hoursMap = new Map<string, Map<string, number>>();
  filteredEntries.forEach(entry => {
    if (!entry.clockIn || !entry.clockOut) return;
    const clockIn = new Date(entry.clockIn);
    const clockOut = new Date(entry.clockOut);
    const totalMinutes = differenceInMinutes(clockOut, clockIn) - (entry.breakMinutes || 0);
    const hours = Math.max(0, totalMinutes / 60);
    const dateStr = entry.date;

    if (!hoursMap.has(entry.employeeId)) {
      hoursMap.set(entry.employeeId, new Map());
    }
    const empMap = hoursMap.get(entry.employeeId)!;
    empMap.set(dateStr, (empMap.get(dateStr) || 0) + hours);
  });

  const headers = ["#", "Employee Name", "Employee ID"];
  dates.forEach(date => {
    headers.push(`${format(date, "MMM d")} OT`);
  });
  headers.push("Total Hours");

  const rows: (string | number)[][] = [];
  const sortedEmployees = [...employees].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );

  sortedEmployees.forEach((emp, index) => {
    const row: (string | number)[] = [
      index + 1,
      `${emp.firstName} ${emp.lastName}`,
      emp.id,
    ];

    let totalHours = 0;
    const empHours = hoursMap.get(emp.id);
    dates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const hours = empHours?.get(dateStr) || 0;
      row.push(Math.round(hours * 100) / 100);
      totalHours += hours;
    });
    row.push(Math.round(totalHours * 100) / 100);

    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const colWidths = [
    { wch: 5 },
    { wch: 30 },
    { wch: 15 },
    ...dates.map(() => ({ wch: 12 })),
    { wch: 12 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance OT");

  const filename = `attendance_ot_${period}_${periodLabel}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export default function AttendancePage() {
  const { data: timeEntries, isLoading: loadingEntries } = useQuery<TimeEntry[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: employees, isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeOffRequests } = useQuery<Array<{
    id: string;
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }>>({
    queryKey: ["/api/time-off"],
  });

  const employeeMap = new Map(employees?.map((e) => [e.id, e]) || []);

  const today = new Date().toISOString().split("T")[0];
  const todayEntries = timeEntries?.filter((e) => e.date === today) || [];
  const clockedInNow = timeEntries?.filter((e) => !e.clockOut).length || 0;

  const totalHoursToday = todayEntries.reduce((sum, entry) => {
    if (!entry.clockOut) return sum;
    const clockIn = new Date(entry.clockIn);
    const clockOut = new Date(entry.clockOut);
    const mins = differenceInMinutes(clockOut, clockIn) - (entry.breakMinutes || 0);
    return sum + mins;
  }, 0);

  const { toast } = useToast();

  const handleExportPDF = (period: "daily" | "weekly" | "monthly") => {
    if (!timeEntries || !employees) {
      toast({
        title: "Export failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    let dateRange: { start: Date; end: Date };

    switch (period) {
      case "daily":
        dateRange = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case "weekly":
        dateRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        break;
      case "monthly":
        dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
    }

    // Generate dates for the period
    const dates: Date[] = [];
    let currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build attendance map from time entries
    const attendanceMap = new Map<string, Map<string, string>>();
    
    // Initialize all employees with all dates
    employees.forEach(emp => {
      const empMap = new Map<string, string>();
      dates.forEach(date => {
        empMap.set(format(date, "yyyy-MM-dd"), "-");
      });
      attendanceMap.set(emp.id, empMap);
    });

    // Mark leave for approved leave requests
    // S = Sick Leave, A = Absent (on approved non-sick leave)
    if (timeOffRequests) {
      timeOffRequests.forEach(request => {
        if (request.status === "approved") {
          const empMap = attendanceMap.get(request.employeeId);
          if (empMap) {
            // Check each date in the period to see if it falls within the leave request
            dates.forEach(date => {
              const dateStr = format(date, "yyyy-MM-dd");
              const startDate = parseISO(request.startDate);
              const endDate = parseISO(request.endDate);
              if (date >= startDate && date <= endDate) {
                // Mark as S for sick leave type, A for other approved leaves (absent on leave)
                const isSickLeave = request.type?.toLowerCase().includes("sick");
                empMap.set(dateStr, isSickLeave ? "S" : "A");
              }
            });
          }
        }
      });
    }

    // Mark present for employees who have time entries (overrides leave status)
    timeEntries.forEach(entry => {
      const entryDate = parseISO(entry.date);
      if (isWithinInterval(entryDate, dateRange)) {
        const dateStr = format(entryDate, "yyyy-MM-dd");
        const empMap = attendanceMap.get(entry.employeeId);
        if (empMap) {
          empMap.set(dateStr, "P");
        }
      }
    });

    // Count statuses across the full grid
    let presentCount = 0;
    let absentCount = 0;
    let sickCount = 0;

    attendanceMap.forEach(empMap => {
      empMap.forEach(status => {
        if (status === "P") presentCount++;
        else if (status === "A") absentCount++;
        else if (status === "S") sickCount++;
      });
    });

    // Build grid data
    const gridData: AttendanceGridData = {
      employees: employees.map(emp => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`
      })),
      dates,
      attendanceMap,
      presentCount,
      absentCount,
      sickCount
    };

    try {
      generateAttendancePDF(gridData, period, dateRange);
      toast({
        title: "Export successful",
        description: `${period.charAt(0).toUpperCase() + period.slice(1)} attendance report has been downloaded`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Export failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportDetailedPDF = (period: "daily" | "weekly" | "monthly") => {
    if (!timeEntries || !employees) {
      toast({
        title: "Export failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      generateDetailedAttendancePDF(timeEntries, employees, period);
      toast({
        title: "Export successful",
        description: `${period.charAt(0).toUpperCase() + period.slice(1)} detailed attendance report has been downloaded`,
      });
    } catch (error) {
      console.error("Detailed PDF generation error:", error);
      toast({
        title: "Export failed",
        description: "Failed to generate detailed PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportOTExcel = (period: "daily" | "weekly" | "monthly") => {
    if (!timeEntries || !employees) {
      toast({
        title: "Export failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      generateOTExcel(timeEntries, employees, period);
      toast({
        title: "Export successful",
        description: `${period.charAt(0).toUpperCase() + period.slice(1)} OT report has been downloaded`,
      });
    } catch (error) {
      console.error("OT Excel generation error:", error);
      toast({
        title: "Export failed",
        description: "Failed to generate OT Excel report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Attendance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track employee time and attendance</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-dropdown">
                <Download className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportPDF("daily")} data-testid="button-export-daily">
                <FileText className="h-4 w-4 mr-2" />
                Daily Report (Today)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF("weekly")} data-testid="button-export-weekly">
                <FileText className="h-4 w-4 mr-2" />
                Weekly Report (This Week)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF("monthly")} data-testid="button-export-monthly">
                <FileText className="h-4 w-4 mr-2" />
                Monthly Report (This Month)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-detailed-dropdown">
                <Clock className="h-4 w-4 mr-2" />
                Export Details
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportDetailedPDF("daily")} data-testid="button-export-detailed-daily">
                <FileText className="h-4 w-4 mr-2" />
                Daily Details (Today)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportDetailedPDF("weekly")} data-testid="button-export-detailed-weekly">
                <FileText className="h-4 w-4 mr-2" />
                Weekly Details (This Week)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportDetailedPDF("monthly")} data-testid="button-export-detailed-monthly">
                <FileText className="h-4 w-4 mr-2" />
                Monthly Details (This Month)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-ot-dropdown">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export OT
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportOTExcel("daily")} data-testid="button-export-ot-daily">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Daily OT (Today)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportOTExcel("weekly")} data-testid="button-export-ot-weekly">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Weekly OT (This Week)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportOTExcel("monthly")} data-testid="button-export-ot-monthly">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Monthly OT (This Month)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clocked In Now</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-clocked-in">
                {clockedInNow}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Entries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-today-entries">
                {todayEntries.length}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-hours">
                {formatDuration(totalHoursToday)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-entries">
                {timeEntries?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {!loadingEmployees && employees && <ClockInOutCard employees={employees} />}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEntries ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !timeEntries?.length ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-entries">
                  No time entries yet. Clock in to start tracking time.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Employee</TableHead>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead className="whitespace-nowrap">Clock In</TableHead>
                          <TableHead className="whitespace-nowrap">Selfie</TableHead>
                          <TableHead className="whitespace-nowrap">Clock In Location</TableHead>
                          <TableHead className="whitespace-nowrap">Clock Out</TableHead>
                          <TableHead className="whitespace-nowrap">Selfie</TableHead>
                          <TableHead className="whitespace-nowrap">Clock Out Location</TableHead>
                          <TableHead className="whitespace-nowrap">Break</TableHead>
                          <TableHead className="whitespace-nowrap">Total</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeEntries.slice(0, 20).map((entry) => {
                          const employee = employeeMap.get(entry.employeeId);
                          const clockIn = new Date(entry.clockIn);
                          const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
                          const totalMins = clockOut
                            ? differenceInMinutes(clockOut, clockIn) - (entry.breakMinutes || 0)
                            : 0;

                          return (
                            <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{format(parseISO(entry.date), "MMM d, yyyy")}</TableCell>
                              <TableCell className="whitespace-nowrap">{format(clockIn, "h:mm a")}</TableCell>
                              <TableCell>
                                {(entry as any).clockInSelfie ? (
                                  <img
                                    src={(entry as any).clockInSelfie}
                                    alt="Clock in selfie"
                                    className="w-10 h-10 rounded-full object-cover border-2 border-green-500 cursor-pointer"
                                    onClick={() => window.open((entry as any).clockInSelfie, '_blank')}
                                    data-testid={`img-admin-clockin-selfie-${entry.id}`}
                                  />
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px]" title={entry.clockInLocation || undefined}>
                                {entry.clockInLocation && entry.clockInLatitude && entry.clockInLongitude ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${entry.clockInLatitude},${entry.clockInLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                                    data-testid={`link-clock-in-location-${entry.id}`}
                                  >
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{entry.clockInLocation}</span>
                                  </a>
                                ) : entry.clockInLocation ? (
                                  <span className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{entry.clockInLocation}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {clockOut ? format(clockOut, "h:mm a") : "-"}
                              </TableCell>
                              <TableCell>
                                {(entry as any).clockOutSelfie ? (
                                  <img
                                    src={(entry as any).clockOutSelfie}
                                    alt="Clock out selfie"
                                    className="w-10 h-10 rounded-full object-cover border-2 border-red-500 cursor-pointer"
                                    onClick={() => window.open((entry as any).clockOutSelfie, '_blank')}
                                    data-testid={`img-admin-clockout-selfie-${entry.id}`}
                                  />
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px]" title={entry.clockOutLocation || undefined}>
                                {entry.clockOutLocation && entry.clockOutLatitude && entry.clockOutLongitude ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${entry.clockOutLatitude},${entry.clockOutLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                                    data-testid={`link-clock-out-location-${entry.id}`}
                                  >
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{entry.clockOutLocation}</span>
                                  </a>
                                ) : entry.clockOutLocation ? (
                                  <span className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{entry.clockOutLocation}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {entry.breakMinutes ? (
                                  <span className="flex items-center gap-1">
                                    <Coffee className="h-3 w-3" />
                                    {entry.breakMinutes}m
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{clockOut ? formatDuration(totalMins) : "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {entry.clockOut ? (
                                  <Badge variant="outline" className="bg-gray-500/10">
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-500/10 text-green-600">
                                    Active
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
