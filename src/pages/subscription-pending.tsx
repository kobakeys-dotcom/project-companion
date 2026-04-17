import { useLocation } from "@/lib/wouter-compat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, CheckCircle } from "lucide-react";

export default function SubscriptionPendingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]" data-testid="subscription-pending-page">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-yellow-500/10 mb-4">
            <Clock className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-xl" data-testid="heading-pending">Payment Under Review</CardTitle>
          <CardDescription className="text-base" data-testid="text-pending-description">
            Your bank transfer payment has been submitted and is currently being reviewed by our team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span className="text-sm">Payment slip submitted successfully</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span className="text-sm">Review typically takes 1-2 business days</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-muted-foreground">You'll receive an email once approved</span>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground" data-testid="text-contact-info">
            <p>Questions? Contact us at support@hrmpro.com</p>
          </div>
          <Button onClick={() => setLocation("/dashboard")} className="w-full" data-testid="button-go-to-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
