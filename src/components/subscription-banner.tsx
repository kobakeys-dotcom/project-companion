import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/wouter-compat";

interface SubscriptionInfo {
  currentPlan: string;
  planName: string;
  maxEmployees: number;
  employeeCount: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  isTrialActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
}

export function SubscriptionBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: subscription } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  if (!subscription || dismissed) return null;

  const showTrialWarning = subscription.isTrialActive && subscription.daysRemaining <= 7;
  const showExpiredWarning = subscription.isExpired;
  const showLimitWarning = subscription.isAtLimit;
  const showNearLimitWarning = subscription.isNearLimit && !subscription.isAtLimit;

  if (!showTrialWarning && !showExpiredWarning && !showLimitWarning && !showNearLimitWarning) {
    return null;
  }

  let bgColor = "bg-orange-500";
  let icon = <AlertTriangle className="h-4 w-4" />;
  let message = "";

  if (showExpiredWarning) {
    bgColor = "bg-red-500";
    icon = <Clock className="h-4 w-4" />;
    message = "Your trial has expired. Please upgrade to continue using all features.";
  } else if (showLimitWarning) {
    bgColor = "bg-red-500";
    icon = <Users className="h-4 w-4" />;
    message = `Employee limit reached (${subscription.employeeCount}/${subscription.maxEmployees}). Upgrade your plan to add more employees.`;
  } else if (showTrialWarning) {
    bgColor = "bg-orange-500";
    icon = <Clock className="h-4 w-4" />;
    message = `Your free trial ends in ${subscription.daysRemaining} day${subscription.daysRemaining !== 1 ? 's' : ''}. Upgrade now to keep all features.`;
  } else if (showNearLimitWarning) {
    bgColor = "bg-yellow-500";
    icon = <AlertTriangle className="h-4 w-4" />;
    message = `You're approaching your employee limit (${subscription.employeeCount}/${subscription.maxEmployees}). Consider upgrading your plan.`;
  }

  return (
    <div className={`${bgColor} text-white px-4 py-2 flex items-center justify-between gap-4`} data-testid="subscription-banner">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/pricing">
          <Button size="sm" variant="secondary" className="h-7 text-xs" data-testid="button-upgrade">
            Upgrade Now
          </Button>
        </Link>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 hover:bg-white/20" 
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
