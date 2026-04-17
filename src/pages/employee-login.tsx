import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ employeeCode: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Look up the email tied to this employee code
    const { data: email, error: lookupErr } = await supabase.rpc(
      "email_for_employee_code" as any,
      { _code: formData.employeeCode.trim() },
    );

    if (lookupErr || !email) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description: "Invalid Employee ID or password",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email as string,
      password: formData.password,
    });
    setIsLoading(false);

    if (error || !data.user) {
      toast({
        title: "Login failed",
        description: "Invalid Employee ID or password",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Welcome!", description: "Signed in successfully." });
    navigate("/employee/portal");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Employee Login</CardTitle>
          <CardDescription>Sign in with your Employee ID</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeCode">Employee ID</Label>
              <Input
                id="employeeCode"
                type="text"
                placeholder="e.g. EMP-001"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                required
                autoCapitalize="characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/admin/login"
              className="text-sm text-muted-foreground hover:underline flex items-center justify-center gap-1"
            >
              <Building2 className="h-3 w-3" />
              Admin Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
