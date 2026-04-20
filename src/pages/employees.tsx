import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@/lib/wouter-compat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Building2,
  Users,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee, Department, Project, Accommodation, AccommodationRoom, InsertEmployee, TimeOffRequest } from "@shared/schema";
import {
  EMPLOYEE_CSV_HEADERS,
  importEmployeesFromCsv,
  exportEmployeesXlsx,
  exportEmployeesPdf,
} from "@/lib/employee-io";

const employeeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  employeeCode: z.string().min(1, "Employee ID is required (used for portal login)").max(50),
  phone: z.string().optional(),
  password: z.string().refine(val => val === "" || val.length >= 6, {
    message: "Password must be at least 6 characters"
  }),
  jobTitle: z.string().min(1, "Job title is required"),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  accommodationId: z.string().optional(),
  roomId: z.string().optional(),
  employmentType: z.enum(["full_time", "part_time", "contractor", "intern"]),
  employmentStatus: z.enum(["active", "on_leave", "resigned", "terminated"]),
  startDate: z.string().min(1, "Start date is required"),
  salary: z.number().optional(),
  // Contract Details
  lastPromotionDate: z.string().optional(),
  contractType: z.string().optional(),
  contractSignedDate: z.string().optional(),
  contractExpiryDate: z.string().optional(),
  // Personal Details
  dateOfBirth: z.string().optional(),
  permanentAddress: z.string().optional(),
  // Salary Package Breakdown
  basicSalary: z.number().optional(),
  fixedAllowance: z.number().optional(),
  dutyAllowance: z.number().optional(),
  attendanceAllowance: z.number().optional(),
  accommodationAllowance: z.number().optional(), // Living Allowance
  additionalServiceAllowance: z.number().optional(),
  pensionEnabled: z.boolean().optional(),
  pensionPercentage: z.number().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  visaNumber: z.string().optional(),
  visaExpiryDate: z.string().optional(),
  workPermitNumber: z.string().optional(),
  workPermitExpiryDate: z.string().optional(),
  insuranceExpiryDate: z.string().optional(),
  medicalExpiryDate: z.string().optional(),
  quotaExpiryDate: z.string().optional(),
  bankName1: z.string().optional(),
  accountNumber1: z.string().optional(),
  currency1: z.string().optional(),
  bankName2: z.string().optional(),
  accountNumber2: z.string().optional(),
  currency2: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  uniformSize: z.string().optional(),
  uniformIssuedDate: z.string().optional(),
  safetyShoeSize: z.string().optional(),
  safetyShoeIssuedDate: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

const editEmployeeFormSchema = employeeFormSchema.omit({ password: true });
type EditEmployeeFormData = z.infer<typeof editEmployeeFormSchema>;

function EditEmployeeDialog({ 
  employee, 
  departments, 
  projects,
  accommodations, 
  onClose 
}: { 
  employee: Employee; 
  departments: Department[]; 
  projects: Project[];
  accommodations: Accommodation[]; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedAccommodationId, setSelectedAccommodationId] = useState(employee.accommodationId || "");

  const { data: rooms } = useQuery<AccommodationRoom[]>({
    queryKey: ["/api/accommodations", selectedAccommodationId, "rooms"],
    enabled: !!selectedAccommodationId,
  });

  const form = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeFormSchema),
    defaultValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      employeeCode: (employee as any).employeeCode || "",
      phone: employee.phone || "",
      jobTitle: employee.jobTitle,
      departmentId: employee.departmentId || "",
      projectId: employee.projectId || "",
      accommodationId: employee.accommodationId || "",
      roomId: employee.roomId || "",
      employmentType: employee.employmentType || "full_time",
      employmentStatus: employee.employmentStatus || "active",
      startDate: employee.startDate,
      salary: employee.salary || undefined,
      lastPromotionDate: (employee as any).lastPromotionDate || "",
      contractType: (employee as any).contractType || "",
      contractSignedDate: (employee as any).contractSignedDate || "",
      contractExpiryDate: (employee as any).contractExpiryDate || "",
      dateOfBirth: (employee as any).dateOfBirth || "",
      permanentAddress: (employee as any).permanentAddress || "",
      basicSalary: employee.basicSalary || undefined,
      fixedAllowance: (employee as any).fixedAllowance || undefined,
      dutyAllowance: (employee as any).dutyAllowance || undefined,
      attendanceAllowance: (employee as any).attendanceAllowance || undefined,
      accommodationAllowance: employee.accommodationAllowance || undefined,
      additionalServiceAllowance: (employee as any).additionalServiceAllowance || undefined,
      pensionEnabled: (employee as any).pensionEnabled ?? false,
      pensionPercentage: (employee as any).pensionPercentage ?? 0,
      nationality: employee.nationality || "",
      passportNumber: employee.passportNumber || "",
      passportExpiryDate: employee.passportExpiryDate || "",
      visaNumber: employee.visaNumber || "",
      visaExpiryDate: employee.visaExpiryDate || "",
      workPermitNumber: employee.workPermitNumber || "",
      workPermitExpiryDate: employee.workPermitExpiryDate || "",
      insuranceExpiryDate: employee.insuranceExpiryDate || "",
      medicalExpiryDate: employee.medicalExpiryDate || "",
      quotaExpiryDate: employee.quotaExpiryDate || "",
      bankName1: employee.bankName1 || "",
      accountNumber1: employee.accountNumber1 || "",
      currency1: employee.currency1 || "",
      bankName2: employee.bankName2 || "",
      accountNumber2: employee.accountNumber2 || "",
      currency2: employee.currency2 || "",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
      emergencyContactRelation: employee.emergencyContactRelation || "",
      uniformSize: employee.uniformSize || "",
      uniformIssuedDate: employee.uniformIssuedDate || "",
      safetyShoeSize: employee.safetyShoeSize || "",
      safetyShoeIssuedDate: employee.safetyShoeIssuedDate || "",
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async (data: EditEmployeeFormData) => {
      // Convert "" to null for UUID + date columns to avoid Postgres errors
      const UUID_FIELDS = new Set(["departmentId", "projectId", "accommodationId", "roomId"]);
      const DATE_FIELDS = new Set([
        "startDate", "passportExpiryDate", "visaExpiryDate", "workPermitExpiryDate",
        "insuranceExpiryDate", "medicalExpiryDate", "quotaExpiryDate",
        "uniformIssuedDate", "safetyShoeIssuedDate",
        "lastPromotionDate", "contractSignedDate", "contractExpiryDate", "dateOfBirth",
      ]);
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if ((UUID_FIELDS.has(k) || DATE_FIELDS.has(k)) && v === "") {
          cleaned[k] = null;
        } else {
          cleaned[k] = v;
        }
      }
      return await apiRequest("PATCH", `/api/employees/${employee.id}`, cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employee.id] });
      toast({ title: "Employee updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update employee", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update employee information including personal details, work documents, and emergency contacts.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => updateEmployee.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} data-testid="input-edit-first-name" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} data-testid="input-edit-last-name" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} data-testid="input-edit-email" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="employeeCode" render={({ field }) => (
            <FormItem><FormLabel>Employee ID (for portal login)</FormLabel><FormControl><Input placeholder="e.g. EMP-001" {...field} data-testid="input-edit-employee-code" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} data-testid="input-edit-phone" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="jobTitle" render={({ field }) => (
              <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} data-testid="input-edit-job-title" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="departmentId" render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-edit-department"><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                  <SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="employmentType" render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-edit-employment-type"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="employmentStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-edit-employment-status"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Project / Branch</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-edit-project"><SelectValue placeholder="Select project / branch" /></SelectTrigger></FormControl>
                  <SelectContent>{projects.map((proj) => (<SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-start-date" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastPromotionDate" render={({ field }) => (
              <FormItem><FormLabel>Last Promotion Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Contract Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="contractType" render={({ field }) => (
                <FormItem><FormLabel>Contract Type</FormLabel><FormControl><Input placeholder="e.g. Permanent, Fixed-term" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contractSignedDate" render={({ field }) => (
                <FormItem><FormLabel>Signed Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <FormField control={form.control} name="contractExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Personal Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="permanentAddress" render={({ field }) => (
              <FormItem className="mt-3"><FormLabel>Permanent Address</FormLabel><FormControl><Input placeholder="Full home address" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="accommodationId" render={({ field }) => (
              <FormItem>
                <FormLabel>Accommodation</FormLabel>
                <Select onValueChange={(value) => { field.onChange(value); setSelectedAccommodationId(value); form.setValue("roomId", ""); }} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-edit-accommodation"><SelectValue placeholder="Select accommodation" /></SelectTrigger></FormControl>
                  <SelectContent>{accommodations.map((acc) => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="roomId" render={({ field }) => (
              <FormItem>
                <FormLabel>Room</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedAccommodationId}>
                  <FormControl><SelectTrigger data-testid="select-edit-room"><SelectValue placeholder={selectedAccommodationId ? "Select room" : "Select accommodation first"} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {rooms && rooms.length > 0 ? (
                      rooms.map((room) => (<SelectItem key={room.id} value={room.id}>{room.name} (Cap: {room.capacity})</SelectItem>))
                    ) : (
                      <SelectItem value="no-rooms" disabled>No rooms available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="nationality" render={({ field }) => (
            <FormItem className="mt-3"><FormLabel>Nationality</FormLabel><FormControl><Input {...field} data-testid="input-edit-nationality" /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Salary Package</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="basicSalary" render={({ field }) => (
                <FormItem><FormLabel>Basic Salary</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} data-testid="input-edit-basic-salary" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fixedAllowance" render={({ field }) => (
                <FormItem><FormLabel>Fixed Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <FormField control={form.control} name="dutyAllowance" render={({ field }) => (
                <FormItem><FormLabel>Duty Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="attendanceAllowance" render={({ field }) => (
                <FormItem><FormLabel>Attendance Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <FormField control={form.control} name="accommodationAllowance" render={({ field }) => (
                <FormItem><FormLabel>Living Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} data-testid="input-edit-accommodation-allowance" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="additionalServiceAllowance" render={({ field }) => (
                <FormItem><FormLabel>Additional Service Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Pension</h4>
            <div className="rounded-lg border p-4 space-y-3">
              <FormField
                control={form.control}
                name="pensionEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-sm">Enable Pension Deduction</FormLabel>
                      <p className="text-xs text-muted-foreground">Deducted as % of basic salary at payroll time.</p>
                    </div>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} data-testid="switch-edit-pension-enabled" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pensionPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Pension % of Basic Salary</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        placeholder="0"
                        disabled={!form.watch("pensionEnabled")}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        data-testid="input-edit-pension-pct"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Documents</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="passportNumber" render={({ field }) => (
                <FormItem><FormLabel>Passport Number</FormLabel><FormControl><Input {...field} data-testid="input-edit-passport-number" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="passportExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Passport Expiry</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-passport-expiry" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <FormField control={form.control} name="visaNumber" render={({ field }) => (
                <FormItem><FormLabel>Visa Number</FormLabel><FormControl><Input {...field} data-testid="input-edit-visa-number" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="visaExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Visa Expiry</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-visa-expiry" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <FormField control={form.control} name="workPermitNumber" render={({ field }) => (
                <FormItem><FormLabel>Work Permit Number</FormLabel><FormControl><Input {...field} data-testid="input-edit-work-permit-number" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="workPermitExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Work Permit Expiry</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-work-permit-expiry" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <FormField control={form.control} name="insuranceExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Insurance Expiry</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-insurance-expiry" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="medicalExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Medical Expiry</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-medical-expiry" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="quotaExpiryDate" render={({ field }) => (
                <FormItem><FormLabel>Quota Expiry</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-quota-expiry" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Banking</h4>
            <p className="text-sm text-muted-foreground mb-3">Account 1</p>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="bankName1" render={({ field }) => (
                <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} placeholder="Bank name" data-testid="input-edit-bank-name-1" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="accountNumber1" render={({ field }) => (
                <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} placeholder="Account number" data-testid="input-edit-account-number-1" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="currency1" render={({ field }) => (
                <FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} placeholder="e.g., USD, EUR" data-testid="input-edit-currency-1" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <p className="text-sm text-muted-foreground mb-3 mt-4">Account 2</p>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="bankName2" render={({ field }) => (
                <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} placeholder="Bank name" data-testid="input-edit-bank-name-2" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="accountNumber2" render={({ field }) => (
                <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} placeholder="Account number" data-testid="input-edit-account-number-2" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="currency2" render={({ field }) => (
                <FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} placeholder="e.g., USD, EUR" data-testid="input-edit-currency-2" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} data-testid="input-edit-emergency-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="emergencyContactRelation" render={({ field }) => (
                <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input {...field} data-testid="input-edit-emergency-relation" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
              <FormItem className="mt-3"><FormLabel>Contact Phone</FormLabel><FormControl><Input {...field} data-testid="input-edit-emergency-phone" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Uniform & Safety Equipment</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="uniformSize" render={({ field }) => (
                <FormItem><FormLabel>Uniform Size</FormLabel><FormControl><Input {...field} placeholder="e.g., S, M, L, XL" data-testid="input-edit-uniform-size" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="uniformIssuedDate" render={({ field }) => (
                <FormItem><FormLabel>Uniform Issued Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-uniform-date" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="safetyShoeSize" render={({ field }) => (
                <FormItem><FormLabel>Safety Shoe Size</FormLabel><FormControl><Input {...field} placeholder="e.g., 40, 41, 42" data-testid="input-edit-shoe-size" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="safetyShoeIssuedDate" render={({ field }) => (
                <FormItem><FormLabel>Safety Shoe Issued Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-edit-shoe-date" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateEmployee.isPending} data-testid="button-save-employee">
              {updateEmployee.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeCard({ 
  employee, 
  department,
  departments,
  projects,
  accommodations,
  onDelete,
  isOnLeave,
}: { 
  employee: Employee; 
  department?: Department;
  departments: Department[];
  projects: Project[];
  accommodations: Accommodation[];
  onDelete: (id: string) => void;
  isOnLeave?: boolean;
}) {
  const effectiveStatus = isOnLeave ? "on_leave" : employee.employmentStatus;
  const [editOpen, setEditOpen] = useState(false);
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "on_leave":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "resigned":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "terminated":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const getEmploymentTypeLabel = (type: string | null) => {
    switch (type) {
      case "full_time":
        return "Full-time";
      case "part_time":
        return "Part-time";
      case "contractor":
        return "Contractor";
      case "intern":
        return "Intern";
      default:
        return type;
    }
  };

  return (
    <>
      <Card className="hover-elevate transition-all duration-200" data-testid={`card-employee-${employee.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={employee.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold truncate">
                  {employee.firstName} {employee.lastName}
                </h3>
                <Badge className={getStatusColor(effectiveStatus)}>
                  {effectiveStatus === "on_leave" ? "on leave" : effectiveStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{employee.jobTitle}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {employee.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {employee.email}
                  </span>
                )}
                {department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {department.name}
                  </span>
                )}
                {employee.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {employee.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="shrink-0">
                {getEmploymentTypeLabel(employee.employmentType)}
              </Badge>
              <div className="flex gap-1">
                <Link href={`/employees/${employee.id}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-view-employee-${employee.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditOpen(true)}
                  data-testid={`button-edit-employee-${employee.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(employee.id)}
                  data-testid={`button-delete-employee-${employee.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {editOpen && (
        <EditEmployeeDialog 
          employee={employee} 
          departments={departments}
          projects={projects}
          accommodations={accommodations} 
          onClose={() => setEditOpen(false)} 
        />
      )}
    </>
  );
}

function AddEmployeeDialog({ departments, projects, accommodations }: { departments: Department[]; projects: Project[]; accommodations: Accommodation[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [selectedAccommodationId, setSelectedAccommodationId] = useState("");

  const { data: rooms } = useQuery<AccommodationRoom[]>({
    queryKey: ["/api/accommodations", selectedAccommodationId, "rooms"],
    enabled: !!selectedAccommodationId,
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeCode: "",
      phone: "",
      password: "",
      jobTitle: "",
      departmentId: "",
      projectId: "",
      accommodationId: "",
      roomId: "",
      employmentType: "full_time",
      employmentStatus: "active",
      startDate: new Date().toISOString().split("T")[0],
      nationality: "",
      passportNumber: "",
      passportExpiryDate: "",
      visaNumber: "",
      visaExpiryDate: "",
      workPermitNumber: "",
      workPermitExpiryDate: "",
      insuranceExpiryDate: "",
      medicalExpiryDate: "",
      quotaExpiryDate: "",
      bankName1: "",
      accountNumber1: "",
      currency1: "",
      bankName2: "",
      accountNumber2: "",
      currency2: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      uniformSize: "",
      uniformIssuedDate: "",
      safetyShoeSize: "",
      safetyShoeIssuedDate: "",
      lastPromotionDate: "",
      contractType: "",
      contractSignedDate: "",
      contractExpiryDate: "",
      dateOfBirth: "",
      permanentAddress: "",
    },
  });

  const createEmployee = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const response = await apiRequest("POST", "/api/employees", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Employee added successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add employee", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    createEmployee.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>Create a new employee with their personal details, work documents, and emergency contact information.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID (for portal login)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. EMP-001" {...field} data-testid="input-employee-code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portal Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min 6 characters" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-job-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
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
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employment-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employment-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project / Branch (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select project / branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accommodationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accommodation (optional)</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedAccommodationId(value); form.setValue("roomId", ""); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accommodation">
                          <SelectValue placeholder="Select accommodation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accommodations.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
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
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedAccommodationId}>
                      <FormControl>
                        <SelectTrigger data-testid="select-room">
                          <SelectValue placeholder={selectedAccommodationId ? "Select room" : "Select accommodation first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms && rooms.length > 0 ? (
                          rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name} (Cap: {room.capacity})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-rooms" disabled>No rooms available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem className="mt-3">
                  <FormLabel>Nationality</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., American" data-testid="input-nationality" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Contract Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lastPromotionDate" render={({ field }) => (
                  <FormItem><FormLabel>Last Promotion Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contractType" render={({ field }) => (
                  <FormItem><FormLabel>Contract Type</FormLabel><FormControl><Input placeholder="e.g. Permanent" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField control={form.control} name="contractSignedDate" render={({ field }) => (
                  <FormItem><FormLabel>Signed Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contractExpiryDate" render={({ field }) => (
                  <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Personal Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="permanentAddress" render={({ field }) => (
                <FormItem className="mt-3"><FormLabel>Permanent Address</FormLabel><FormControl><Input placeholder="Full home address" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Salary Package</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="basicSalary" render={({ field }) => (
                  <FormItem><FormLabel>Basic Salary</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} data-testid="input-basic-salary" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fixedAllowance" render={({ field }) => (
                  <FormItem><FormLabel>Fixed Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField control={form.control} name="dutyAllowance" render={({ field }) => (
                  <FormItem><FormLabel>Duty Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="attendanceAllowance" render={({ field }) => (
                  <FormItem><FormLabel>Attendance Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField control={form.control} name="accommodationAllowance" render={({ field }) => (
                  <FormItem><FormLabel>Living Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} data-testid="input-accommodation-allowance" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="additionalServiceAllowance" render={({ field }) => (
                  <FormItem><FormLabel>Additional Service Allowance</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Documents</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="passportNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passport Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-passport-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="passportExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passport Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-passport-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField
                  control={form.control}
                  name="visaNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visa Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-visa-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visaExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visa Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-visa-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField
                  control={form.control}
                  name="workPermitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Permit Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-work-permit-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workPermitExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Permit Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-work-permit-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <FormField
                  control={form.control}
                  name="insuranceExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-insurance-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicalExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-medical-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quotaExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quota Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-quota-expiry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Banking</h4>
              <p className="text-sm text-muted-foreground mb-3">Account 1</p>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bankName1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bank name" data-testid="input-bank-name-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Account number" data-testid="input-account-number-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., USD, EUR" data-testid="input-currency-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-3 mt-4">Account 2</p>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bankName2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bank name" data-testid="input-bank-name-2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Account number" data-testid="input-account-number-2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., USD, EUR" data-testid="input-currency-2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" data-testid="input-emergency-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Spouse, Parent" data-testid="input-emergency-relation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Phone number" data-testid="input-emergency-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Uniform & Safety Equipment</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="uniformSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uniform Size</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., S, M, L, XL" data-testid="input-uniform-size" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uniformIssuedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uniform Issued Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-uniform-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="safetyShoeSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Safety Shoe Size</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 40, 41, 42" data-testid="input-shoe-size" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="safetyShoeIssuedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Safety Shoe Issued Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-shoe-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEmployee.isPending} data-testid="button-submit-employee">
                {createEmployee.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: accommodations } = useQuery<Accommodation[]>({
    queryKey: ["/api/accommodations"],
  });

  const { data: timeOffRequests } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/time-off"],
  });

  const getEmployeesOnLeaveToday = (): Set<string> => {
    const today = new Date().toISOString().split('T')[0];
    const onLeave = new Set<string>();
    timeOffRequests?.forEach(request => {
      if (request.status !== 'approved') return;
      if (request.startDate > today) return;
      // If actual return date is set and is today or in the past, employee has returned
      if (request.actualReturnDate && request.actualReturnDate <= today) return;
      // If no actual return date, use end date
      if (!request.actualReturnDate && request.endDate < today) return;
      onLeave.add(request.employeeId);
    });
    return onLeave;
  };

  const employeesOnLeaveToday = getEmployeesOnLeaveToday();

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Employee deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete employee", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const getDepartmentById = (id: string | null) => {
    if (!id) return undefined;
    return departments?.find((d) => d.id === id);
  };

  const filteredEmployees = employees?.filter((employee) => {
    const matchesSearch =
      searchQuery === "" ||
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const isCurrentlyOnLeave = employeesOnLeaveToday.has(employee.id);
    const effectiveStatus = isCurrentlyOnLeave ? "on_leave" : employee.employmentStatus;
    const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
    const matchesDepartment = departmentFilter === "all" || employee.departmentId === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleExportEmployees = (format: "excel" | "pdf") => {
    try {
      const list = (employees ?? []) as any[];
      if (list.length === 0) {
        toast({ title: "Nothing to export", description: "No employees to export yet.", variant: "destructive" });
        return;
      }
      if (format === "excel") {
        exportEmployeesXlsx(list, (departments ?? []) as any[]);
      } else {
        exportEmployeesPdf(list, (departments ?? []) as any[]);
      }
      toast({
        title: "Export successful",
        description: `Employee list exported to ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: parseErrorMessage(error as Error),
        variant: "destructive"
      });
    }
  };

  const downloadImportTemplate = () => {
    const headers = [...EMPLOYEE_CSV_HEADERS];

    const sampleRow = [
      "John", "Doe", "john.doe@example.com", "+1234567890", "Software Engineer",
      "full_time", "active", "2024-01-15",
      "5000", "500", "1000", "200",
      "American", "AB1234567", "2030-12-31", "V123456", "2025-06-30",
      "WP789012", "2025-12-31",
      "2025-12-31", "2025-06-30", "2025-12-31",
      "ABC Bank", "1234567890", "USD", "XYZ Bank", "0987654321", "EUR",
      "Jane Doe", "+1987654321", "Spouse",
      "L", "2024-02-01", "42", "2024-02-01",
      "password123",
    ];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template downloaded", description: "Fill in the template and upload to import employees" });
  };

  const uploadEmployees = useMutation({
    mutationFn: async (file: File) => importEmployeesFromCsv(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      if (data.errors.length > 0) {
        toast({
          title: `Imported ${data.imported} of ${data.total}`,
          description: data.errors.slice(0, 3).join(" • ") + (data.errors.length > 3 ? ` (+${data.errors.length - 3} more)` : ""),
          variant: data.imported === 0 ? "destructive" : "default",
        });
      } else {
        toast({ title: "Employees imported", description: `${data.imported} employees imported successfully` });
      }
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to import employees", description: parseErrorMessage(error), variant: "destructive" });
      setIsUploading(false);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadEmployees.mutate(file);
    }
    event.target.value = "";
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your team members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadImportTemplate} data-testid="button-download-template">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-employees">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportEmployees("excel")} data-testid="menu-export-excel">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportEmployees("pdf")} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" disabled={isUploading} asChild data-testid="button-import-employees">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Importing..." : "Import"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
          <AddEmployeeDialog departments={departments || []} projects={projects || []} accommodations={accommodations || []} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-employees"
          />
        </div>
        <div className="flex gap-2 sm:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:w-[160px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="flex-1 sm:w-[180px]" data-testid="select-department-filter">
              <SelectValue placeholder="Dept" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {employeesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {employees?.length === 0
                ? "Get started by adding your first team member."
                : "No employees match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees?.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              department={getDepartmentById(employee.departmentId)}
              departments={departments || []}
              projects={projects || []}
              accommodations={accommodations || []}
              onDelete={(id) => deleteEmployee.mutate(id)}
              isOnLeave={employeesOnLeaveToday.has(employee.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
