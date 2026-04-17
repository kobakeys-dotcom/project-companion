import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import {
  Plus,
  FileText,
  File,
  Download,
  Trash2,
  Search,
  FolderOpen,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Globe,
  Upload,
  Loader2,
} from "lucide-react";
import type { Document, Employee } from "@shared/schema";
import { format } from "date-fns";

const documentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  category: z.string().min(1, "Category is required"),
  employeeId: z.string().optional(),
  isCompanyWide: z.boolean().default(false),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

const categories = [
  "Contracts",
  "Policies",
  "Tax Documents",
  "Onboarding",
  "Training",
  "Performance",
  "Benefits",
  "Other",
];

const documentTypes = [
  "PDF",
  "Word Document",
  "Excel Spreadsheet",
  "Image",
  "Archive",
  "Other",
];

function getDocIcon(type: string) {
  switch (type.toLowerCase()) {
    case "pdf":
      return FileText;
    case "excel spreadsheet":
      return FileSpreadsheet;
    case "image":
      return FileImage;
    case "archive":
      return FileArchive;
    default:
      return File;
  }
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'doc':
    case 'docx':
      return 'Word Document';
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'Image';
    case 'zip':
    case 'rar':
    case '7z':
      return 'Archive';
    default:
      return 'Other';
  }
}

function DocumentCard({
  document,
  employee,
  onDelete,
}: {
  document: Document;
  employee?: Employee;
  onDelete: () => void;
}) {
  const Icon = getDocIcon(document.type);

  const handleDownload = () => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  };

  return (
    <Card className="hover-elevate" data-testid={`card-document-${document.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{document.name}</h3>
              {document.isCompanyWide && (
                <Badge variant="secondary" className="shrink-0">
                  <Globe className="h-3 w-3 mr-1" />
                  Company
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {document.category} - {document.type}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {employee ? `${employee.firstName} ${employee.lastName}` : "Company Document"}
                {document.createdAt && ` - ${format(new Date(document.createdAt), "MMM d, yyyy")}`}
              </span>
              <div className="flex gap-1">
                {document.fileUrl && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={handleDownload}
                    data-testid={`button-download-doc-${document.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={onDelete}
                  data-testid={`button-delete-doc-${document.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddDocumentDialog({ employees }: { employees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setUploadedFileUrl(response.objectPath);
      toast({ title: "File uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: "",
      type: "",
      category: "",
      employeeId: "",
      isCompanyWide: false,
    },
  });

  const isCompanyWide = form.watch("isCompanyWide");

  const createDocument = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      return await apiRequest("POST", "/api/documents", {
        ...data,
        employeeId: data.isCompanyWide ? null : data.employeeId || null,
        fileUrl: uploadedFileUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document added successfully" });
      setOpen(false);
      form.reset();
      setUploadedFileUrl(null);
      setUploadedFileName(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add document", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const fileType = getFileType(file.name);
      form.setValue("type", fileType);
      if (!form.getValues("name")) {
        form.setValue("name", file.name.replace(/\.[^/.]+$/, ""));
      }
      await uploadFile(file);
    }
  };

  const onSubmit = (data: DocumentFormData) => {
    if (!uploadedFileUrl) {
      toast({ title: "Please upload a file first", variant: "destructive" });
      return;
    }
    createDocument.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setUploadedFileUrl(null);
      setUploadedFileName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-document">
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar,.7z"
                data-testid="input-file-upload"
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : uploadedFileName ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{uploadedFileName}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a file to upload
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-file"
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Employment Contract" data-testid="input-doc-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doc-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doc-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isCompanyWide"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Company-wide Document</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Available to all employees
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-company-wide"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {!isCompanyWide && (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doc-employee">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDocument.isPending || isUploading || !uploadedFileUrl} 
                data-testid="button-submit-doc"
              >
                {createDocument.isPending ? "Adding..." : "Add Document"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const getEmployeeById = (id: string | null) => {
    if (!id) return undefined;
    return employees?.find((e) => e.id === id);
  };

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const companyDocs = filteredDocuments?.filter((d) => d.isCompanyWide) || [];
  const employeeDocs = filteredDocuments?.filter((d) => !d.isCompanyWide) || [];

  if (documentsLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-32 sm:w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage company and employee documents</p>
        </div>
        <AddDocumentDialog employees={employees || []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-docs"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-docs">
            All ({filteredDocuments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="company" data-testid="tab-company-docs">
            Company ({companyDocs.length})
          </TabsTrigger>
          <TabsTrigger value="employee" data-testid="tab-employee-docs">
            Employee ({employeeDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {!filteredDocuments || filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {documents?.length === 0
                    ? "Upload your first document to get started."
                    : "No documents match your current filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  employee={getEmployeeById(doc.employeeId)}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          {companyDocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Globe className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No company documents</h3>
                <p className="text-muted-foreground">Company-wide documents will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="employee" className="space-y-4">
          {employeeDocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No employee documents</h3>
                <p className="text-muted-foreground">Employee-specific documents will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employeeDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  employee={getEmployeeById(doc.employeeId)}
                  onDelete={() => deleteDocument.mutate(doc.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
