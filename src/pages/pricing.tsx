import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Zap, Users, Shield, Sparkles, Building2 } from "lucide-react";
import { Link } from "@/lib/wouter-compat";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
  metadata: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: Price[];
}

interface SubscriptionInfo {
  currentPlan: string;
  planName: string;
  isTrialActive: boolean;
  isExpired: boolean;
}

const planFeatures: Record<string, string[]> = {
  basic: [
    "Up to 30 employees",
    "Employee management",
    "Time tracking",
    "Leave management",
    "Basic reports",
    "Email support",
  ],
  pro: [
    "Up to 100 employees",
    "Everything in Basic",
    "Performance reviews",
    "Document management",
    "Advanced analytics",
    "Priority support",
  ],
  smart: [
    "Up to 300 employees",
    "Everything in Pro",
    "Multi-department management",
    "Custom integrations",
    "API access",
    "Dedicated support",
  ],
  enterprise: [
    "Unlimited employees",
    "Everything in Smart",
    "Dedicated account manager",
    "Custom development",
    "SLA guarantee",
    "24/7 phone support",
  ],
};

const planIcons: Record<string, typeof Crown> = {
  basic: Users,
  pro: Zap,
  smart: Sparkles,
  enterprise: Crown,
};

export default function PricingPage() {
  const { toast } = useToast();

  const { data: productsData, isLoading: loadingProducts } = useQuery<{ products: Product[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const { data: subscription, isLoading: loadingSubscription } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const stripeProducts = productsData?.products || [];

  // Fallback products when Stripe isn't configured
  const fallbackProducts: Product[] = [
    {
      id: "basic",
      name: "Basic Plan",
      description: "Perfect for small teams. Up to 30 employees with essential HR features.",
      active: true,
      metadata: { planType: "basic", maxEmployees: "30" },
      prices: [{ id: "fallback_basic", unit_amount: 29900, currency: "usd", recurring: { interval: "year" }, active: true, metadata: {} }]
    },
    {
      id: "pro",
      name: "Pro Plan",
      description: "For growing businesses. Up to 100 employees with advanced features.",
      active: true,
      metadata: { planType: "pro", maxEmployees: "100" },
      prices: [{ id: "fallback_pro", unit_amount: 69900, currency: "usd", recurring: { interval: "year" }, active: true, metadata: {} }]
    },
    {
      id: "smart",
      name: "Smart Plan",
      description: "For larger organizations. Up to 300 employees with premium features.",
      active: true,
      metadata: { planType: "smart", maxEmployees: "300" },
      prices: [{ id: "fallback_smart", unit_amount: 169900, currency: "usd", recurring: { interval: "year" }, active: true, metadata: {} }]
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      description: "Unlimited employees with dedicated support and custom solutions.",
      active: true,
      metadata: { planType: "enterprise", maxEmployees: "9999" },
      prices: [{ id: "fallback_enterprise", unit_amount: 99900, currency: "usd", recurring: { interval: "year" }, active: true, metadata: {} }]
    }
  ];

  const correctPrices: Record<string, number> = {
    basic: 29900,
    pro: 69900,
    smart: 169900,
    enterprise: 99900,
  };

  const correctedStripeProducts = stripeProducts.map(product => {
    const planType = product.metadata?.planType;
    if (planType && correctPrices[planType] && product.prices.length > 0) {
      return {
        ...product,
        prices: product.prices.map(price => ({
          ...price,
          unit_amount: correctPrices[planType],
        })),
      };
    }
    return product;
  });

  // Use Stripe products if available, otherwise use fallback
  const products = correctedStripeProducts.length > 0 ? correctedStripeProducts : fallbackProducts;
  const usingFallback = correctedStripeProducts.length === 0;

  // Sort products by price
  const sortedProducts = [...products].sort((a, b) => {
    const priceA = a.prices[0]?.unit_amount || 0;
    const priceB = b.prices[0]?.unit_amount || 0;
    return priceA - priceB;
  });

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const handleSubscribe = (priceId: string) => {
    checkoutMutation.mutate(priceId);
  };

  const isCurrentPlan = (planType: string) => {
    return subscription?.currentPlan === planType;
  };

  if (loadingProducts || loadingSubscription) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" data-testid="pricing-loading">
        <div className="text-center space-y-2">
          <Skeleton className="h-10 w-64 mx-auto" data-testid="skeleton-heading" />
          <Skeleton className="h-6 w-96 mx-auto" data-testid="skeleton-description" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" data-testid={`skeleton-card-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" data-testid="pricing-page">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="heading-pricing">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-description">
          Select the perfect plan for your team. All plans include a 14-day free trial.
        </p>
        {subscription?.isTrialActive && (
          <Badge variant="secondary" className="mt-2" data-testid="badge-trial-active">
            Currently on Free Trial
          </Badge>
        )}
      </div>

      {sortedProducts.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Subscription plans are being set up. Please check back shortly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedProducts.map((product) => {
            const price = product.prices[0];
            const planType = product.metadata?.planType || 'basic';
            const features = planFeatures[planType] || planFeatures.basic;
            const Icon = planIcons[planType] || Users;
            const isCurrent = isCurrentPlan(planType);
            const isPopular = planType === 'pro';

            return (
              <Card 
                key={product.id} 
                className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg' : ''} ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                data-testid={`pricing-card-${planType}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid={`badge-popular-${planType}`}>
                    Most Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="secondary" className="absolute -top-3 right-4" data-testid={`badge-current-${planType}`}>
                    Current Plan
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto p-3 rounded-full ${
                    planType === 'enterprise' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' :
                    planType === 'smart' ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' :
                    planType === 'pro' ? 'bg-blue-500/20' :
                    'bg-slate-500/20'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      planType === 'enterprise' ? 'text-yellow-500' :
                      planType === 'smart' ? 'text-purple-500' :
                      planType === 'pro' ? 'text-blue-500' :
                      'text-slate-500'
                    }`} />
                  </div>
                  <CardTitle className="text-lg" data-testid={`text-plan-name-${planType}`}>{product.name}</CardTitle>
                  <CardDescription className="text-xs min-h-[2.5rem]" data-testid={`text-plan-description-${planType}`}>
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-center mb-4" data-testid={`text-plan-price-${planType}`}>
                    {price ? (
                      <>
                        <span className="text-3xl font-bold">
                          {formatPrice(price.unit_amount, price.currency)}
                        </span>
                        <span className="text-muted-foreground">
                          /{price.recurring?.interval || 'year'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-semibold text-muted-foreground">
                        Contact Us
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm" data-testid={`list-features-${planType}`}>
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  {usingFallback ? (
                    <Link href="/bank-transfer-checkout" className="w-full">
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                        disabled={isCurrent}
                        data-testid={`button-subscribe-${planType}`}
                      >
                        {isCurrent ? "Current Plan" :
                         planType === 'enterprise' ? "Contact Sales" :
                         "Pay with Bank Transfer"}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      disabled={isCurrent || checkoutMutation.isPending || !price}
                      onClick={() => price && handleSubscribe(price.id)}
                      data-testid={`button-subscribe-${planType}`}
                    >
                      {checkoutMutation.isPending ? "Processing..." : 
                       isCurrent ? "Current Plan" :
                       planType === 'enterprise' ? "Contact Sales" :
                       "Subscribe"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center space-y-4" data-testid="pricing-footer">
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-3">Or pay via bank transfer</p>
          <Link href="/bank-transfer-checkout">
            <Button variant="outline" className="gap-2" data-testid="button-bank-transfer">
              <Building2 className="h-4 w-4" />
              Pay with Bank Transfer
            </Button>
          </Link>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-1" data-testid="text-secure-payment">
            <Shield className="h-4 w-4" />
            Secure payment powered by Stripe
          </p>
          <p data-testid="text-cancel-policy">Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </div>
  );
}
