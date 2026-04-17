import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, parseErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Home, Users, Trash2, Pencil, MapPin, DoorOpen, ChevronDown, ChevronUp } from "lucide-react";
import type { Accommodation, Employee, AccommodationRoom } from "@shared/schema";

const accommodationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  description: z.string().optional(),
  capacity: z.coerce.number().optional(),
  numberOfRooms: z.coerce.number().optional(),
  color: z.string().default("#10b981"),
});

type AccommodationFormData = z.infer<typeof accommodationFormSchema>;

const colorOptions = [
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#84cc16",
];

function EditAccommodationDialog({ accommodation, onClose }: { accommodation: Accommodation; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<AccommodationFormData>({
    resolver: zodResolver(accommodationFormSchema),
    defaultValues: {
      name: accommodation.name,
      address: accommodation.address || "",
      description: accommodation.description || "",
      capacity: accommodation.capacity || undefined,
      numberOfRooms: accommodation.numberOfRooms || undefined,
      color: accommodation.color || "#10b981",
    },
  });

  const updateAccommodation = useMutation({
    mutationFn: async (data: AccommodationFormData) => {
      return await apiRequest("PATCH", `/api/accommodations/${accommodation.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accommodations"] });
      toast({ title: "Accommodation updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update accommodation", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Accommodation</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => updateAccommodation.mutate(d))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Staff Housing Block A" data-testid="input-edit-acc-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="123 Main St, City" data-testid="input-edit-acc-address" />
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
                  <Textarea {...field} placeholder="Details about this accommodation" data-testid="textarea-edit-acc-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Capacity (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} placeholder="Max occupants" data-testid="input-edit-acc-capacity" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfRooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Rooms</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} placeholder="e.g., 5" data-testid="input-edit-acc-rooms" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                        data-testid={`edit-acc-color-${color.replace("#", "")}`}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateAccommodation.isPending} data-testid="button-save-acc">
              {updateAccommodation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function AccommodationCard({
  accommodation,
  employees,
  onDelete,
}: {
  accommodation: Accommodation;
  employees: Employee[];
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [roomsExpanded, setRoomsExpanded] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("1");
  const [selectedRoom, setSelectedRoom] = useState<AccommodationRoom | null>(null);
  const accEmployees = employees.filter((e) => e.accommodationId === accommodation.id);
  
  const getEmployeesInRoom = (roomId: string) => employees.filter((e) => e.roomId === roomId);
  const getRoomOccupancy = (room: AccommodationRoom) => {
    const utilized = getEmployeesInRoom(room.id).length;
    const capacity = room.capacity || 1;
    const vacant = Math.max(0, capacity - utilized);
    return { utilized, vacant, capacity };
  };

  const { data: rooms, isLoading: roomsLoading } = useQuery<AccommodationRoom[]>({
    queryKey: ["/api/accommodations", accommodation.id, "rooms"],
    enabled: roomsExpanded,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: { name: string; capacity: number }) => {
      return await apiRequest("POST", `/api/accommodations/${accommodation.id}/rooms`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accommodations", accommodation.id, "rooms"] });
      toast({ title: "Room added successfully" });
      setNewRoomName("");
      setNewRoomCapacity("1");
    },
    onError: () => {
      toast({ title: "Failed to add room", variant: "destructive" });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return await apiRequest("DELETE", `/api/accommodation-rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accommodations", accommodation.id, "rooms"] });
      toast({ title: "Room deleted" });
    },
  });

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    createRoomMutation.mutate({
      name: newRoomName.trim(),
      capacity: parseInt(newRoomCapacity) || 1,
    });
  };

  return (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <Card className="hover-elevate" data-testid={`card-accommodation-${accommodation.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accommodation.color}20` }}
            >
              <Home className="h-6 w-6" style={{ color: accommodation.color || "#10b981" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold truncate">{accommodation.name}</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground"
                    onClick={() => setEditOpen(true)}
                    data-testid={`button-edit-acc-${accommodation.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground"
                    onClick={onDelete}
                    data-testid={`button-delete-acc-${accommodation.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {accommodation.address && (
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {accommodation.address}
                </p>
              )}
              {accommodation.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{accommodation.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {accEmployees.slice(0, 4).map((emp) => (
                      <Avatar key={emp.id} className="h-7 w-7 border-2 border-background">
                        <AvatarImage src={emp.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {accEmployees.length > 4 && (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                        <span className="text-xs text-muted-foreground">+{accEmployees.length - 4}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {accEmployees.length}{accommodation.capacity ? ` / ${accommodation.capacity}` : ""} occupant{accEmployees.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {accommodation.numberOfRooms ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <DoorOpen className="h-3 w-3" />
                    {accommodation.numberOfRooms} room{accommodation.numberOfRooms !== 1 ? "s" : ""}
                  </Badge>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground"
                onClick={() => setRoomsExpanded(!roomsExpanded)}
                data-testid={`button-toggle-rooms-${accommodation.id}`}
              >
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-4 w-4" />
                  Manage Rooms
                </span>
                {roomsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {roomsExpanded && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Room Name</Label>
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., A, B, 101"
                    className="h-8"
                    data-testid="input-new-room-name"
                  />
                </div>
                <div className="w-20">
                  <Label className="text-xs">Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    className="h-8"
                    data-testid="input-new-room-capacity"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddRoom}
                  disabled={!newRoomName.trim() || createRoomMutation.isPending}
                  data-testid="button-add-room"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {roomsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : rooms && rooms.length > 0 ? (
                <div className="space-y-2">
                  {rooms.map((room) => {
                    const { utilized, vacant, capacity } = getRoomOccupancy(room);
                    return (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                        data-testid={`room-${room.id}`}
                      >
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start gap-2 h-auto py-1 px-2"
                          onClick={() => setSelectedRoom(room)}
                          data-testid={`button-view-room-${room.id}`}
                        >
                          <DoorOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{room.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {utilized}/{capacity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({vacant} vacant)
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => deleteRoomMutation.mutate(room.id)}
                          disabled={deleteRoomMutation.isPending}
                          data-testid={`button-delete-room-${room.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No rooms added yet</p>
              )}
              
              {/* Room Employees Dialog */}
              <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5" />
                      Room {selectedRoom?.name} - {accommodation.name}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedRoom && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">
                          Capacity: {selectedRoom.capacity || 1}
                        </Badge>
                        <Badge variant="secondary">
                          Occupied: {getEmployeesInRoom(selectedRoom.id).length}
                        </Badge>
                        <Badge variant="default" className="bg-green-600">
                          Vacant: {Math.max(0, (selectedRoom.capacity || 1) - getEmployeesInRoom(selectedRoom.id).length)}
                        </Badge>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Employees in this room
                        </h4>
                        {getEmployeesInRoom(selectedRoom.id).length > 0 ? (
                          <div className="space-y-2">
                            {getEmployeesInRoom(selectedRoom.id).map((emp) => (
                              <div key={emp.id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={emp.profileImageUrl || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{emp.firstName} {emp.lastName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{emp.jobTitle}</p>
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0">{emp.email}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No employees assigned to this room</p>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
      {editOpen && <EditAccommodationDialog accommodation={accommodation} onClose={() => setEditOpen(false)} />}
    </Dialog>
  );
}

function AddAccommodationDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AccommodationFormData>({
    resolver: zodResolver(accommodationFormSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      capacity: undefined,
      numberOfRooms: undefined,
      color: "#10b981",
    },
  });

  const createAccommodation = useMutation({
    mutationFn: async (data: AccommodationFormData) => {
      return await apiRequest("POST", "/api/accommodations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accommodations"] });
      toast({ title: "Accommodation created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create accommodation", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-accommodation">
          <Plus className="h-4 w-4 mr-2" />
          Add Accommodation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Accommodation</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createAccommodation.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Staff Housing Block A" data-testid="input-acc-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St, City" data-testid="input-acc-address" />
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
                    <Textarea {...field} placeholder="Details about this accommodation" data-testid="textarea-acc-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Capacity (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="Max occupants" data-testid="input-acc-capacity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfRooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Rooms</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="e.g., 5" data-testid="input-acc-rooms" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                          data-testid={`acc-color-${color.replace("#", "")}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createAccommodation.isPending} data-testid="button-create-acc">
                {createAccommodation.isPending ? "Creating..." : "Create Accommodation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AccommodationsPage() {
  const { toast } = useToast();

  const { data: accommodations, isLoading } = useQuery<Accommodation[]>({
    queryKey: ["/api/accommodations"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const deleteAccommodation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/accommodations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accommodations"] });
      toast({ title: "Accommodation deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete accommodation", description: parseErrorMessage(error), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Accommodations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employee housing and accommodations</p>
        </div>
        <AddAccommodationDialog />
      </div>

      {accommodations?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accommodations yet</h3>
            <p className="text-muted-foreground mb-4">Create your first accommodation to get started</p>
            <AddAccommodationDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accommodations?.map((accommodation) => (
            <AccommodationCard
              key={accommodation.id}
              accommodation={accommodation}
              employees={employees || []}
              onDelete={() => deleteAccommodation.mutate(accommodation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
