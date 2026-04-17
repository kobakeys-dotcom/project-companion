import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "@/lib/wouter-compat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Copy, CheckCircle, Upload, ArrowLeft, CreditCard, Loader2, FileCheck } from "lucide-react";

interface BankTransferSettings {
  available: boolean;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchName?: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  additionalInstructions?: string;
}

interface PlanInfo {
  planType: string;
  planName: string;
  price: number;
  currency: string;
}

const planDetails: Record<string, PlanInfo> = {
  basic: { planType: "basic", planName: "Basic Plan", price: 29900, currency: "usd" },
  pro: { planType: "pro", planName: "Pro Plan", price: 69900, currency: "usd" },
  smart: { planType: "smart", planName: "Smart Plan", price: 169900, currency: "usd" },
  enterprise: { planType: "enterprise", planName: "Enterprise Plan", price: 99900, currency: "usd" },
};

export default function BankTransferCheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "details" | "upload">("select");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    payerName: "",
    payerEmail: "",
    transferDate: "",
    referenceNumber: "",
    slipUrl: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bankSettings, isLoading } = useQuery<BankTransferSettings>({
    queryKey: ["/api/bank-transfer-settings"],
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Payment slip must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, JPEG, PNG, or GIF file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Request presigned upload URL
      const urlRes = await apiRequest("POST", "/api/uploads/payment-slip", {
        name: file.name,
        size: file.size,
        contentType: file.type,
      });
      const { uploadURL, objectPath } = await urlRes.json();

      // Upload file to object storage
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      // Store the object path as the slip URL
      setFormData(prev => ({ ...prev, slipUrl: objectPath }));
      setUploadedFileName(file.name);
      toast({
        title: "File uploaded",
        description: "Payment slip uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload payment slip",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bank-transfer-payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transfer-payments"] });
      toast({
        title: "Payment Submitted",
        description: "Your payment slip has been submitted for review. We'll notify you once it's approved.",
      });
      setLocation("/subscription/pending");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit payment",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleSubmit = () => {
    if (!selectedPlan || !formData.payerName || !formData.payerEmail || !formData.transferDate || !formData.slipUrl) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload a payment slip",
        variant: "destructive",
      });
      return;
    }

    const plan = planDetails[selectedPlan];
    submitMutation.mutate({
      planType: plan.planType,
      amount: plan.price,
      currency: plan.currency,
      payerName: formData.payerName,
      payerEmail: formData.payerEmail,
      transferDate: formData.transferDate,
      referenceNumber: formData.referenceNumber,
      slipUrl: formData.slipUrl,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4" data-testid="bank-transfer-loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bankSettings?.available) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto" data-testid="bank-transfer-unavailable">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">Bank Transfer Not Available</h2>
            <p className="text-muted-foreground">
              Bank transfer payment option is currently not available. Please use card payment instead.
            </p>
            <Button onClick={() => setLocation("/pricing")} data-testid="button-back-to-pricing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6" data-testid="bank-transfer-checkout">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/pricing")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold" data-testid="heading-bank-transfer">Bank Transfer Payment</h1>
      </div>

      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle data-testid="heading-select-plan">Select a Plan</CardTitle>
            <CardDescription>Choose the subscription plan you want to purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(planDetails).map(([key, plan]) => (
              <div
                key={key}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPlan === key ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedPlan(key)}
                data-testid={`plan-option-${key}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium" data-testid={`text-plan-name-${key}`}>{plan.planName}</h3>
                    <p className="text-sm text-muted-foreground">Annual subscription</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold" data-testid={`text-plan-price-${key}`}>
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">/year</span>
                  </div>
                </div>
              </div>
            ))}
            <Button 
              className="w-full mt-4" 
              disabled={!selectedPlan}
              onClick={() => setStep("details")}
              data-testid="button-continue"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "details" && selectedPlan && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="heading-bank-details">
                <Building2 className="h-5 w-5" />
                Bank Account Details
              </CardTitle>
              <CardDescription>Transfer the payment to this bank account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bank Name</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" data-testid="text-bank-name">{bankSettings.bankName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(bankSettings.bankName!, "bankName")}
                      data-testid="button-copy-bank-name"
                    >
                      {copiedField === "bankName" ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Name</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" data-testid="text-account-name">{bankSettings.accountName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(bankSettings.accountName!, "accountName")}
                      data-testid="button-copy-account-name"
                    >
                      {copiedField === "accountName" ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono" data-testid="text-account-number">{bankSettings.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(bankSettings.accountNumber!, "accountNumber")}
                      data-testid="button-copy-account-number"
                    >
                      {copiedField === "accountNumber" ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                {bankSettings.branchName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Branch</span>
                    <span className="font-medium" data-testid="text-branch">{bankSettings.branchName}</span>
                  </div>
                )}
                {bankSettings.swiftCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SWIFT Code</span>
                    <span className="font-medium font-mono" data-testid="text-swift">{bankSettings.swiftCode}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Amount to Transfer</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1" data-testid="text-amount">
                    {formatPrice(planDetails[selectedPlan].price, planDetails[selectedPlan].currency)}
                  </Badge>
                </div>
              </div>

              {bankSettings.additionalInstructions && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200" data-testid="text-instructions">
                    {bankSettings.additionalInstructions}
                  </p>
                </div>
              )}

              <Button className="w-full" onClick={() => setStep("upload")} data-testid="button-upload-slip">
                I've Made the Transfer - Upload Slip
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "upload" && selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle data-testid="heading-upload">Upload Payment Slip</CardTitle>
            <CardDescription>
              Please provide your transfer details and upload the bank payment slip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payerName">Your Name *</Label>
              <Input
                id="payerName"
                value={formData.payerName}
                onChange={(e) => setFormData(prev => ({ ...prev, payerName: e.target.value }))}
                placeholder="Enter your full name"
                data-testid="input-payer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payerEmail">Email Address *</Label>
              <Input
                id="payerEmail"
                type="email"
                value={formData.payerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, payerEmail: e.target.value }))}
                placeholder="Enter your email"
                data-testid="input-payer-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferDate">Transfer Date *</Label>
              <Input
                id="transferDate"
                type="date"
                value={formData.transferDate}
                onChange={(e) => setFormData(prev => ({ ...prev, transferDate: e.target.value }))}
                data-testid="input-transfer-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
              <Input
                id="referenceNumber"
                value={formData.referenceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                placeholder="Bank transfer reference number"
                data-testid="input-reference"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Slip *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
              
              {uploadedFileName ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <FileCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200 flex-1 truncate" data-testid="text-uploaded-file">
                    {uploadedFileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-change-file"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-file"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6" />
                      <span>Click to upload payment slip</span>
                      <span className="text-xs text-muted-foreground">PDF, JPEG, PNG, or GIF (max 10MB)</span>
                    </div>
                  )}
                </Button>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1" data-testid="button-back-step">
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitMutation.isPending}
                className="flex-1"
                data-testid="button-submit"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Payment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
