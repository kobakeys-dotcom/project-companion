import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRight, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function generateCompanyId(name: string) {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${slug}${suffix}`;
}

export default function AdminRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const [firstName, ...rest] = formData.name.trim().split(" ");
    const lastName = rest.join(" ");
    const redirectUrl = `${window.location.origin}/dashboard`;

    // 1. Sign up — trigger creates profile + default role
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName ?? "",
          last_name: lastName ?? "",
          role: "admin",
        },
      },
    });

    if (signUpError || !signUpData.user) {
      setIsLoading(false);
      toast({
        title: "Registration failed",
        description: signUpError?.message || "Could not create account.",
        variant: "destructive",
      });
      return;
    }

    const userId = signUpData.user.id;

    // 2. Ensure session (auto-confirm enabled, but be defensive)
    if (!signUpData.session) {
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
    }

    // 3. Create company
    const companyCode = generateCompanyId(formData.company);
    const { data: companyRow, error: companyError } = await (supabase
      .from("companies" as any)
      .insert({
        company_id: companyCode,
        name: formData.company,
        contact_email: formData.email,
        contact_phone: formData.phone || null,
        created_by: userId,
      })
      .select()
      .single() as any);

    if (companyError || !companyRow) {
      setIsLoading(false);
      toast({
        title: "Company creation failed",
        description: companyError?.message || "Could not create company.",
        variant: "destructive",
      });
      return;
    }

    // 4. Link profile to company FIRST so RLS helpers see the company
    await (supabase.from("profiles" as any).update({ company_id: companyRow.id }).eq("user_id", userId) as any);

    // 5. Attach company to the admin role row (created by signup trigger)
    await (supabase
      .from("user_roles" as any)
      .update({ company_id: companyRow.id })
      .eq("user_id", userId)
      .eq("role", "admin")
      .is("company_id", null) as any);

    setIsLoading(false);
    toast({
      title: "Welcome to HRM Pro!",
      description: `Your company ID is: ${companyCode}`,
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Admin Account</CardTitle>
          <CardDescription>Register your company and start managing your team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                type="text"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/admin/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/employee/login"
              className="text-sm text-muted-foreground hover:underline flex items-center justify-center gap-1"
            >
              <LogIn className="h-3 w-3" />
              Employee Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
