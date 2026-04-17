/**
 * Manager review page for clock-in / clock-out selfies.
 * Lists time_entries that have a selfie attached, with filters by date.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, MapPin, LogIn, LogOut as LogOutIcon } from "lucide-react";
import { format } from "date-fns";

const sb: any = supabase;

interface Entry {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  clockInLocation: string | null;
  clockOutLocation: string | null;
  clockInSelfieUrl: string | null;
  clockOutSelfieUrl: string | null;
  source: string | null;
  employees?: { firstName: string; lastName: string; profileImageUrl: string | null };
}

function SelfieImg({ path, label, icon }: { path: string; label: string; icon: React.ReactNode }) {
  const { data: url } = useQuery({
    queryKey: ["selfie-signed", path],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("selfies").createSignedUrl(path, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}<span>{label}</span>
      </div>
      {url ? (
        <img src={url} alt={label} className="w-32 h-32 object-cover rounded-md border" />
      ) : (
        <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function AttendanceSelfiesPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["attendance-selfies", user?.companyId, date],
    enabled: !!user?.companyId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("time_entries")
        .select("*, employees(firstName,lastName,profileImageUrl)")
        .eq("date", date)
        .order("clockIn", { ascending: false });
      if (error) throw error;
      return (data || []).filter((e: any) => e.clockInSelfieUrl || e.clockOutSelfieUrl);
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Camera className="h-7 w-7" />
          Attendance Selfies
        </h1>
        <p className="text-muted-foreground">Review clock-in/out selfies submitted by employees.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">
          No selfies for this date.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{e.employees?.firstName} {e.employees?.lastName}</span>
                  {e.source && <Badge variant="outline">{e.source}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  {e.clockInSelfieUrl && (
                    <div className="space-y-2">
                      <SelfieImg path={e.clockInSelfieUrl} label={`In · ${format(new Date(e.clockIn), "h:mm a")}`} icon={<LogIn className="h-3 w-3" />} />
                      {e.clockInLocation && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{e.clockInLocation}
                        </p>
                      )}
                    </div>
                  )}
                  {e.clockOutSelfieUrl && (
                    <div className="space-y-2">
                      <SelfieImg path={e.clockOutSelfieUrl} label={`Out · ${e.clockOut ? format(new Date(e.clockOut), "h:mm a") : "—"}`} icon={<LogOutIcon className="h-3 w-3" />} />
                      {e.clockOutLocation && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{e.clockOutLocation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
