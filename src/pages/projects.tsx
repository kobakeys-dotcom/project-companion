import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FolderKanban, Users, Trash2, Pencil, Crosshair, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { GeofenceMap } from "@/components/geofence-map";
import type { Project, Employee } from "@shared/schema";

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().default("#f59e0b"),
  geofenceEnabled: z.boolean().default(false),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  radiusMeters: z.coerce.number().int().min(10).max(10000).default(100),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

const colorOptions = [
  "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#f43f5e", "#ef4444",
];

function GeofenceFields({ form }: { form: ReturnType<typeof useForm<ProjectFormData>> }) {
  const { toast } = useToast();
  const enabled = form.watch("geofenceEnabled");
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Geolocation not available in this browser", variant: "destructive" });
      return;
    }
    if (!window.isSecureContext) {
      toast({
        title: "Location requires HTTPS",
        description: "Open the app over https:// to use device location.",
        variant: "destructive",
      });
      return;
    }
    setLocating(true);
    const targetAccuracyMeters = 100;
    const maxWaitMs = 20000;
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;
    let watchId = 0;
    let timeoutId = 0;

    const finish = (position?: GeolocationPosition, errorMessage?: string) => {
      if (finished) return;
      finished = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timeoutId);
      setLocating(false);

      if (position) {
        form.setValue("latitude", position.coords.latitude.toFixed(6), { shouldDirty: true, shouldValidate: true });
        form.setValue("longitude", position.coords.longitude.toFixed(6), { shouldDirty: true, shouldValidate: true });
        toast({
          title: "Location captured",
          description: `±${Math.round(position.coords.accuracy)}m accuracy`,
        });
        return;
      }

      toast({
        title: "Location too inaccurate",
        description:
          errorMessage ??
          "We could not get a reliable GPS fix. Move outdoors or enable precise location, then try again.",
        variant: "destructive",
      });
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= targetAccuracyMeters) {
          finish(position);
        }
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Permission denied. Allow location access in your browser settings."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Position unavailable. Check that location services are on."
              : err.code === err.TIMEOUT
                ? "Timed out trying to get your location."
                : err.message || "Could not get location";
        finish(undefined, msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    timeoutId = window.setTimeout(() => {
      if (bestPosition && bestPosition.coords.accuracy <= targetAccuracyMeters) {
        finish(bestPosition);
        return;
      }

      finish(
        undefined,
        bestPosition
          ? `Best fix was only ±${Math.round(bestPosition.coords.accuracy)}m. Enable precise location and try again.`
          : "No reliable GPS fix was found. Enable precise location and try again.",
      );
    }, maxWaitMs);
  };

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Geofence clock-in</p>
            <p className="text-xs text-muted-foreground">
              Require employees on this project to be on-site to clock in.
            </p>
          </div>
        </div>
        <FormField
          control={form.control}
          name="geofenceEnabled"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      {enabled && (
        <div className="space-y-3">
          <GeofenceMap
            latitude={form.watch("latitude") ? Number(form.watch("latitude")) : null}
            longitude={form.watch("longitude") ? Number(form.watch("longitude")) : null}
            radiusMeters={Number(form.watch("radiusMeters")) || 100}
            onChange={(lat, lng) => {
              form.setValue("latitude", lat.toFixed(6), { shouldDirty: true });
              form.setValue("longitude", lng.toFixed(6), { shouldDirty: true });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Tap the map to drop a pin, or drag the marker to fine-tune.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl><Input {...field} placeholder="25.2048" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl><Input {...field} placeholder="55.2708" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
            <Crosshair className="h-4 w-4 mr-2" />
            {locating ? "Locating…" : "Use my current location"}
          </Button>
          <FormField
            control={form.control}
            name="radiusMeters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Radius (meters)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={10}
                    max={10000}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

function EditProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      color: project.color || "#f59e0b",
      geofenceEnabled: !!project.geofenceEnabled,
      latitude: project.latitude != null ? String(project.latitude) : "",
      longitude: project.longitude != null ? String(project.longitude) : "",
      radiusMeters: project.radiusMeters ?? 100,
    },
  });

  const updateProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload = {
        ...data,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
      };
      return await apiRequest("PATCH", `/api/projects/${project.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update project", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
      <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
        <DialogTitle>Edit Project</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) => updateProject.mutate(d))}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Website Redesign" data-testid="input-edit-project-name" />
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
                    <Textarea {...field} placeholder="What is this project about?" data-testid="textarea-edit-project-description" />
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
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`h-8 w-8 rounded-md transition-all ${field.value === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                          style={{ backgroundColor: color }}
                          data-testid={`edit-project-color-${color.replace("#", "")}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <GeofenceFields form={form} />
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateProject.isPending} data-testid="button-save-project">
              {updateProject.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function ProjectCard({
  project,
  employees,
  onDelete,
}: {
  project: Project;
  employees: Employee[];
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const projectEmployees = employees.filter((e) => e.projectId === project.id);
  
  // Group employees by job title
  const jobTitleBreakdown = projectEmployees.reduce((acc, emp) => {
    const title = emp.jobTitle || "Unspecified";
    acc[title] = (acc[title] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sortedJobTitles = Object.entries(jobTitleBreakdown).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <Card className="hover-elevate" data-testid={`card-project-${project.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${project.color}20` }}
            >
              <FolderKanban className="h-6 w-6" style={{ color: project.color || "#f59e0b" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="font-semibold truncate">{project.name}</h3>
                  {project.geofenceEnabled && project.latitude != null && project.longitude != null && (
                    <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 h-5 shrink-0">
                      <MapPin className="h-3 w-3" />
                      {project.radiusMeters ?? 100}m
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground"
                    onClick={() => setEditOpen(true)}
                    data-testid={`button-edit-project-${project.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground"
                    onClick={onDelete}
                    data-testid={`button-delete-project-${project.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex -space-x-2">
                  {projectEmployees.slice(0, 4).map((emp) => (
                    <Avatar key={emp.id} className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={emp.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {projectEmployees.length > 4 && (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                      <span className="text-xs text-muted-foreground">+{projectEmployees.length - 4}</span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {projectEmployees.length} member{projectEmployees.length !== 1 ? "s" : ""}
                </span>
              </div>
              {sortedJobTitles.length > 0 && (
                <div className="border-t pt-3 mt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Job Title Breakdown</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedJobTitles.map(([title, count]) => {
                      const employeesWithTitle = projectEmployees.filter(
                        (e) => (e.jobTitle || "Unspecified") === title
                      );
                      return (
                        <Popover key={title}>
                          <PopoverTrigger asChild>
                            <button 
                              type="button"
                              className="inline-flex items-center rounded-md border border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold transition-colors hover-elevate cursor-pointer"
                              data-testid={`badge-jobtitle-${title.replace(/\s+/g, '-').toLowerCase()}`}
                            >
                              {title}: {count as number}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" align="start">
                            <p className="text-sm font-medium mb-2">{title}</p>
                            <div className="space-y-2">
                              {employeesWithTitle.map((emp) => (
                                <div key={emp.id} className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={emp.profileImageUrl || undefined} />
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{emp.firstName} {emp.lastName}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {editOpen && <EditProjectDialog project={project} onClose={() => setEditOpen(false)} />}
    </Dialog>
  );
}

function AddProjectDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#f59e0b",
      geofenceEnabled: false,
      latitude: "",
      longitude: "",
      radiusMeters: 100,
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload = {
        ...data,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
      };
      return await apiRequest("POST", "/api/projects", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Project created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create project", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-project">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => createProject.mutate(d))}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Website Redesign" data-testid="input-project-name" />
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
                      <Textarea {...field} placeholder="What is this project about?" data-testid="textarea-project-description" />
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
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={`h-8 w-8 rounded-md transition-all ${field.value === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                            style={{ backgroundColor: color }}
                            data-testid={`project-color-${color.replace("#", "")}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <GeofenceFields form={form} />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending} data-testid="button-submit-project">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const { toast } = useToast();

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Project deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete project", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  if (projectsLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Skeleton className="h-6 sm:h-8 w-28 sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-32 sm:w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-16 sm:h-20 w-full" />
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Projects / Branches</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Organize your team by projects and branches</p>
        </div>
        <AddProjectDialog />
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Create projects to organize and assign your team members.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              employees={employees || []}
              onDelete={() => deleteProject.mutate(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
