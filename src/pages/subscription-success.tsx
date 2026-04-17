import { useEffect, useState } from "react";
import { useLocation } from "@/lib/wouter-compat";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function SubscriptionSuccessPage() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('session_id');
    setSessionId(id);
  }, []);

  const { data, isLoading, error } = useQuery<{ success: boolean; message?: string }>({
    queryKey: ["/api/stripe/checkout", sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (data?.success) {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]" data-testid="subscription-loading">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" data-testid="loader-verifying" />
            <p className="text-lg font-medium" data-testid="text-verifying">Verifying your subscription...</p>
            <p className="text-sm text-muted-foreground" data-testid="text-please-wait">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]" data-testid="subscription-error">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive" data-testid="heading-error">Verification Issue</CardTitle>
            <CardDescription data-testid="text-error-description">
              {(error as Error)?.message || "We couldn't verify your subscription. Please contact support."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/settings")} data-testid="button-go-to-settings">
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]" data-testid="subscription-success-page">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-green-500/10 mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600" data-testid="heading-success">Subscription Activated!</CardTitle>
          <CardDescription className="text-base" data-testid="text-success-description">
            Thank you for subscribing. Your account has been upgraded and you now have access to all premium features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground" data-testid="text-confirmation">
            <p>A confirmation email has been sent to your registered email address.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setLocation("/dashboard")} className="w-full" data-testid="button-go-to-dashboard">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => setLocation("/settings")} className="w-full" data-testid="button-view-subscription">
              View Subscription Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
