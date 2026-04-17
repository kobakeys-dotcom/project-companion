import { useLocation } from "@/lib/wouter-compat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function SubscriptionCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]" data-testid="subscription-cancel-page">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-muted mb-4">
            <XCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl" data-testid="heading-cancelled">Payment Cancelled</CardTitle>
          <CardDescription className="text-base" data-testid="text-cancel-description">
            Your subscription payment was cancelled. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground" data-testid="text-cancel-info">
            <p>Changed your mind? You can always upgrade your subscription later from the Settings page.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setLocation("/pricing")} className="w-full" data-testid="button-try-again">
              <CreditCard className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => setLocation("/dashboard")} className="w-full" data-testid="button-back-to-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
