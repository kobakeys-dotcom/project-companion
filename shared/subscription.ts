export const SUBSCRIPTION_PLANS = {
  free_trial: {
    name: "Free Trial",
    maxEmployees: 300, // Full access during trial
    price: 0,
    priceDisplay: "Free",
    duration: "14 days",
    features: ["All features included", "14-day trial period", "Up to 300 employees"]
  },
  basic: {
    name: "Basic Plan",
    maxEmployees: 30,
    price: 299,
    priceDisplay: "$299/year",
    duration: "1 year",
    features: ["Up to 30 employees", "All core HR features", "Email support"]
  },
  pro: {
    name: "Pro Plan",
    maxEmployees: 100,
    price: 699,
    priceDisplay: "$699/year",
    duration: "1 year",
    features: ["Up to 100 employees", "All core HR features", "Priority support", "Advanced reporting"]
  },
  smart: {
    name: "Smart Plan",
    maxEmployees: 300,
    price: 1699,
    priceDisplay: "$1,699/year",
    duration: "1 year",
    features: ["Up to 300 employees", "All core HR features", "Priority support", "Advanced reporting", "Custom integrations"]
  },
  enterprise: {
    name: "Enterprise Plan",
    maxEmployees: 9999, // Unlimited
    price: null, // Contact for pricing
    priceDisplay: "Contact Us",
    duration: "Custom",
    features: ["Unlimited employees", "All features", "Dedicated support", "Custom integrations", "SLA guarantees"]
  }
} as const;

export type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS;

export function getPlanEmployeeLimit(plan: string): number {
  const planData = SUBSCRIPTION_PLANS[plan as SubscriptionPlanType];
  return planData?.maxEmployees || 30;
}

export function getPlanDetails(plan: string) {
  return SUBSCRIPTION_PLANS[plan as SubscriptionPlanType] || SUBSCRIPTION_PLANS.basic;
}

export function getNextUpgradePlan(currentPlan: string): SubscriptionPlanType | null {
  const planOrder: SubscriptionPlanType[] = ["free_trial", "basic", "pro", "smart", "enterprise"];
  const currentIndex = planOrder.indexOf(currentPlan as SubscriptionPlanType);
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null;
  }
  return planOrder[currentIndex + 1];
}
