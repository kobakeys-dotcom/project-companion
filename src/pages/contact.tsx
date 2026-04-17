import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Globe,
  MessageSquare,
  Send,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { Linkedin as SiLinkedin, Facebook as SiFacebook, Instagram as SiInstagram, X as SiX, X as SiXIcon } from 'lucide-react';
import type { PlatformContactSettings } from "@shared/schema";

export default function ContactPage() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: contactSettings } = useQuery<PlatformContactSettings>({
    queryKey: ["/api/platform-contact-settings"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message Sent!",
      description: "Thank you for contacting us. We'll get back to you soon.",
    });
    
    setFormData({ name: "", email: "", company: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            <a href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">HRM Pro</span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="/contact" className="text-sm font-medium">Contact</a>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <a href="/admin/register">
                <Button size="sm" data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="flex sm:hidden items-center gap-2">
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
          <div className="sm:hidden border-t bg-background">
            <div className="px-4 py-4 space-y-3">
              <a href="/#features" className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="/#pricing" className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="/contact" className="block py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              <div className="border-t pt-3">
                <a href="/admin/register" className="block">
                  <Button className="w-full" size="sm">Get Started</Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <a href="/" className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Back to Home
            </a>
          </div>

          <div className="text-center mb-8 sm:mb-12 px-2">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Contact Us</h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions about HRM Pro? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Get in Touch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactSettings?.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Email</p>
                        <a href={`mailto:${contactSettings.email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {contactSettings.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {contactSettings?.supportEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Support</p>
                        <a href={`mailto:${contactSettings.supportEmail}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {contactSettings.supportEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {contactSettings?.salesEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Sales</p>
                        <a href={`mailto:${contactSettings.salesEmail}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {contactSettings.salesEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {contactSettings?.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Phone</p>
                        <a href={`tel:${contactSettings.phone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {contactSettings.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {contactSettings?.whatsapp && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">WhatsApp</p>
                        <a href={`https://wa.me/${contactSettings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {contactSettings.whatsapp}
                        </a>
                      </div>
                    </div>
                  )}
                  {contactSettings?.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Address</p>
                        <p className="text-sm text-muted-foreground">
                          {contactSettings.address}
                          {contactSettings.city && <><br />{contactSettings.city}</>}
                          {contactSettings.country && <><br />{contactSettings.country}</>}
                        </p>
                      </div>
                    </div>
                  )}
                  {contactSettings?.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Website</p>
                        <a href={contactSettings.website} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {contactSettings.website}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              {(contactSettings?.facebookUrl || contactSettings?.twitterUrl || contactSettings?.linkedinUrl || contactSettings?.instagramUrl) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Follow Us</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      {contactSettings.facebookUrl && (
                        <a href={contactSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" data-testid="link-facebook">
                          <SiFacebook className="h-5 w-5" />
                        </a>
                      )}
                      {contactSettings.twitterUrl && (
                        <a href={contactSettings.twitterUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" data-testid="link-twitter">
                          <SiXIcon className="h-5 w-5" />
                        </a>
                      )}
                      {contactSettings.linkedinUrl && (
                        <a href={contactSettings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" data-testid="link-linkedin">
                          <SiLinkedin className="h-5 w-5" />
                        </a>
                      )}
                      {contactSettings.instagramUrl && (
                        <a href={contactSettings.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" data-testid="link-instagram">
                          <SiInstagram className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Send us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          required
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="Your Company"
                          data-testid="input-contact-company"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="How can we help?"
                          required
                          data-testid="input-contact-subject"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more about your inquiry..."
                        rows={6}
                        required
                        data-testid="input-contact-message"
                      />
                    </div>
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting} data-testid="button-send-message">
                      {isSubmitting ? "Sending..." : "Send Message"}
                      <Send className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} HRM Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
