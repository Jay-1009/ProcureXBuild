import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { useMemo, useState, useEffect } from "react";
import {
  FileText,
  FilePlus2,
  PenLine,
  Search,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  Clock,
  Download,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  Circle,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createLazyFileRoute("/contracts")({
  component: ContractsPage,
});

type Status = "Draft" | "Under Review" | "Active" | "Amending" | "Expired";
type Risk = "Low" | "Medium" | "High";

type Agreement = {
  id: string;
  name: string;
  template: string;
  value: number;
  status: Status;
  signedCount: number;
  totalSigners: number;
  renewal: string;
  risk: Risk;
  supplier: string;
  effective: string;
  owner: string;
  policies: { name: string; status: "Compliant" | "Review" }[];
  metadata: { label: string; value: string }[];
  signAudit: { label: string; state: "done" | "current" | "pending"; at?: string }[];
  obligations: { title: string; due: string; type: "Renewal" | "Obligation" | "Amendment"; note: string }[];
};

const AGREEMENTS: Agreement[] = [
  {
    id: "AGR-1042",
    name: "MSA — Tata Steel Precision Alloys",
    template: "Master Services Agreement",
    value: 24500000,
    status: "Active",
    signedCount: 3,
    totalSigners: 3,
    renewal: "2026-09-14",
    risk: "Low",
    supplier: "Tata Steel Ltd.",
    effective: "2024-09-15",
    owner: "Priya Nair",
    policies: [
      { name: "Data Protection v3.1", status: "Compliant" },
      { name: "Anti-Bribery & Corruption", status: "Compliant" },
      { name: "ESG Sourcing 2026", status: "Compliant" },
    ],
    metadata: [
      { label: "Contract Type", value: "Framework" },
      { label: "Currency", value: "INR" },
      { label: "Payment Terms", value: "Net 45" },
      { label: "Governing Law", value: "Maharashtra, IN" },
      { label: "Auto Renewal", value: "Yes — 12 months" },
      { label: "Termination Notice", value: "90 days" },
    ],
    signAudit: [
      { label: "Creator signed", state: "done", at: "Sep 12, 2024" },
      { label: "Sent to Supplier", state: "done", at: "Sep 12, 2024" },
      { label: "Supplier viewed", state: "done", at: "Sep 13, 2024" },
      { label: "Supplier signed", state: "done", at: "Sep 14, 2024" },
      { label: "Counter-signature", state: "done", at: "Sep 15, 2024" },
    ],
    obligations: [
      { title: "Quarterly SLA review", due: "2026-08-01", type: "Obligation", note: "OTIF > 96%, defect rate < 0.4%" },
      { title: "Auto-renewal window opens", due: "2026-07-16", type: "Renewal", note: "Send intent-to-renew 60 days prior" },
      { title: "Amendment #2 executed", due: "2025-11-04", type: "Amendment", note: "Added new plant location — Pune" },
    ],
  },
  {
    id: "AGR-1058",
    name: "NDA — Bharat Forge Aerospace Div.",
    template: "Mutual NDA",
    value: 0,
    status: "Under Review",
    signedCount: 1,
    totalSigners: 2,
    renewal: "2027-02-01",
    risk: "Low",
    supplier: "Bharat Forge Ltd.",
    effective: "2026-02-01",
    owner: "Rohit Sharma",
    policies: [
      { name: "Data Protection v3.1", status: "Compliant" },
      { name: "Export Control", status: "Review" },
    ],
    metadata: [
      { label: "Contract Type", value: "NDA" },
      { label: "Term", value: "3 years" },
      { label: "Governing Law", value: "Karnataka, IN" },
      { label: "Confidential Scope", value: "Aerospace forgings roadmap" },
    ],
    signAudit: [
      { label: "Creator signed", state: "done", at: "Jul 10, 2026" },
      { label: "Sent to Supplier", state: "done", at: "Jul 10, 2026" },
      { label: "Supplier viewed", state: "current", at: "Jul 12, 2026" },
      { label: "Awaiting supplier signature", state: "pending" },
    ],
    obligations: [
      { title: "Counter-signature review", due: "2026-07-18", type: "Obligation", note: "Legal to review Clause 7.2" },
    ],
  },
  {
    id: "AGR-1071",
    name: "SOW — Siemens PLM Rollout Phase-2",
    template: "Statement of Work",
    value: 8900000,
    status: "Amending",
    signedCount: 2,
    totalSigners: 4,
    renewal: "2026-08-30",
    risk: "Medium",
    supplier: "Siemens Industry Software",
    effective: "2025-04-01",
    owner: "Anita Deshmukh",
    policies: [
      { name: "Data Protection v3.1", status: "Compliant" },
      { name: "Change Management", status: "Review" },
    ],
    metadata: [
      { label: "Contract Type", value: "SOW" },
      { label: "Currency", value: "USD" },
      { label: "Payment Terms", value: "Net 30" },
      { label: "Milestones", value: "6 (2 remaining)" },
    ],
    signAudit: [
      { label: "Creator signed", state: "done", at: "Jul 08, 2026" },
      { label: "Sent to Supplier", state: "done", at: "Jul 08, 2026" },
      { label: "Supplier viewed", state: "done", at: "Jul 09, 2026" },
      { label: "Awaiting supplier signature", state: "current" },
      { label: "Sponsor counter-sign", state: "pending" },
    ],
    obligations: [
      { title: "Amendment #3 — scope change", due: "2026-07-22", type: "Amendment", note: "Add module: Advanced Planner" },
      { title: "Milestone 5 acceptance", due: "2026-08-15", type: "Obligation", note: "UAT sign-off by IT" },
    ],
  },
  {
    id: "AGR-1090",
    name: "Supply Agreement — Reliance Polymers",
    template: "Supply Agreement",
    value: 15600000,
    status: "Draft",
    signedCount: 0,
    totalSigners: 3,
    renewal: "2027-07-01",
    risk: "High",
    supplier: "Reliance Industries",
    effective: "2026-08-01",
    owner: "Karan Mehta",
    policies: [
      { name: "ESG Sourcing 2026", status: "Review" },
      { name: "Anti-Bribery & Corruption", status: "Compliant" },
    ],
    metadata: [
      { label: "Contract Type", value: "Supply" },
      { label: "Currency", value: "INR" },
      { label: "Volume Commit", value: "1,200 MT / year" },
      { label: "Price Adjustment", value: "Indexed — quarterly" },
    ],
    signAudit: [
      { label: "Draft created", state: "current", at: "Jul 14, 2026" },
      { label: "Internal review", state: "pending" },
      { label: "Send to supplier", state: "pending" },
    ],
    obligations: [
      { title: "Legal red-line review", due: "2026-07-20", type: "Obligation", note: "Focus on force-majeure clause" },
    ],
  },
  {
    id: "AGR-1102",
    name: "MSA — Wipro Managed IT Services",
    template: "Master Services Agreement",
    value: 42000000,
    status: "Active",
    signedCount: 4,
    totalSigners: 4,
    renewal: "2026-08-30",
    risk: "Medium",
    supplier: "Wipro Ltd.",
    effective: "2023-09-01",
    owner: "Priya Nair",
    policies: [
      { name: "Data Protection v3.1", status: "Compliant" },
      { name: "Security & Access Controls", status: "Compliant" },
    ],
    metadata: [
      { label: "Contract Type", value: "Framework" },
      { label: "Currency", value: "INR" },
      { label: "Payment Terms", value: "Net 60" },
      { label: "SLA Tier", value: "Platinum" },
    ],
    signAudit: [
      { label: "Creator signed", state: "done", at: "Aug 22, 2023" },
      { label: "Supplier signed", state: "done", at: "Aug 28, 2023" },
      { label: "Counter-signed", state: "done", at: "Aug 30, 2023" },
    ],
    obligations: [
      { title: "Renewal decision", due: "2026-07-31", type: "Renewal", note: "Renew, renegotiate or exit" },
      { title: "Annual security audit", due: "2026-09-10", type: "Obligation", note: "ISO 27001 attestation" },
    ],
  },
];

function inr(n: number) {
  if (n === 0) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function daysUntil(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d;
}

const STATUS_STYLES: Record<Status, string> = {
  Draft: "bg-muted text-muted-foreground border-border",
  "Under Review": "bg-warning/10 text-warning border-warning/30",
  Active: "bg-success/10 text-success border-success/30",
  Amending: "bg-info/10 text-info border-info/30",
  Expired: "bg-destructive/10 text-destructive border-destructive/30",
};

const RISK_STYLES: Record<Risk, string> = {
  Low: "bg-success/10 text-success",
  Medium: "bg-warning/10 text-warning",
  High: "bg-destructive/10 text-destructive",
};

function ContractsPage() {
  useEffect(() => {
    document.title = "Contract Lifecycle — ProcureX";
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(AGREEMENTS[0].id);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);

  const selected = AGREEMENTS.find((a) => a.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    return AGREEMENTS.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (templateFilter !== "all" && a.template !== templateFilter) return false;
      if (riskFilter !== "all" && a.risk !== riskFilter) return false;
      if (search && !(`${a.name} ${a.id} ${a.supplier}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [statusFilter, templateFilter, riskFilter, search]);

  const metrics = useMemo(() => {
    const pipeline = AGREEMENTS.filter((a) => a.signedCount < a.totalSigners).length;
    const renewals = AGREEMENTS.filter((a) => {
      const d = daysUntil(a.renewal);
      return d >= 0 && d <= 60;
    }).length;
    const totalValue = AGREEMENTS.reduce((s, a) => s + a.value, 0);
    const compliantPolicies = AGREEMENTS.reduce(
      (s, a) => s + a.policies.filter((p) => p.status === "Compliant").length,
      0,
    );
    const totalPolicies = AGREEMENTS.reduce((s, a) => s + a.policies.length, 0);
    const compliancePct = Math.round((compliantPolicies / totalPolicies) * 100);
    return { pipeline, renewals, totalValue, compliancePct };
  }, []);

  return (
    <AppShell title="Contract Lifecycle" breadcrumb="Contracts">
      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <PageHeader
            title="Contract Lifecycle & Compliance"
            description="Draft, execute and govern agreements with real-time signature tracking, obligations and policy compliance."
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agreement, supplier, ID…"
                className="h-9 w-72 rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setDraftOpen(true)}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Create Draft from Template
            </Button>
            <Button size="sm" onClick={() => setSignOpen(true)}>
              <PenLine className="mr-1.5 h-4 w-4" /> Initiate Signature Request
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Clock className="h-4 w-4" />}
            label="Signature Pipeline"
            value={String(metrics.pipeline)}
            hint="Agreements pending execution"
            tone="info"
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Upcoming Renewals"
            value={String(metrics.renewals)}
            hint="Expiring in < 60 days"
            tone="warning"
            badge="Attention"
          />
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Total Contract Value"
            value={inr(metrics.totalValue)}
            hint="Aggregated financial exposure"
            tone="default"
          />
          <MetricCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Policy Compliance"
            value={`${metrics.compliancePct}%`}
            hint="Adherence to active policies"
            tone="success"
            meter={metrics.compliancePct}
          />
        </div>

        {/* Split layout */}
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          {/* Main workspace */}
          <section className="rounded-xl border border-border bg-card">
            <Tabs defaultValue="active" className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <TabsList>
                  <TabsTrigger value="active">Active Agreements</TabsTrigger>
                  <TabsTrigger value="lifecycle">Lifecycle & Obligations</TabsTrigger>
                </TabsList>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Amending">Amending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All templates</SelectItem>
                      <SelectItem value="Master Services Agreement">MSA</SelectItem>
                      <SelectItem value="Mutual NDA">NDA</SelectItem>
                      <SelectItem value="Statement of Work">SOW</SelectItem>
                      <SelectItem value="Supply Agreement">Supply</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All risks</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="active" className="m-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Agreement</th>
                        <th className="px-4 py-2.5 text-left font-medium">Template</th>
                        <th className="px-4 py-2.5 text-right font-medium">Value</th>
                        <th className="px-4 py-2.5 text-left font-medium">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium">Signatures</th>
                        <th className="px-4 py-2.5 text-left font-medium">Renewal</th>
                        <th className="px-4 py-2.5 text-left font-medium">Risk</th>
                        <th className="px-4 py-2.5 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => {
                        const isSelected = a.id === selectedId;
                        const days = daysUntil(a.renewal);
                        return (
                          <tr
                            key={a.id}
                            onClick={() => setSelectedId(a.id)}
                            className={`cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${
                              isSelected ? "bg-muted/60" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{a.name}</div>
                              <div className="text-xs text-muted-foreground">{a.id} · {a.supplier}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{a.template}</td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">{inr(a.value)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[a.status]}`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Progress value={(a.signedCount / a.totalSigners) * 100} className="h-1.5 w-20" />
                                <span className="text-xs text-muted-foreground">{a.signedCount}/{a.totalSigners} Signed</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-foreground">{new Date(a.renewal).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                              <div className={`text-xs ${days <= 60 && days >= 0 ? "text-warning" : "text-muted-foreground"}`}>
                                {days >= 0 ? `in ${days} days` : `${Math.abs(days)} days ago`}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${RISK_STYLES[a.risk]}`}>
                                {a.risk}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            No agreements match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="lifecycle" className="m-0 p-4">
                <LifecycleTimeline agreements={filtered} onSelect={setSelectedId} />
              </TabsContent>
            </Tabs>
          </section>

          {/* Contextual sidebar */}
          <aside className="rounded-xl border border-border bg-card">
            {selected ? (
              <Agreement360 agreement={selected} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-6 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">Agreement 360</p>
                <p className="mt-1 text-xs text-muted-foreground">Select an agreement to see metadata, e-signature audit trail and linked policies.</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      <CreateDraftDialog open={draftOpen} onOpenChange={setDraftOpen} />
      <SignatureRequestDialog open={signOpen} onOpenChange={setSignOpen} />
    </AppShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
  badge,
  meter,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "default" | "info" | "warning" | "success";
  badge?: string;
  meter?: number;
}) {
  const toneMap = {
    default: "bg-muted text-foreground",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  } as const;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${toneMap[tone]}`}>{icon}</div>
        {badge && (
          <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      {typeof meter === "number" && <Progress value={meter} className="mt-3 h-1.5" />}
    </div>
  );
}

function LifecycleTimeline({ agreements, onSelect }: { agreements: Agreement[]; onSelect: (id: string) => void }) {
  const events = agreements.flatMap((a) =>
    a.obligations.map((o) => ({ ...o, agreement: a })),
  );
  events.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  const iconFor = (t: string) =>
    t === "Renewal" ? <Clock className="h-3.5 w-3.5 text-warning" /> :
    t === "Amendment" ? <PenLine className="h-3.5 w-3.5 text-info" /> :
    <CheckCircle2 className="h-3.5 w-3.5 text-success" />;

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
      <ul className="space-y-3">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <div className="absolute -left-4 top-2 grid h-5 w-5 place-items-center rounded-full border border-border bg-background">
              {iconFor(e.type)}
            </div>
            <button
              onClick={() => onSelect(e.agreement.id)}
              className="w-full rounded-lg border border-border bg-surface-panel/40 p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  e.type === "Renewal" ? "bg-warning/10 text-warning" :
                  e.type === "Amendment" ? "bg-info/10 text-info" : "bg-success/10 text-success"
                }`}>{e.type}</span>
                <span className="text-sm font-medium text-foreground">{e.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(e.due).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {e.agreement.name} · {e.note}
              </div>
            </button>
          </li>
        ))}
        {events.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">No lifecycle events for this selection.</li>
        )}
      </ul>
    </div>
  );
}

function Agreement360({ agreement, onClose }: { agreement: Agreement; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-info" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-info">Agreement 360</span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">{agreement.name}</div>
          <div className="text-xs text-muted-foreground">{agreement.id} · Owner: {agreement.owner}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Metadata */}
        <section>
          <SectionHeader index="I" title="Dynamic Metadata" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {agreement.metadata.map((m) => (
              <div key={m.label} className="rounded-md border border-border bg-surface-panel/40 p-2">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="mt-0.5 truncate text-xs font-medium text-foreground">{m.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* E-Signature audit */}
        <section>
          <SectionHeader index="II" title="E-Signature Audit Trail" />
          <ol className="mt-2 space-y-2">
            {agreement.signAudit.map((s, i) => {
              const Icon = s.state === "done" ? CheckCircle2 : s.state === "current" ? CircleDot : Circle;
              const color = s.state === "done" ? "text-success" : s.state === "current" ? "text-info" : "text-muted-foreground";
              return (
                <li key={i} className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground">{s.label}</div>
                    {s.at && <div className="text-[11px] text-muted-foreground">{s.at}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Linked policies */}
        <section>
          <SectionHeader index="III" title="Linked Policies" />
          <ul className="mt-2 space-y-1.5">
            {agreement.policies.map((p) => (
              <li key={p.name} className="flex items-center justify-between rounded-md border border-border bg-surface-panel/40 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{p.name}</span>
                </div>
                <Badge variant="outline" className={p.status === "Compliant" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}>
                  {p.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <button className="group flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-surface-panel/30 p-3 text-left hover:bg-muted/40">
          <div>
            <div className="text-xs font-semibold text-foreground">Open full agreement view</div>
            <div className="text-[11px] text-muted-foreground">Clauses, amendments, versions, workflow</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-5 w-5 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">{index}</span>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
    </div>
  );
}

function CreateDraftDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Draft from Template</DialogTitle>
          <DialogDescription>Instantiate a new agreement from an approved Agreement Template.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Agreement Template</Label>
            <Select defaultValue="msa">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="msa">Master Services Agreement</SelectItem>
                <SelectItem value="nda">Mutual NDA</SelectItem>
                <SelectItem value="sow">Statement of Work</SelectItem>
                <SelectItem value="supply">Supply Agreement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Agreement Name</Label>
            <Input placeholder="e.g. MSA — Vendor X" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Counterparty</Label>
              <Input placeholder="Supplier / vendor" />
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input type="date" />
            </div>
          </div>
          <div className="rounded-md border border-info/30 bg-info/10 p-2.5 text-[11px] text-info">
            Frappe: creates a new record in <span className="font-mono">Agreement</span> pre-populated from the selected <span className="font-mono">Agreement Template</span> and its <span className="font-mono">Agreement Fields</span>.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Create Draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignatureRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Initiate Signature Request</DialogTitle>
          <DialogDescription>Send an executable agreement for e-signature.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Agreement</Label>
            <Select defaultValue={AGREEMENTS[0].id}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGREEMENTS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Signers (comma-separated emails)</Label>
            <Input placeholder="signer1@company.com, signer2@vendor.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Signing Order</Label>
              <Select defaultValue="sequential">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="parallel">Parallel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expires In</Label>
              <Select defaultValue="14">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border border-info/30 bg-info/10 p-2.5 text-[11px] text-info">
            Frappe: creates <span className="font-mono">Agreement Signature Transaction</span> with linked <span className="font-mono">Agreement Signatures</span> and status <span className="font-mono">Pending</span>.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Send for Signature</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}