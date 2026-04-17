import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Users,
  Calendar,
  FileText,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock,
  DollarSign,
  Receipt,
  Target,
  Building2,
  FolderKanban,
  Home,
  ClipboardList,
  Settings,
  GitBranch,
  HardHat,
  Mail,
  Phone,
  MapPin,
  Menu,
  UserPlus,
  X,
  FileWarning,
  Landmark,
} from "lucide-react";
import type { PlatformContactSettings } from "@shared/schema";

const allFeatures = [
  {
    icon: Users,
    title: "Employee Management",
    description: "Complete employee directory with profiles, documents, skills, certifications, and emergency contacts. Import/export employees with Excel templates.",
  },
  {
    icon: HardHat,
    title: "Personal Gears",
    description: "Track employee uniforms and safety equipment. Monitor sizes, issue dates, and equipment status across your workforce.",
  },
  {
    icon: GitBranch,
    title: "Org Chart",
    description: "Visual organizational hierarchy. See reporting structures and team compositions at a glance.",
  },
  {
    icon: Calendar,
    title: "Time Off Management",
    description: "Custom leave types, multi-level approval workflows, and automated tracking. Employees can request leave from their portal.",
  },
  {
    icon: Clock,
    title: "Attendance Tracking",
    description: "Clock in/out with geolocation, break management, and detailed attendance reports. Export daily, weekly, or monthly summaries.",
  },
  {
    icon: DollarSign,
    title: "Payroll Management",
    description: "Salary records, allowances (food, accommodation, other), pay periods, and bonus management. Compensation history tracking.",
  },
  {
    icon: Receipt,
    title: "Expense Management",
    description: "Submit and approve expenses with custom expense types. Track spending across departments and projects.",
  },
  {
    icon: Target,
    title: "Performance & Goals",
    description: "Set employee goals, track progress, and conduct performance reviews. Align individual objectives with company targets.",
  },
  {
    icon: Building2,
    title: "Departments",
    description: "Organize your company structure. Assign employees to departments and track department-level metrics.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description: "Create and manage projects. Assign employees to specific projects and track project-based work.",
  },
  {
    icon: Home,
    title: "Accommodations",
    description: "Manage company housing and accommodations. Track room assignments for employees.",
  },
  {
    icon: FileText,
    title: "Document Hub",
    description: "Secure storage for contracts, policies, and employee documents. Upload visas, work permits, and certifications.",
  },
  {
    icon: UserPlus,
    title: "Recruitment",
    description: "Track candidates through the complete hiring process. From application to onboarding with automated status tracking.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "HR metrics, payroll summaries, attendance reports, and employee analytics. Export to PDF and Excel.",
  },
  {
    icon: Shield,
    title: "Employee Portal",
    description: "Self-service portal for employees. View profiles, request time off, clock in/out, and access documents.",
  },
  {
    icon: FileWarning,
    title: "Documents Status",
    description: "Track employee document expiry dates with automated alerts. Monitor passports, visas, work permits, insurance, and medical certificates.",
  },
  {
    icon: Landmark,
    title: "Bank Details",
    description: "Manage employee banking information securely. Track multiple bank accounts per employee with account status monitoring.",
  },
  {
    icon: Settings,
    title: "Company Settings",
    description: "Configure company details, leave policies, approval workflows, and system preferences. Customize HRM Pro to fit your organization.",
  },
];

const subscriptionPlans = [
  {
    name: "Free Trial",
    price: "Free",
    period: "14 days",
    employees: "Up to 10",
    features: ["All core features", "Limited to 10 employees", "Basic support"],
    popular: false,
  },
  {
    name: "Basic",
    price: "$299",
    period: "per year",
    employees: "Up to 30",
    features: ["All core features", "Up to 30 employees", "Email support", "Data export"],
    popular: false,
  },
  {
    name: "Pro",
    price: "$699",
    period: "per year",
    employees: "Up to 100",
    features: ["All core features", "Up to 100 employees", "Priority support", "Advanced reporting"],
    popular: true,
  },
  {
    name: "Smart",
    price: "$1,699",
    period: "per year",
    employees: "Up to 300",
    features: ["All core features", "Up to 300 employees", "Dedicated support", "Custom integrations"],
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Contact Us",
    period: "",
    employees: "Unlimited",
    features: ["All features", "Unlimited employees", "24/7 support", "Custom development", "On-premise option"],
    popular: false,
  },
];

const benefits = [
  "No credit card required for trial",
  "Free forever for small teams",
  "Enterprise-grade security",
  "24/7 customer support",
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: contactSettings } = useQuery<PlatformContactSettings>({
    queryKey: ["/api/platform-contact-settings"],
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">HRM Pro</span>
            </div>
            <div className="hidden lg:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</a>
              <a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <a href="/employee/login" className="hidden lg:block">
                <Button variant="ghost" size="sm" data-testid="button-employee-login">
                  Employee Portal
                </Button>
              </a>
              <a href="/admin/login" className="hidden lg:block">
                <Button variant="ghost" size="sm" data-testid="button-admin-login">
                  Admin Login
                </Button>
              </a>
              <a href="/admin/register">
                <Button size="sm" data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="/careers" className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>Careers</a>
              <a href="/contact" className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              <div className="border-t pt-3 space-y-2">
                <a href="/employee/login" className="block">
                  <Button variant="outline" className="w-full" size="sm">Employee Portal</Button>
                </a>
                <a href="/admin/login" className="block">
                  <Button variant="outline" className="w-full" size="sm">Admin Login</Button>
                </a>
                <a href="/admin/register" className="block">
                  <Button className="w-full" size="sm">Get Started</Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] lg:w-[800px] h-[400px] sm:h-[600px] lg:h-[800px] bg-primary/5 rounded-full blur-3xl" />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto px-2">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-6 sm:mb-8">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">The future of HR management is here</span>
                <span className="xs:hidden">Future of HR is here</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
                Build a thriving
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> workplace</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
                HRM Pro is your all-in-one HR platform. Manage employees, track time-off, 
                streamline onboarding, and unlock powerful insights about your team.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                <a href="/admin/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8" data-testid="button-cta-primary">
                    Start for Free
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </a>
                <a href="#features" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8" data-testid="button-cta-secondary">
                    Explore Features
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 px-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Everything you need to manage your team
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to simplify HR operations and help your people thrive.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {allFeatures.map((feature) => (
                <Card key={feature.title} className="group hover-elevate transition-all duration-300">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 sm:mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 px-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that fits your business. All plans include core HR features.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.name} 
                  className={`relative ${plan.popular ? 'border-primary shadow-lg lg:scale-105' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2 px-3 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                    <div className="mt-3 sm:mt-4">
                      <span className="text-2xl sm:text-3xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-xs sm:text-sm ml-1">{plan.period}</span>}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">{plan.employees} employees</p>
                  </CardHeader>
                  <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                    <ul className="space-y-2 sm:space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <a href="/admin/register" className="block mt-4 sm:mt-6">
                      <Button 
                        className="w-full" 
                        size="sm"
                        variant={plan.popular ? "default" : "outline"}
                        data-testid={`button-plan-${plan.name.toLowerCase()}`}
                      >
                        {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center px-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Ready to transform your HR?
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-10 max-w-2xl mx-auto">
              Join thousands of companies using HRM Pro to build better workplaces.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a href="/admin/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10" data-testid="button-cta-final">
                  Get Started Today
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </a>
              <a href="/contact" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10" data-testid="button-contact">
                  Contact Us
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="font-semibold text-sm sm:text-base">HRM Pro</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Developed by Quantyx Private Limited.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Product</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/admin/register" className="hover:text-foreground transition-colors">Get Started</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Company</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="/contact" className="hover:text-foreground transition-colors">Contact Us</a></li>
                <li><a href="/admin/login" className="hover:text-foreground transition-colors">Admin Login</a></li>
                <li><a href="/employee/login" className="hover:text-foreground transition-colors">Employee Portal</a></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Contact</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                {contactSettings?.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{contactSettings.email}</span>
                  </li>
                )}
                {contactSettings?.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{contactSettings.phone}</span>
                  </li>
                )}
                {(contactSettings?.city || contactSettings?.country) && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{[contactSettings.city, contactSettings.country].filter(Boolean).join(", ")}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} HRM Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
