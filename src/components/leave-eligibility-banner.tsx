/**
 * Visualises an employee's 2-year leave eligibility window and the
 * 3-month expiry countdown. Compact variant fits inside cards/tabs.
 */
import { format } from "date-fns";
import { CalendarClock, ShieldAlert, ShieldCheck, Hourglass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeLeaveEligibility } from "@/lib/leave-eligibility";

interface Props {
  startDate?: string | null;
  createdAt?: string | null;
  variant?: "full" | "compact";
  className?: string;
}

export function LeaveEligibilityBanner({ startDate, createdAt, variant = "full", className }: Props) {
  const e = computeLeaveEligibility(startDate, createdAt);

  if (!e) {
    return (
      <Card className={`p-4 border-dashed ${className ?? ""}`}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-sm">No joining date on file — leave eligibility cannot be calculated.</span>
        </div>
      </Card>
    );
  }

  const fmt = (d: Date) => format(d, "MMM d, yyyy");

  const status = !e.isEligible
    ? { label: "Not eligible yet", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400", Icon: Hourglass }
    : e.isExpired
    ? { label: "Window expired", tone: "bg-red-500/10 text-red-600 dark:text-red-400", Icon: ShieldAlert }
    : e.daysUntilExpiry <= 30
    ? { label: `Expires in ${e.daysUntilExpiry}d`, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400", Icon: CalendarClock }
    : { label: "Eligible", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", Icon: ShieldCheck };

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-xs ${className ?? ""}`}>
        <Badge className={status.tone}>
          <status.Icon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
        <span className="text-muted-foreground">
          Window {fmt(e.windowStart)} → {fmt(e.windowEnd)} · expires {fmt(e.expiryDate)}
        </span>
      </div>
    );
  }

  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md ${status.tone}`}>
            <status.Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Leave eligibility — Cycle {e.cycleNumber}</div>
            <div className="text-sm text-muted-foreground">
              {!e.isEligible
                ? `Becomes eligible on ${fmt(e.eligibleFrom)} (2 years after joining).`
                : e.isExpired
                ? `This window ended on ${fmt(e.windowEnd)} and balance expired ${fmt(e.expiryDate)}.`
                : `Take leave between ${fmt(e.windowStart)} and ${fmt(e.windowEnd)}. Unused balance expires ${fmt(e.expiryDate)}.`}
            </div>
          </div>
        </div>
        <Badge className={status.tone}>{status.label}</Badge>
      </div>
    </Card>
  );
}
