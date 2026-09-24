import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Upload,
  FileCheck2,
  FileWarning,
  ChevronRight,
  ChevronLeft,
  Check,
  CircleAlert,
  Clock,
  ShieldCheck,
  FileText,
  Plus,
  X,
  Pencil,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  findSupplier,
  getSession,
  saveSupplier,
  type Supplier,
} from "@/lib/auth-store";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/supplier-portal/")({
  component: SupplierPortalPage,
});

type DocStatus = "Submitted" | "Under Review" | "Approved" | "Rejected";
type DocRecord = {
  id: string;
  type: string;
  fileName: string;
  issueDate: string;
  expiryDate: string;
  status: DocStatus;
  reason?: string;
};

const DEMO_DOCS: DocRecord[] = [
  {
    id: "d1",
    type: "Business License",
    fileName: "biz-license-2026.pdf",
    issueDate: "2024-01-15",
    expiryDate: "2027-01-14",
    status: "Approved",
  },
  {
    id: "d2",
    type: "GST Certificate",
    fileName: "gst-cert.pdf",
    issueDate: "2023-04-01",
    expiryDate: "2026-08-20",
    status: "Under Review",
  },
  {
    id: "d3",
    type: "ISO 9001",
    fileName: "iso-9001.pdf",
    issueDate: "2022-06-10",
    expiryDate: "2026-07-30",
    status: "Submitted",
  },
  {
    id: "d4",
    type: "Bank Reference",
    fileName: "bank-ref.pdf",
    issueDate: "2025-11-02",
    expiryDate: "2026-11-02",
    status: "Rejected",
    reason: "Scan is unclear — please re-upload a higher-resolution copy.",
  },
];

function SupplierPortalPage() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [docs, setDocs] = useState<DocRecord[]>(DEMO_DOCS);

  useEffect(() => {
    document.title = "Supplier Portal — ProcureX";
    const email = getSession();
    if (!email) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    setSupplier(findSupplier(email) ?? null);
  }, [navigate]);

  const completion = useMemo(() => computeCompletion(supplier), [supplier]);

  if (!supplier) {
    return <AppShell title="Supplier Portal"><div className="p-6" /></AppShell>;
  }

  return (
    <AppShell title="Supplier Portal" breadcrumb="Supplier Portal">
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
        <PageHeader
          title={`Welcome back, ${supplier.supplierName?.split(" ")[0] || "Supplier"}`}
          description="Manage your profile, upload compliance documents and track qualification status — synced with Frappe / ERPNext."
          action={
            <NewOnboardingDialog />
          }
        />

        {/* Overview widgets */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProfileProgressCard completion={completion} supplier={supplier} onUpdate={(s) => { saveOverwrite(s); setSupplier(s); }} />
          <QualificationCard />
          <DocExpiryCard docs={docs} />
        </div>

        {/* Documents */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Documents</h2>
              <p className="text-xs text-muted-foreground">
                Upload certificates. Files sync to Frappe File Manager and enter the approval workflow.
              </p>
            </div>
            <UploadDocDialog onAdd={(d) => setDocs((prev) => [d, ...prev])} />
          </div>
          <DocsTable docs={docs} />
        </div>

        {/* Workflow tracker */}
        <div className="mt-8">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">Approval workflow</h2>
            <p className="text-xs text-muted-foreground">Real-time status of your onboarding submission.</p>
          </div>
          <WorkflowTracker />
        </div>
      </main>
    </AppShell>
  );
}

function saveOverwrite(s: Supplier) {
  // overwrite-in-place using saveSupplier as append + filter dedupe
  const raw = JSON.parse(localStorage.getItem("procurex.suppliers") ?? "[]") as Supplier[];
  const next = raw.filter((x) => x.email.toLowerCase() !== s.email.toLowerCase());
  next.push(s);
  localStorage.setItem("procurex.suppliers", JSON.stringify(next));
}

function computeCompletion(s: Supplier | null): number {
  if (!s) return 0;
  const fields: (keyof Supplier)[] = [
    "supplierName", "supplierType", "pan", "gstNo", "addressLine1", "city", "state", "country", "postalCode", "email", "contactNo",
  ];
  const filled = fields.filter((f) => Boolean((s[f] as string)?.toString().trim())).length;
  return Math.round((filled / fields.length) * 100);
}

/* ---------- widgets ---------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.02)] ${className}`}>
      {children}
    </div>
  );
}

function ProfileProgressCard({
  completion,
  supplier,
  onUpdate,
}: {
  completion: number;
  supplier: Supplier;
  onUpdate: (s: Supplier) => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Profile Completion
        </div>
        <span className="text-[11px] text-muted-foreground">{completion === 100 ? "Complete" : "In progress"}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{completion}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${completion}%` }}
        />
      </div>
      <div className="mt-4">
        <EditProfileDialog supplier={supplier} onSave={onUpdate} />
      </div>
    </Card>
  );
}

function QualificationCard() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Qualification Status
        </div>
        <ShieldCheck className="h-4 w-4 text-success" />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">Under Review</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">2 of 4 steps approved — expected decision in 3 business days.</p>
      <div className="mt-3 grid grid-cols-4 gap-1">
        <span className="h-1.5 rounded-full bg-success" />
        <span className="h-1.5 rounded-full bg-success" />
        <span className="h-1.5 rounded-full bg-warning" />
        <span className="h-1.5 rounded-full bg-muted" />
      </div>
    </Card>
  );
}

function DocExpiryCard({ docs }: { docs: DocRecord[] }) {
  const now = new Date();
  const soon = docs
    .map((d) => ({ ...d, daysLeft: Math.ceil((new Date(d.expiryDate).getTime() - now.getTime()) / 86400000) }))
    .filter((d) => d.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Document Expiration
        </div>
        <FileWarning className="h-4 w-4 text-warning" />
      </div>
      <div className="mt-3 space-y-2">
        {soon.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents expiring soon.</p>
        )}
        {soon.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{d.type}</div>
              <div className="text-[11px] text-muted-foreground">Expires {d.expiryDate}</div>
            </div>
            <span className={`text-[11px] font-semibold ${d.daysLeft < 30 ? "text-destructive" : "text-warning"}`}>
              {d.daysLeft}d
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- documents table ---------- */

function DocStatusBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, { cls: string; icon: typeof Check }> = {
    Approved: { cls: "bg-success/10 text-success ring-success/20", icon: FileCheck2 },
    "Under Review": { cls: "bg-warning/15 text-warning-foreground/80 ring-warning/30", icon: Clock },
    Submitted: { cls: "bg-info/10 text-info ring-info/20", icon: FileText },
    Rejected: { cls: "bg-destructive/10 text-destructive ring-destructive/20", icon: CircleAlert },
  };
  const { cls, icon: Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function DocsTable({ docs }: { docs: DocRecord[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-panel text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">Document</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Issued</th>
              <th className="px-4 py-2.5">Expires</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{d.fileName}</span>
                  </div>
                  {d.status === "Rejected" && d.reason && (
                    <div className="mt-1 text-xs text-destructive">Reason: {d.reason}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d.type}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{d.issueDate}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{d.expiryDate}</td>
                <td className="px-4 py-3"><DocStatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UploadDocDialog({ onAdd }: { onAdd: (d: DocRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "", fileName: "", issueDate: "", expiryDate: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.fileName) return;
    onAdd({
      id: Math.random().toString(36).slice(2),
      type: form.type,
      fileName: form.fileName,
      issueDate: form.issueDate,
      expiryDate: form.expiryDate,
      status: "Submitted",
    });
    toast.success("Document submitted for review");
    setOpen(false);
    setForm({ type: "", fileName: "", issueDate: "", expiryDate: "" });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Upload className="h-4 w-4" /> Upload document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Input required placeholder="Business License, ISO 9001, GST..." value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>File</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center hover:bg-muted/40">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {form.fileName || "Click to select a file"}
              </span>
              <span className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setForm((prev) => ({ ...prev, fileName: f.name }));
                }}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- workflow tracker ---------- */

function WorkflowTracker() {
  const steps: { label: string; status: "done" | "active" | "todo" }[] = [
    { label: "Registration Submitted", status: "done" },
    { label: "Documents Received", status: "done" },
    { label: "Under Review", status: "active" },
    { label: "Approval", status: "todo" },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-3">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${s.status === "done"
                  ? "bg-success text-white"
                  : s.status === "active"
                    ? "bg-warning text-white"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              {s.status === "done" ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground capitalize">{s.status === "todo" ? "pending" : s.status}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- edit profile ---------- */

function EditProfileDialog({
  supplier,
  onSave,
}: {
  supplier: Supplier;
  onSave: (s: Supplier) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(supplier);
  useEffect(() => setForm(supplier), [supplier]);
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit supplier profile</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(form); toast.success("Profile updated"); setOpen(false); }}
          className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1"
        >
          <FormField label="Supplier Name"><Input value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} /></FormField>
          <FormField label="Supplier Type"><Input value={form.supplierType} onChange={(e) => set("supplierType", e.target.value)} /></FormField>
          <FormField label="PAN"><Input value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} /></FormField>
          <FormField label="GST No"><Input value={form.gstNo} onChange={(e) => set("gstNo", e.target.value.toUpperCase())} /></FormField>
          <div className="col-span-2 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5">
            <Checkbox id="msme-edit" checked={form.isMsme} onCheckedChange={(v) => set("isMsme", Boolean(v))} />
            <Label htmlFor="msme-edit" className="text-sm font-normal cursor-pointer">Is MSME Registered</Label>
          </div>
          <FormField label="Address Line 1" span={2}><Input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></FormField>
          <FormField label="Address Line 2" span={2}><Input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></FormField>
          <FormField label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></FormField>
          <FormField label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></FormField>
          <FormField label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></FormField>
          <FormField label="Postal Code"><Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></FormField>
          <FormField label="Email"><Input type="email" value={form.email} readOnly className="opacity-60" /></FormField>
          <FormField label="Contact No"><Input value={form.contactNo} onChange={(e) => set("contactNo", e.target.value)} /></FormField>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, span, children }: { label: string; span?: 1 | 2; children: React.ReactNode }) {
  return (
    <div className={span === 2 ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ---------- multi-step new onboarding ---------- */

function NewOnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Supplier>({
    supplierName: "",
    supplierType: "",
    pan: "",
    gstNo: "",
    isMsme: false,
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    email: "",
    contactNo: "",
    password: "temp-onboard",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.supplierName) e.supplierName = "Required";
      if (!form.supplierType) e.supplierType = "Required";
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) e.pan = "Invalid PAN format (AAAAA9999A)";
      if (form.gstNo && form.gstNo.length !== 15) e.gstNo = "GST must be 15 characters";
    }
    if (step === 1) {
      if (!form.addressLine1) e.addressLine1 = "Required";
      if (!form.city) e.city = "Required";
      if (!form.state) e.state = "Required";
      if (!form.country) e.country = "Required";
      if (!form.postalCode) e.postalCode = "Required";
    }
    if (step === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
      if (!form.contactNo) e.contactNo = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 3)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = () => {
    if (!validateStep()) return;
    if (findSupplier(form.email)) {
      toast.error("A supplier with this email already exists.");
      return;
    }
    saveSupplier(form);
    toast.success("Supplier registered — under review");
    setOpen(false);
    setStep(0);
  };

  const steps = ["Organization", "Address", "Contact", "Review"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-1.5"><Plus className="h-4 w-4" /> New Supplier</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-info" />
            Register a new supplier
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${i < step ? "bg-success text-white" : i === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <StepField label="Supplier Name" error={errors.supplierName}><Input value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} /></StepField>
              <StepField label="Supplier Type" error={errors.supplierType}><Input placeholder="Manufacturer, Trader..." value={form.supplierType} onChange={(e) => set("supplierType", e.target.value)} /></StepField>
              <StepField label="PAN" error={errors.pan}><Input maxLength={10} value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} /></StepField>
              <StepField label="GST No" error={errors.gstNo}><Input maxLength={15} value={form.gstNo} onChange={(e) => set("gstNo", e.target.value.toUpperCase())} /></StepField>
              <div className="col-span-2 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5">
                <Checkbox id="msme-new" checked={form.isMsme} onCheckedChange={(v) => set("isMsme", Boolean(v))} />
                <Label htmlFor="msme-new" className="text-sm font-normal cursor-pointer">Is MSME Registered</Label>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <StepField label="Address Line 1" span={2} error={errors.addressLine1}><Input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></StepField>
              <StepField label="Address Line 2" span={2}><Input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></StepField>
              <StepField label="City" error={errors.city}><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></StepField>
              <StepField label="State" error={errors.state}><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></StepField>
              <StepField label="Country" error={errors.country}><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></StepField>
              <StepField label="Postal Code" error={errors.postalCode}><Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></StepField>
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              <StepField label="Email Address" error={errors.email}><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></StepField>
              <StepField label="Contact No" error={errors.contactNo}><Input value={form.contactNo} onChange={(e) => set("contactNo", e.target.value)} /></StepField>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <ReviewRow k="Supplier Name" v={form.supplierName} />
              <ReviewRow k="Supplier Type" v={form.supplierType} />
              <ReviewRow k="PAN" v={form.pan} />
              <ReviewRow k="GST No" v={form.gstNo || "—"} />
              <ReviewRow k="MSME" v={form.isMsme ? "Yes" : "No"} />
              <ReviewRow k="Address" v={[form.addressLine1, form.addressLine2, form.city, form.state, form.country, form.postalCode].filter(Boolean).join(", ")} />
              <ReviewRow k="Email" v={form.email} />
              <ReviewRow k="Contact" v={form.contactNo} />
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={back} disabled={step === 0} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={next} className="gap-1.5">Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} className="gap-1.5">Submit registration <Check className="h-4 w-4" /></Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepField({ label, error, span, children }: { label: string; error?: string; span?: 1 | 2; children: React.ReactNode }) {
  return (
    <div className={span === 2 ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v || "—"}</span>
    </div>
  );
}