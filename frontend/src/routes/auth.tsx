import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, TrendingUp, PackageSearch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  findSupplier,
  saveSupplier,
  setSession,
  getSession,
  getRole,
  setRole,
  markSessionVerified,
  type Supplier,
} from "@/lib/auth-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ProcureX" },
      { name: "description", content: "Sign in to ProcureX to access your supplier intelligence dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleRedirect = (role?: string) => {
    const activeRole = role || getRole();
    if (activeRole === "Supplier") {
      navigate({ to: "/supplier-portal" });
    } else {
      navigate({ to: "/" });
    }
  };

  useEffect(() => {
    if (getSession()) {
      handleRedirect();
    }
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      <LandingPane />
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-md">
          {mode === "login" ? (
            <LoginForm onSwitch={() => setMode("register")} onSuccess={(role) => handleRedirect(role)} />
          ) : (
            <RegisterForm onSwitch={() => setMode("login")} onSuccess={() => handleRedirect("Supplier")} />
          )}
        </div>
      </div>
    </div>
  );
}

function LandingPane() {
  return (
    <div className="relative hidden overflow-hidden bg-[oklch(0.22_0.04_260)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px, 72px 72px",
        }}
      />
      <div className="relative">
        <Link to="/auth" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-md bg-white/10 ring-1 ring-white/20">
            <Sparkles className="size-4" />
          </span>
          ProcureX
        </Link>
      </div>

      <div className="relative space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkles className="size-3" /> Supplier Intelligence Platform
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Where enterprise procurement<br />meets real-time intelligence.
          </h1>
          <p className="max-w-md text-sm text-white/60">
            Track spend, monitor qualification status, and unlock AI-driven insights across your entire supplier network — all in one place.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Feature icon={TrendingUp} title="Spend Analytics" copy="$5.3M tracked" />
          <Feature icon={ShieldCheck} title="AVL Status" copy="Live qualification" />
          <Feature icon={PackageSearch} title="AI Insights" copy="Reorder & risk" />
        </div>
      </div>

      <div className="relative text-xs text-white/40">
        © {new Date().getFullYear()} ProcureX. Enterprise procurement, reimagined.
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, copy }: { icon: typeof Sparkles; title: string; copy: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <Icon className="size-4 text-white/80" />
      <div className="mt-3 text-sm font-medium">{title}</div>
      <div className="text-xs text-white/50">{copy}</div>
    </div>
  );
}

function LoginForm({ onSwitch, onSuccess }: { onSwitch: () => void; onSuccess: (role?: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/method/procurex.api.login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usr: email.trim(),
          pwd: password,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData._server_messages
          ? JSON.parse(errData._server_messages).map((m: any) => JSON.parse(m).message).join(", ")
          : errData.exception || "Invalid credentials or login failed.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.message) {
        const userDetail = data.message;
        // Auto-detect role: If supplier details or supplier user type are present
        const detectedRole = userDetail.role || (userDetail.supplierName || userDetail.email ? "Supplier" : "Supplier");
        saveSupplier({ ...userDetail, role: detectedRole });
        setSession(userDetail.email);
        setRole(detectedRole);
        // Mark session as freshly verified so AppShell's syncSession() uses
        // the cached localStorage data instead of immediately calling
        // get_current_supplier (which would fail before cookies propagate).
        markSessionVerified();
        toast.success(`Welcome back, ${userDetail.supplierName || userDetail.email}`);
        onSuccess(detectedRole);
      } else {
        toast.error("Unexpected response from server.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Failed to connect to server.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
            <Sparkles className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">ProcureX</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to your account</h2>
        <p className="text-sm text-muted-foreground">Enter your credentials to access the portal.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address or Username</Label>
          <Input id="email" type="text" required placeholder="Enter email or username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        New supplier?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-foreground underline-offset-4 hover:underline">
          Create a supplier account
        </button>
      </div>
    </div>
  );
}

function RegisterForm({ onSwitch, onSuccess }: { onSwitch: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/method/procurex.api.signup_stage1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          contact_no: contactNo.trim(),
          password: password,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData._server_messages
          ? JSON.parse(errData._server_messages).map((m: any) => JSON.parse(m).message).join(", ")
          : errData.exception || "Registration failed. Please check credentials.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.message) {
        const supplierStaging = data.message;
        saveSupplier(supplierStaging);
        setSession(supplierStaging.email);
        markSessionVerified();
        toast.success("Stage 1 complete: Account registered!");
        onSuccess();
      } else {
        toast.error("Unexpected response from server.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Failed to connect to server.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
            <Sparkles className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">ProcureX</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create a supplier account</h2>
        <p className="text-sm text-muted-foreground">Register your credentials to start your onboarding process.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
          <Input id="email" type="email" required placeholder="supplier@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactNo">Contact No <span className="text-destructive">*</span></Label>
          <Input id="contactNo" type="text" required placeholder="e.g. +91 9876543210" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
          <Input id="password" type="password" required placeholder="••••••••" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-white">
          {loading ? "Registering credentials..." : "Register Credentials"}
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </button>
      </div>
    </div>
  );
}