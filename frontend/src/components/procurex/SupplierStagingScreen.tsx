import React, { useState } from "react";
import { 
  Clock, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle, 
  Building, 
  Check, 
  Sparkles, 
  LogOut, 
  ArrowRight,
  ShieldCheck,
  FileCheck,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { clearSession, saveSupplier } from "@/lib/auth-store";

type StagingStatus = "Draft" | "Pending Approval" | "Rejected" | "Suspended";

export function SupplierStagingScreen({
  supplier,
  onRefreshSession,
}: {
  supplier: { email: string; status: StagingStatus; supplierName?: string };
  onRefreshSession: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplierName: "",
    supplierType: "Company",
    pan: "",
    gstNo: "",
    gstCategory: "Registered Regular",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  });

  const handleLogout = async () => {
    await clearSession();
    window.location.href = "/procurex/auth";
  };

  const handleStage2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierName.trim()) {
      toast.error("Supplier Name is required.");
      return;
    }
    if (form.pan.length !== 10) {
      toast.error("PAN must be exactly 10 characters.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/method/procurex.api.submit_supplier_details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier_name: form.supplierName.trim(),
          supplier_type: form.supplierType,
          pan: form.pan.toUpperCase(),
          gstin: form.gstNo.toUpperCase(),
          gst_category: form.gstCategory,
          address_line1: form.addressLine1,
          address_line2: form.addressLine2,
          city: form.city,
          state: form.state,
          country: form.country,
          pincode: form.postalCode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData._server_messages
          ? JSON.parse(errData._server_messages).map((m: any) => JSON.parse(m).message).join(", ")
          : errData.exception || "Failed to submit supplier details.";
        toast.error(msg);
        setSubmitting(false);
        return;
      }

      toast.success("Stage 2 completed! Application sent for approval.");
      // Reload session
      onRefreshSession();
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  // Stage 2 Details Form View
  if (supplier.status === "Draft") {
    return (
      <div className="min-h-screen bg-[oklch(0.995_0.001_250)] text-foreground flex flex-col justify-between py-12 px-6">
        <div className="mx-auto max-w-2xl w-full bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
          
          {/* Form Header */}
          <div className="bg-gradient-to-r from-primary to-[oklch(0.35_0.06_260)] p-8 text-white relative">
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 animate-pulse">
              <Sparkles className="size-3" /> Step 2 of 3
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Complete Supplier Registration</h2>
            <p className="text-white/60 text-sm mt-1">Please provide your organization details to request portal access.</p>
          </div>

          <form onSubmit={handleStage2Submit} className="p-8 space-y-6">
            
            {/* Multi-step progress bar */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-success/20 border border-success/40 text-success grid place-items-center text-xs font-bold">✓</div>
                <span className="text-xs font-medium text-muted-foreground">Credentials</span>
              </div>
              <div className="h-0.5 flex-1 bg-border mx-2">
                <div className="h-full bg-primary w-1/2 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-primary text-white grid place-items-center text-xs font-bold">2</div>
                <span className="text-xs font-medium text-foreground">Supplier Info</span>
              </div>
              <div className="h-0.5 flex-1 bg-border mx-2"></div>
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-muted border border-border text-muted-foreground grid place-items-center text-xs font-bold">3</div>
                <span className="text-xs font-medium text-muted-foreground">Approval</span>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="supplierName">Supplier Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="supplierName" 
                    required 
                    placeholder="e.g. Acme Corp Ltd" 
                    value={form.supplierName} 
                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })} 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="supplierType">Supplier Type</Label>
                  <Select 
                    value={form.supplierType} 
                    onValueChange={(v) => setForm({ ...form, supplierType: v })}
                  >
                    <SelectTrigger id="supplierType" className="w-full bg-background border-input">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Company">Company</SelectItem>
                      <SelectItem value="Individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pan">PAN <span className="text-destructive">*</span></Label>
                  <Input 
                    id="pan" 
                    required 
                    maxLength={10} 
                    placeholder="ABCDE1234F" 
                    value={form.pan} 
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gstNo">GST No <span className="text-destructive">*</span></Label>
                  <Input 
                    id="gstNo" 
                    required 
                    maxLength={15} 
                    placeholder="27AAAAA0000A1Z5" 
                    value={form.gstNo} 
                    onChange={(e) => setForm({ ...form, gstNo: e.target.value.toUpperCase() })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gstCategory">GST Category</Label>
                  <Select 
                    value={form.gstCategory} 
                    onValueChange={(v) => setForm({ ...form, gstCategory: v })}
                  >
                    <SelectTrigger id="gstCategory" className="w-full bg-background border-input">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Registered Regular">Registered Regular</SelectItem>
                      <SelectItem value="Registered Composition">Registered Composition</SelectItem>
                      <SelectItem value="Unregistered">Unregistered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1 <span className="text-destructive">*</span></Label>
                  <Input 
                    id="addressLine1" 
                    required 
                    value={form.addressLine1} 
                    onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input 
                    id="addressLine2" 
                    value={form.addressLine2} 
                    onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Input 
                    id="city" 
                    required 
                    value={form.city} 
                    onChange={(e) => setForm({ ...form, city: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                  <Input 
                    id="state" 
                    required 
                    value={form.state} 
                    onChange={(e) => setForm({ ...form, state: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    required 
                    value={form.country} 
                    onChange={(e) => setForm({ ...form, country: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Pincode / Postal Code <span className="text-destructive">*</span></Label>
                  <Input 
                    id="postalCode" 
                    required 
                    value={form.postalCode} 
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })} 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleLogout} 
                className="w-1/3"
              >
                <LogOut className="mr-2 size-4" /> Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="w-2/3 bg-primary hover:bg-primary/90"
              >
                {submitting ? "Submitting..." : "Submit Registration"}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </form>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} ProcureX. All rights reserved.
        </div>
      </div>
    );
  }

  // Zomato-Style Pending Approval Radar Animation View
  if (supplier.status === "Pending Approval") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-16 px-6 relative overflow-hidden">
        
        {/* Decorative scanning line effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,transparent_70%)]"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-bounce opacity-40"></div>

        <div className="mx-auto max-w-md w-full text-center space-y-8 relative z-10 animate-in fade-in duration-700">
          
          <div className="flex justify-center">
            <div className="relative flex items-center justify-center size-36">
              {/* Radar waves (Zomato delivery style pulse waves) */}
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-sonar" style={{ animationDelay: "0s" }}></div>
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-sonar" style={{ animationDelay: "1s" }}></div>
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-sonar" style={{ animationDelay: "2s" }}></div>
              
              {/* Center icon */}
              <div className="relative grid place-items-center size-24 rounded-full bg-slate-900 border border-amber-500/40 text-amber-500 shadow-2xl shadow-amber-500/20">
                <Clock className="size-11 animate-float" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              Application Under Review
            </h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              We are auditing your corporate credentials and compliance files. Typically, accounts are provisioned within 2 hours.
            </p>
          </div>

          {/* Workflow progress checkpoints */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 text-left space-y-4 shadow-xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
              Onboarding Checklist
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 grid place-items-center text-xs font-bold">✓</div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Credentials Created</div>
                  <div className="text-xs text-slate-500">Contact & email verification complete</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 grid place-items-center text-xs font-bold">✓</div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Supplier Info Submitted</div>
                  <div className="text-xs text-slate-500">PAN, Tax ID & addresses verified</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative size-6">
                  {/* Pulsing ring around loader */}
                  <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping"></span>
                  <div className="relative size-6 rounded-full bg-amber-500/20 border border-amber-500 text-amber-500 grid place-items-center text-xs font-bold">
                    <span className="size-2 rounded-full bg-amber-500"></span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-400">Compliance Audit</div>
                  <div className="text-xs text-slate-400 animate-pulse">Pending administrator approval...</div>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-40">
                <div className="size-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 grid place-items-center text-xs font-bold">4</div>
                <div>
                  <div className="text-sm font-semibold text-slate-400">Portal Access Provisioned</div>
                  <div className="text-xs text-slate-600">Access dashboard and RFQs</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onRefreshSession}
              className="w-full bg-slate-900 border-slate-800 hover:bg-slate-850 hover:text-white"
            >
              Check Status Again
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleLogout} 
              className="text-slate-500 hover:text-white"
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          Need assistance? Contact our procurement desk at support@procurex.in
        </div>
      </div>
    );
  }

  // Declined / Rejected View
  if (supplier.status === "Rejected") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-16 px-6">
        <div className="mx-auto max-w-md w-full text-center space-y-8 animate-in fade-in duration-500">
          
          <div className="flex justify-center">
            <div className="size-20 rounded-full bg-red-500/20 border border-red-500 text-red-500 grid place-items-center shadow-xl shadow-red-500/10">
              <ShieldAlert className="size-10 animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-red-400 bg-clip-text text-transparent">
              Onboarding Declined
            </h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              You have been rejected by the administrator. Please contact your procurement head or support for further instructions.
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 text-slate-300 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <AlertCircle className="text-red-500 size-5 flex-shrink-0" />
              <div className="text-sm font-semibold text-slate-200">Registration Status: Rejected</div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              If you believe this decision is in error, or if you need to submit supplementary compliance certificates, please contact:
              <br /><strong className="text-slate-300">procurement-ops@procurex.in</strong>
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              type="button" 
              onClick={handleLogout} 
              className="w-full bg-red-650 hover:bg-red-700 text-white"
            >
              <LogOut className="mr-2 size-4" /> Log out
            </Button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          ProcureX Supplier Portal Management Desk
        </div>
      </div>
    );
  }

  // Suspended View
  if (supplier.status === "Suspended") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-16 px-6">
        <div className="mx-auto max-w-md w-full text-center space-y-8 animate-in fade-in duration-500">
          
          <div className="flex justify-center">
            <div className="size-20 rounded-full bg-orange-500/20 border border-orange-500 text-orange-500 grid place-items-center shadow-xl shadow-orange-500/10">
              <ShieldAlert className="size-10 animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-orange-400 bg-clip-text text-transparent">
              Account Suspended
            </h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              Your supplier account has been suspended by the administrator. Portal services are currently disabled.
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 text-slate-300 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <AlertCircle className="text-orange-500 size-5 flex-shrink-0" />
              <div className="text-sm font-semibold text-slate-200">Compliance Warning</div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              Suspensions are typically triggered due to expired business certificates, security audit failures, or policy violations. Contact your contracting administrator.
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              type="button" 
              onClick={handleLogout} 
              className="w-full bg-orange-650 hover:bg-orange-700 text-white"
            >
              <LogOut className="mr-2 size-4" /> Log out
            </Button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600">
          ProcureX Supplier Governance Desk
        </div>
      </div>
    );
  }

  return null;
}
