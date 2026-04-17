import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Heart,
  Shield,
  Wallet,
  Users,
  Trash2,
  Gift,
  Pencil,
  MoreVertical,
  Settings,
  Filter,
  List,
  Building,
} from "lucide-react";
import type { Benefit, BenefitType, CompanySettings } from "@shared/schema";

// Benefit Type Form Schema
const benefitTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  isActive: z.boolean().default(true),
});

type BenefitTypeFormData = z.infer<typeof benefitTypeFormSchema>;

// Benefit Form Schema
const benefitFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  benefitTypeId: z.string().optional(),
  description: z.string().optional(),
  provider: z.string().optional(),
  coverageDetails: z.string().optional(),
  employerContribution: z.coerce.number().optional(),
  employeeContribution: z.coerce.number().optional(),
});

type BenefitFormData = z.infer<typeof benefitFormSchema>;

// Default colors for benefit types
const defaultColors = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1"
];

// Benefit Type Management Dialog
function ManageBenefitTypeDialog({ benefitType, onClose }: { benefitType?: BenefitType; onClose: () => void }) {
  const { toast } = useToast();
  const isEditing = !!benefitType;

  const form = useForm<BenefitTypeFormData>({
    resolver: zodResolver(benefitTypeFormSchema),
    defaultValues: {
      name: benefitType?.name || "",
      description: benefitType?.description || "",
      color: benefitType?.color || defaultColors[Math.floor(Math.random() * defaultColors.length)],
      isActive: benefitType?.isActive ?? true,
    },
  });

  const createBenefitType = useMutation({
    mutationFn: async (data: BenefitTypeFormData) => {
      return await apiRequest("POST", "/api/benefit-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-types"] });
      toast({ title: "Benefit type created" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create benefit type", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const updateBenefitType = useMutation({
    mutationFn: async (data: BenefitTypeFormData) => {
      return await apiRequest("PATCH", `/api/benefit-types/${benefitType!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-types"] });
      toast({ title: "Benefit type updated" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update benefit type", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: BenefitTypeFormData) => {
    if (isEditing) {
      updateBenefitType.mutate(data);
    } else {
      createBenefitType.mutate(data);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Benefit Type" : "Create Benefit Type"}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Health Insurance, Retirement" data-testid="input-benefit-type-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Description of this benefit type" data-testid="textarea-benefit-type-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input type="color" {...field} className="w-16 h-10 p-1 cursor-pointer" data-testid="input-benefit-type-color" />
                    <span className="text-sm text-muted-foreground">{field.value}</span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription className="text-sm">Allow new benefits to use this type</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-benefit-type-active" />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createBenefitType.isPending || updateBenefitType.isPending} data-testid="button-save-benefit-type">
              {createBenefitType.isPending || updateBenefitType.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// Create Benefit Plan Dialog
function CreateBenefitDialog({ benefitTypes }: { benefitTypes: BenefitType[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });
  const currency = settings?.defaultCurrency || "USD";

  const form = useForm<BenefitFormData>({
    resolver: zodResolver(benefitFormSchema),
    defaultValues: {
      name: "",
      benefitTypeId: "",
      description: "",
      provider: "",
      coverageDetails: "",
      employerContribution: 0,
      employeeContribution: 0,
    },
  });

  const createBenefit = useMutation({
    mutationFn: async (data: BenefitFormData) => {
      return await apiRequest("POST", "/api/benefits", {
        ...data,
        employerContribution: Math.round((data.employerContribution || 0) * 100),
        employeeContribution: Math.round((data.employeeContribution || 0) * 100),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefits"] });
      toast({ title: "Benefit plan created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create benefit plan", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const activeBenefitTypes = benefitTypes.filter(t => t.isActive);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-benefit">
          <Plus className="h-4 w-4 mr-2" />
          Create Benefit Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Benefit Plan</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createBenefit.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Premium Health Plan" data-testid="input-benefit-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="benefitTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefit Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-benefit-type">
                        <SelectValue placeholder="Select benefit type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeBenefitTypes.length === 0 ? (
                        <SelectItem value="none" disabled>No benefit types available</SelectItem>
                      ) : (
                        activeBenefitTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., BlueCross BlueShield" data-testid="input-benefit-provider" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Brief description of the plan" data-testid="textarea-benefit-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employerContribution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer Contribution ({currency}/month)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-benefit-employer-contribution"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeContribution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Contribution ({currency}/month)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-benefit-employee-contribution"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createBenefit.isPending} data-testid="button-submit-benefit">
                {createBenefit.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function BenefitsPage() {
  const { toast } = useToast();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [editingBenefitType, setEditingBenefitType] = useState<BenefitType | null>(null);
  const [showBenefitTypeDialog, setShowBenefitTypeDialog] = useState(false);

  const { data: benefits, isLoading: benefitsLoading } = useQuery<Benefit[]>({
    queryKey: ["/api/benefits"],
  });

  const { data: benefitTypes, isLoading: typesLoading } = useQuery<BenefitType[]>({
    queryKey: ["/api/benefit-types"],
  });

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });

  const currency = settings?.defaultCurrency || "USD";

  const formatCurrency = (dollars: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(dollars);
    } catch {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
    }
  };

  const deleteBenefit = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/benefits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefits"] });
      toast({ title: "Benefit plan deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete benefit plan", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteBenefitType = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/benefit-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefit-types"] });
      toast({ title: "Benefit type deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete benefit type", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const getBenefitTypeById = (id: string | null) => benefitTypes?.find((t) => t.id === id);

  // Apply filters
  const filteredBenefits = (benefits || []).filter((benefit) => {
    const typeMatch = selectedTypeFilter === "all" || benefit.benefitTypeId === selectedTypeFilter;
    const statusMatch = selectedStatusFilter === "all" || (benefit.isActive ? "active" : "inactive") === selectedStatusFilter;
    return typeMatch && statusMatch;
  });

  // Calculate totals by benefit type
  const totalsByType = (benefitTypes || []).map((type) => {
    const typeBenefits = (benefits || []).filter((b) => b.benefitTypeId === type.id);
    const totalEmployerContrib = typeBenefits.reduce((sum, b) => sum + (b.employerContribution || 0), 0);
    const totalEmployeeContrib = typeBenefits.reduce((sum, b) => sum + (b.employeeContribution || 0), 0);
    return { type, totalEmployerContrib, totalEmployeeContrib, count: typeBenefits.length };
  });

  // Calculate overall totals
  const totalEmployerContribution = (benefits || []).reduce((sum, b) => sum + (b.employerContribution || 0), 0);
  const totalEmployeeContribution = (benefits || []).reduce((sum, b) => sum + (b.employeeContribution || 0), 0);
  const activeBenefits = (benefits || []).filter((b) => b.isActive).length;

  const isLoading = benefitsLoading || typesLoading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Benefits</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employee benefit plans and enrollment</p>
        </div>
        <CreateBenefitDialog benefitTypes={benefitTypes || []} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-green-500/10">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{(benefits || []).length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Plans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{activeBenefits}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Active Plans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-purple-500/10">
              <Building className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(totalEmployerContribution)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Employer/mo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg bg-orange-500/10">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(totalEmployeeContribution)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Employee/mo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="benefits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="benefits" data-testid="tab-benefits">
            <Gift className="h-4 w-4 mr-2" />
            Benefit Plans
          </TabsTrigger>
          <TabsTrigger value="types" data-testid="tab-benefit-types">
            <Settings className="h-4 w-4 mr-2" />
            Manage Types
          </TabsTrigger>
        </TabsList>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="filter-benefit-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {(benefitTypes || []).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="filter-benefit-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto text-sm text-muted-foreground">
                  Showing: <span className="font-semibold text-foreground">{filteredBenefits.length} plans</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals by Type */}
          {totalsByType.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {totalsByType.map(({ type, totalEmployerContrib, count }) => (
                <Card key={type.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedTypeFilter(type.id)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                      <span className="text-sm font-medium truncate">{type.name}</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(totalEmployerContrib)}</p>
                    <p className="text-xs text-muted-foreground">{count} plan{count !== 1 ? "s" : ""}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Benefits Table */}
          <Card>
            <CardHeader>
              <CardTitle>Benefit Plans ({filteredBenefits.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Employer Contrib.</TableHead>
                      <TableHead className="text-right">Employee Contrib.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBenefits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No benefit plans found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBenefits.map((benefit) => {
                        const benefitType = getBenefitTypeById(benefit.benefitTypeId);
                        return (
                          <TableRow key={benefit.id} data-testid={`benefit-row-${benefit.id}`}>
                            <TableCell className="font-medium">{benefit.name}</TableCell>
                            <TableCell>
                              {benefitType ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: benefitType.color }} />
                                  <span>{benefitType.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{benefit.provider || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(benefit.employerContribution || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(benefit.employeeContribution || 0)}</TableCell>
                            <TableCell>
                              <Badge variant={benefit.isActive ? "default" : "secondary"}>
                                {benefit.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`benefit-actions-${benefit.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => deleteBenefit.mutate(benefit.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefit Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Benefit Types</CardTitle>
              <Button onClick={() => setShowBenefitTypeDialog(true)} data-testid="button-add-benefit-type">
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plans</TableHead>
                      <TableHead>Total Employer Contrib.</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(benefitTypes || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No benefit types defined. Click "Add Type" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (benefitTypes || []).map((type) => {
                        const typeStats = totalsByType.find((t) => t.type.id === type.id);
                        return (
                          <TableRow key={type.id} data-testid={`benefit-type-row-${type.id}`}>
                            <TableCell>
                              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: type.color }} />
                            </TableCell>
                            <TableCell className="font-medium">{type.name}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {type.description || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={type.isActive ? "default" : "secondary"}>
                                {type.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{typeStats?.count || 0}</TableCell>
                            <TableCell>{formatCurrency(typeStats?.totalEmployerContrib || 0)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`benefit-type-actions-${type.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingBenefitType(type)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteBenefitType.mutate(type.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Benefit Type Dialog */}
      <Dialog open={showBenefitTypeDialog || !!editingBenefitType} onOpenChange={(open) => {
        if (!open) {
          setShowBenefitTypeDialog(false);
          setEditingBenefitType(null);
        }
      }}>
        <ManageBenefitTypeDialog
          benefitType={editingBenefitType || undefined}
          onClose={() => {
            setShowBenefitTypeDialog(false);
            setEditingBenefitType(null);
          }}
        />
      </Dialog>
    </div>
  );
}
