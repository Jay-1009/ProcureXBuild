import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  Download,
  Star,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Package,
  TrendingUp,
  Award,
  Users,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createLazyFileRoute("/avl")({
  component: ApprovedSupplierList,
});

// ─── Data Types ───────────────────────────────────────────────────────────────

type SupplierStatus = "Approved" | "Conditional" | "Suspended" | "Under Review";
type SupplierTier = "Critical" | "Important" | "Useful";
type ComplianceStatus = "Compliant" | "Non-Compliant" | "Pending";

type SupplierData = {
  id: string;
  name: string;
  category: string; // Maps to supplier_group
  location: string;
  status: SupplierStatus;
  tier: SupplierTier;
  rating: number;
  onTimeDelivery: number;
  qualityScore: number;
  costIndex: number;
  activePos: number;
  totalSpend: number;
  lastAuditDate: string;
  complianceStatus: ComplianceStatus;
  certifications: string[];
  contactPerson: string;
  contactEmail: string;
  tenC: {
    competency: number;
    capacity: number;
    qualityCommitment: number;
    consistency: number;
    cost: number;
    cash: number;
    communication: number;
    controlOfProcesses: number;
    csr: number;
    culture: number;
  };
};

type SupplierGroupSummary = {
  name: string; // Supplier group name
  approvedCount: number;
  conditionalCount: number;
  suspendedCount: number;
  totalSpend: number;
};

type AVLKpis = {
  approved: number;
  conditional: number;
  suspended: number;
  underReview: number;
  totalSpend: number;
  avgOnTime: number;
  avgQuality: number;
  compliant: number;
  total: number;
};

type AVLAlert = {
  type: "error" | "warning" | "info" | "neutral" | "success";
  supplier: string | null;
  message: string;
};

// ─── API helper (same pattern as PO / Quotations pages) ──────────────────────

async function frappePost<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/method/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data as { message: T }).message;
}

// ─── Custom Progress ──────────────────────────────────────────────────────────

function CustomProgress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-muted/60", className)}>
      <div
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.min(Math.max(value, 0), 100)}%)` }}
      />
    </div>
  );
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const TEN_C_LABELS: { key: keyof SupplierData["tenC"]; label: string }[] = [
  { key: "competency", label: "Competency" },
  { key: "capacity", label: "Capacity" },
  { key: "qualityCommitment", label: "Quality" },
  { key: "consistency", label: "Consistency" },
  { key: "cost", label: "Cost" },
  { key: "cash", label: "Cash" },
  { key: "communication", label: "Communication" },
  { key: "controlOfProcesses", label: "Control" },
  { key: "csr", label: "CSR" },
  { key: "culture", label: "Culture" },
];

// ─── Status & Tier Helpers ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SupplierStatus }) {
  const map: Record<SupplierStatus, { cls: string; icon: React.ReactNode }> = {
    Approved: {
      cls: "border-success/20 bg-success/10 text-success",
      icon: <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" />,
    },
    Conditional: {
      cls: "border-warning/20 bg-warning/10 text-warning",
      icon: <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />,
    },
    Suspended: {
      cls: "border-destructive/20 bg-destructive/10 text-destructive",
      icon: <XCircle className="h-2.5 w-2.5 inline mr-0.5" />,
    },
    "Under Review": {
      cls: "border-primary/20 bg-primary/10 text-primary",
      icon: <Clock className="h-2.5 w-2.5 inline mr-0.5" />,
    },
  };
  const { cls, icon } = map[status];
  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold", cls)}>
      {icon}
      {status}
    </Badge>
  );
}

function TierBadge({ tier }: { tier: SupplierTier }) {
  const map: Record<SupplierTier, string> = {
    Critical: "border-destructive/30 bg-destructive/10 text-destructive",
    Important: "border-warning/30 bg-warning/10 text-warning",
    Useful: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold", map[tier])}>
      {tier}
    </Badge>
  );
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const map: Record<ComplianceStatus, string> = {
    Compliant: "border-success/20 bg-success/10 text-success",
    "Non-Compliant": "border-destructive/20 bg-destructive/10 text-destructive",
    Pending: "border-warning/20 bg-warning/10 text-warning",
  };
  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold", map[status])}>
      {status}
    </Badge>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-2.5 w-2.5",
            s <= value ? "fill-warning text-warning" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="p-4 pb-2">
            <div className="h-2.5 w-24 rounded bg-muted" />
            <div className="mt-2 h-7 w-16 rounded bg-muted" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-2 w-32 rounded bg-muted/60" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          {[...Array(10)].map((__, j) => (
            <td key={j} className="p-3">
              <div className="h-3 rounded bg-muted" style={{ width: `${40 + (j * 13) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ApprovedSupplierList() {
  useEffect(() => {
    document.title = "Approved Supplier List — ProcureX";
  }, []);

  // ─── State ───────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [supplierGroupSummaries, setSupplierGroupSummaries] = useState<SupplierGroupSummary[]>([]);
  const [kpis, setKpis] = useState<AVLKpis | null>(null);
  const [alerts, setAlerts] = useState<AVLAlert[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "all">("all");
  const [supplierGroupFilter, setSupplierGroupFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<SupplierTier | "all">("all");
  const [sortCol, setSortCol] = useState<keyof SupplierData | null>("totalSpend");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [selectedSupplierForRadar, setSelectedSupplierForRadar] = useState<string>("");

  // Add Supplier Form State
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierGroup, setNewSupplierGroup] = useState("");
  const [newSupplierType, setNewSupplierType] = useState<"Company" | "Individual">("Company");
  const [newSupplierStatus, setNewSupplierStatus] = useState<SupplierStatus>("Under Review");
  const [newSupplierTier, setNewSupplierTier] = useState<SupplierTier>("Useful");
  const [newSupplierCompliance, setNewSupplierCompliance] = useState<ComplianceStatus>("Pending");
  const [newSupplierLastAudit, setNewSupplierLastAudit] = useState("");

  // ─── Fetch from Frappe ───────────────────────────────────────────────────
  const loadAVL = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await frappePost<{
        vendors: SupplierData[];
        category_summaries: SupplierGroupSummary[];
        kpis: AVLKpis;
        alerts: AVLAlert[];
        categories: string[];
      }>("procurex.api.get_avl_data");

      setSuppliers(data.vendors ?? []);
      setSupplierGroupSummaries(data.category_summaries ?? []);
      setKpis(data.kpis ?? null);
      setAlerts(data.alerts ?? []);
      setSupplierGroups(data.categories ?? []);

      // Default radar to first standard supplier
      if (data.vendors?.length && !selectedSupplierForRadar) {
        const firstStandard = data.vendors.find(v => v.status === "Approved" || v.status === "Conditional" || v.status === "Suspended");
        if (firstStandard) {
          setSelectedSupplierForRadar(firstStandard.id);
        } else {
          setSelectedSupplierForRadar(data.vendors[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load AVL data:", err);
      setError("Failed to load supplier data. Please refresh.");
      toast.error("Could not load AVL data", {
        description: "Check your connection or try refreshing.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSupplierForRadar]);

  // Update selectedSupplierForRadar when supplierGroupFilter changes, to select the first supplier in the filtered group
  useEffect(() => {
    if (suppliers.length > 0) {
      const filteredForGroup = suppliers.filter((v) => {
        const matchesGroup = supplierGroupFilter === "all" || v.category === supplierGroupFilter;
        return matchesGroup && (v.status === "Approved" || v.status === "Conditional" || v.status === "Suspended");
      });
      if (filteredForGroup.length > 0) {
        const isStillValid = filteredForGroup.some((v) => v.id === selectedSupplierForRadar);
        if (!isStillValid) {
          setSelectedSupplierForRadar(filteredForGroup[0].id);
        }
      } else {
        setSelectedSupplierForRadar("");
      }
    }
  }, [supplierGroupFilter, suppliers]);

  useEffect(() => {
    loadAVL();
  }, []);

  // ─── Filtered & Sorted Supplier List ──────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") result = result.filter((v) => v.status === statusFilter);
    if (supplierGroupFilter !== "all") result = result.filter((v) => v.category === supplierGroupFilter);
    if (tierFilter !== "all") result = result.filter((v) => v.tier === tierFilter);

    if (sortCol) {
      result.sort((a, b) => {
        const valA = a[sortCol as keyof SupplierData];
        const valB = b[sortCol as keyof SupplierData];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        if (typeof valA === "string" && typeof valB === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return result;
  }, [suppliers, searchQuery, statusFilter, supplierGroupFilter, tierFilter, sortCol, sortAsc]);

  const handleSort = (col: keyof SupplierData) => {
    if (sortCol === col) setSortAsc((p) => !p);
    else { setSortCol(col); setSortAsc(true); }
  };

  const handleExport = async () => {
    try {
      toast.info("Preparing export…");
      const data = await frappePost<{ csv: string }>("procurex.api.export_avl_csv");
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "avl_export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleAddSupplierClick = () => {
    if (supplierGroups.length > 0 && !newSupplierGroup) {
      setNewSupplierGroup(supplierGroups[0]);
    }
    setIsAddSupplierOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      toast.error("Supplier Name is required");
      return;
    }
    if (!newSupplierGroup.trim()) {
      toast.error("Supplier Group is required");
      return;
    }
    setSavingSupplier(true);
    try {
      // 1. Check if Supplier exists in ERPNext
      let supplierKey = "";
      const existingSupplierName = await frappePost<string | null>("frappe.client.get_value", {
        doctype: "Supplier",
        filters: { supplier_name: newSupplierName.trim() },
        fieldname: "name"
      });

      if (existingSupplierName) {
        supplierKey = existingSupplierName;
      } else {
        // Create new Supplier master
        const newSupplier = await frappePost<{ name: string }>("frappe.client.insert", {
          doc: {
            doctype: "Supplier",
            supplier_name: newSupplierName.trim(),
            supplier_group: newSupplierGroup,
            supplier_type: newSupplierType
          }
        });
        supplierKey = newSupplier.name;
      }

      // 2. Create AVL Vendor Meta
      await frappePost("frappe.client.insert", {
        doc: {
          doctype: "AVL Vendor Meta",
          supplier: supplierKey,
          avl_status: newSupplierStatus,
          avl_tier: newSupplierTier,
          compliance_status: newSupplierCompliance,
          last_audit_date: newSupplierLastAudit || undefined
        }
      });

      toast.success("Supplier added to AVL successfully");
      setIsAddSupplierOpen(false);

      // Reset form
      setNewSupplierName("");
      setNewSupplierGroup(supplierGroups[0] || "");
      setNewSupplierType("Company");
      setNewSupplierStatus("Under Review");
      setNewSupplierTier("Useful");
      setNewSupplierCompliance("Pending");
      setNewSupplierLastAudit("");

      loadAVL();
    } catch (err) {
      console.error("Failed to add supplier:", err);
      toast.error("Failed to add supplier", {
        description: (err as Error).message,
      });
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleUpdateValue = async (supplierId: string, fieldname: string, value: string) => {
    try {
      toast.info("Updating supplier details…");
      await frappePost("frappe.client.set_value", {
        doctype: "AVL Vendor Meta",
        name: supplierId,
        fieldname: fieldname,
        value: value,
      });
      toast.success("Supplier updated successfully");
      loadAVL(true); // reload silently
    } catch (err) {
      console.error("Failed to update supplier value:", err);
      toast.error("Failed to update supplier", {
        description: (err as Error).message,
      });
    }
  };

  // Radar data for selected supplier
  const radarSupplier = suppliers.find((v) => v.id === selectedSupplierForRadar);
  const radarData = radarSupplier
    ? TEN_C_LABELS.map(({ key, label }) => ({
      criterion: label,
      score: radarSupplier.tenC[key],
      fullMark: 10,
    }))
    : [];

  return (
    <AppShell title="Approved Supplier List" breadcrumb="Procurement / Approved Supplier List">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">

        {/* ─── PAGE HEADER & ACTIONS ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <PageHeader
            title="Approved Vendor List (AVL)"
            description="Vetted and rated suppliers for procurement — quality, compliance & performance at a glance."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAVL(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleExport}
              title="Export AVL as CSV"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={handleAddSupplierClick}
            >
              <Users className="h-3.5 w-3.5" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* ─── ERROR BANNER ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              className="ml-auto underline hover:no-underline"
              onClick={() => loadAVL()}
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── SECTION 1: KPI STRIP ─────────────────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AVL Snapshot</h2>
              <p className="text-xs text-muted-foreground">
                {kpis ? `${kpis.total} suppliers across ${supplierGroups.length} supplier groups` : "Loading…"} · FY 2024–25
              </p>
            </div>
          </div>

          {loading ? (
            <KpiSkeleton />
          ) : kpis ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">

              {/* KPI 1: Approved */}
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/45" />
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Approved Suppliers
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                    {kpis.approved}
                    <span className="text-sm font-semibold text-muted-foreground"> / {kpis.total}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    {kpis.total > 0 ? Math.round((kpis.approved / kpis.total) * 100) : 0}% approval rate
                  </p>
                  <div className="mt-3">
                    <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-[9px] font-bold">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5 inline" /> Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 2: Conditional */}
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/45" />
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Conditional / At-Risk
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                    {kpis.conditional}
                    <span className="text-sm font-semibold text-muted-foreground"> suppliers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    {kpis.underReview} under review · {kpis.suspended} suspended
                  </p>
                  <div className="mt-3">
                    <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning text-[9px] font-bold">
                      Needs Attention
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 3: Total Spend */}
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                  <Package className="h-3.5 w-3.5 text-muted-foreground/45" />
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total AVL Spend
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                    ₹{kpis.totalSpend.toFixed(1)}
                    <span className="text-sm font-semibold text-muted-foreground"> Cr</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-[11px] text-muted-foreground">Across all active purchase orders</p>
                  <div className="mt-3">
                    <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-[9px] font-bold">
                      YTD Committed
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 4: Avg On-Time Delivery */}
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/45" />
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Avg On-Time Delivery
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                    {kpis.avgOnTime.toFixed(1)}
                    <span className="text-sm font-semibold text-muted-foreground">%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <CustomProgress value={kpis.avgOnTime} className="h-1.5 mt-1" />
                  <p className="text-[11px] text-muted-foreground mt-1">Approved suppliers only</p>
                </CardContent>
              </Card>

              {/* KPI 5: Compliance */}
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                  <Award className="h-3.5 w-3.5 text-muted-foreground/45" />
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Compliance Rate
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                    {kpis.total > 0 ? Math.round((kpis.compliant / kpis.total) * 100) : 0}
                    <span className="text-sm font-semibold text-muted-foreground">%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    {kpis.compliant} of {kpis.total} suppliers compliant
                  </p>
                  <div className="mt-3">
                    <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-[9px] font-bold">
                      ✓ ISO / Audit
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* ─── SECTION 2: SUPPLIER GROUP BREAKDOWN + 10C RADAR ────────────────── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Supplier Group Bar Chart */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Suppliers by Group</h2>
                <p className="text-xs text-muted-foreground">Approval status distribution per supplier group</p>
              </div>
            </div>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                {loading ? (
                  <div className="h-[260px] w-full flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={supplierGroupSummaries}
                        margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          stroke="var(--muted-foreground)"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          stroke="var(--muted-foreground)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                          formatter={(v: number, name: string) => [v, name]}
                        />
                        <Bar dataKey="approvedCount" name="Approved" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="conditionalCount" name="Conditional" stackId="a" fill="var(--chart-4)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="suspendedCount" name="Suspended" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--chart-1)" }} />Approved</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--chart-4)" }} />Conditional</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive" />Suspended</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 10C Radar */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">10C Supplier Scorecard</h2>
                <p className="text-xs text-muted-foreground">Select a supplier to view capability radar</p>
              </div>
            </div>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <Select
                  value={selectedSupplierForRadar}
                  onValueChange={setSelectedSupplierForRadar}
                >
                  <SelectTrigger className="w-full text-xs h-9 bg-card mb-3">
                    <SelectValue placeholder="Select supplier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter((v) => {
                        const matchesGroup = supplierGroupFilter === "all" || v.category === supplierGroupFilter;
                        return matchesGroup && (v.status === "Approved" || v.status === "Conditional" || v.status === "Suspended");
                      })
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {loading ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : radarData.length > 0 ? (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="var(--primary)"
                          fill="var(--primary)"
                          fillOpacity={0.18}
                          strokeWidth={2}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                          formatter={(v: number) => [`${v}/10`, "Score"]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                    No supplier selected
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── SECTION 3: SUPPLIER TABLE ───────────────────────────────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Supplier Directory</h2>
                <p className="text-xs text-muted-foreground">
                  {filteredSuppliers.length} of {suppliers.length} suppliers shown
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search supplier, group, location…"
                  className="pl-8 h-9 text-xs w-[220px] bg-card"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SupplierStatus | "all")}>
                <SelectTrigger className="w-[140px] text-xs h-9 bg-card">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Conditional">Conditional</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplierGroupFilter} onValueChange={setSupplierGroupFilter}>
                <SelectTrigger className="w-[160px] text-xs h-9 bg-card">
                  <SelectValue placeholder="All Supplier Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Supplier Groups</SelectItem>
                  {supplierGroups.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as SupplierTier | "all")}>
                <SelectTrigger className="w-[120px] text-xs h-9 bg-card">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="Important">Important</SelectItem>
                  <SelectItem value="Useful">Useful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-[9.5px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/40">
                      <th className="p-3 w-6" />
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Supplier Group</th>
                      <th className="p-3 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                        <span className="flex items-center gap-1">Status <ArrowUpDown className="h-2.5 w-2.5" /></span>
                      </th>
                      <th className="p-3">Tier</th>
                      <th className="p-3 cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort("onTimeDelivery")}>
                        <span className="flex items-center justify-end gap-1">OTD% <ArrowUpDown className="h-2.5 w-2.5" /></span>
                      </th>
                      <th className="p-3 cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort("qualityScore")}>
                        <span className="flex items-center justify-end gap-1">Quality% <ArrowUpDown className="h-2.5 w-2.5" /></span>
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("totalSpend")}>
                        <span className="flex items-center justify-end gap-1">Spend (₹Cr) <ArrowUpDown className="h-2.5 w-2.5" /></span>
                      </th>
                      <th className="p-3 text-center">Compliance</th>
                      <th className="p-3">Last Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <TableSkeleton />
                    ) : filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground text-xs">
                          No suppliers match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((supplier) => {
                        const isExpanded = expandedSupplier === supplier.id;
                        return (
                          <React.Fragment key={supplier.id}>
                            <tr
                              className="hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => setExpandedSupplier(isExpanded ? null : supplier.id)}
                            >
                              <td className="p-3 text-muted-foreground">
                                {isExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5" />
                                  : <ChevronRight className="h-3.5 w-3.5" />}
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-foreground">{supplier.name}</div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{supplier.location}</div>
                              </td>
                              <td className="p-3 text-muted-foreground">{supplier.category}</td>
                              <td className="p-3"><StatusBadge status={supplier.status} /></td>
                              <td className="p-3"><TierBadge tier={supplier.tier} /></td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 min-w-[72px]">
                                  <CustomProgress
                                    value={supplier.onTimeDelivery}
                                    className="h-1.5 w-14"
                                    indicatorClassName={
                                      supplier.onTimeDelivery >= 90
                                        ? "bg-success"
                                        : supplier.onTimeDelivery >= 80
                                          ? "bg-warning"
                                          : "bg-destructive"
                                    }
                                  />
                                  <span className="font-mono text-[9px] font-bold">
                                    {supplier.onTimeDelivery.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <span className="font-mono font-bold text-foreground">
                                  {supplier.qualityScore.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-foreground">
                                ₹{supplier.totalSpend.toFixed(1)}
                              </td>
                              <td className="p-3 text-center">
                                <ComplianceBadge status={supplier.complianceStatus} />
                              </td>
                              <td className="p-3 text-muted-foreground">{supplier.lastAuditDate || "—"}</td>
                            </tr>

                            {/* ─── Expanded Detail Row ─────────────────────── */}
                            {isExpanded && (
                              <tr className="bg-muted/20">
                                <td colSpan={10} className="px-6 py-4">
                                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                                    {/* Contact */}
                                    <div>
                                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                        Contact Details
                                      </p>
                                      <p className="text-xs font-semibold text-foreground">{supplier.contactPerson || "—"}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{supplier.contactEmail || "—"}</p>
                                    </div>

                                    {/* Certifications */}
                                    <div>
                                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                        Certifications
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {supplier.certifications.length > 0 ? (
                                          supplier.certifications.map((cert) => (
                                            <Badge
                                              key={cert}
                                              variant="outline"
                                              className="text-[9px] border-primary/20 bg-primary/10 text-primary"
                                            >
                                              {cert}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-destructive font-medium">No certifications registered</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Performance */}
                                    <div>
                                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                        Performance Overview
                                      </p>
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-muted-foreground">Scorecard Rating</span>
                                          <StarRating value={supplier.rating} />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-muted-foreground">Active POs</span>
                                          <span className="font-semibold text-foreground">{supplier.activePos}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-muted-foreground">Cost Performance Index</span>
                                          <span className={cn(
                                            "font-semibold font-mono",
                                            supplier.costIndex <= 100 ? "text-success" : "text-warning",
                                          )}>
                                            {supplier.costIndex}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 10C Scores mini */}
                                    <div>
                                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                        10C Model Scores
                                      </p>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                        {TEN_C_LABELS.map(({ key, label }) => (
                                          <div key={key} className="flex items-center justify-between text-[9px]">
                                            <span className="text-muted-foreground truncate">{label}</span>
                                            <span className={cn(
                                              "font-mono font-bold ml-1",
                                              supplier.tenC[key] >= 8
                                                ? "text-success"
                                                : supplier.tenC[key] >= 6
                                                  ? "text-warning"
                                                  : "text-destructive",
                                            )}>
                                              {supplier.tenC[key]}/10
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Admin Actions */}
                                    <div>
                                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                        Admin Actions
                                      </p>
                                      <div className="space-y-3">
                                        <div>
                                          <span className="text-[10px] text-muted-foreground block mb-1">AVL Status</span>
                                          <Select
                                            value={supplier.status}
                                            onValueChange={(val) => handleUpdateValue(supplier.id, "avl_status", val)}
                                          >
                                            <SelectTrigger className="h-8 text-[11px] bg-card">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Approved">Approved</SelectItem>
                                              <SelectItem value="Conditional">Conditional</SelectItem>
                                              <SelectItem value="Suspended">Suspended</SelectItem>
                                              <SelectItem value="Under Review">Under Review</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-muted-foreground block mb-1">AVL Tier</span>
                                          <Select
                                            value={supplier.tier}
                                            onValueChange={(val) => handleUpdateValue(supplier.id, "avl_tier", val)}
                                          >
                                            <SelectTrigger className="h-8 text-[11px] bg-card">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Critical">Critical</SelectItem>
                                              <SelectItem value="Important">Important</SelectItem>
                                              <SelectItem value="Useful">Useful</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-muted-foreground block mb-1">Compliance Status</span>
                                          <Select
                                            value={supplier.complianceStatus}
                                            onValueChange={(val) => handleUpdateValue(supplier.id, "compliance_status", val)}
                                          >
                                            <SelectTrigger className="h-8 text-[11px] bg-card">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Compliant">Compliant</SelectItem>
                                              <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                                              <SelectItem value="Pending">Pending</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── SECTION 4: ALERTS ────────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AVL Alerts & Actions Required</h2>
              <p className="text-xs text-muted-foreground">Items requiring procurement team attention</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4 animate-pulse">
                  <div className="h-3 w-40 rounded bg-muted mb-2" />
                  <div className="h-2 w-full rounded bg-muted/60 mb-1" />
                  <div className="h-2 w-3/4 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              No active alerts — all suppliers in good standing.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {alerts.map((alert, i) => {
                const styleMap = {
                  error: {
                    wrap: "border-destructive/20 bg-destructive/10 border-l-destructive",
                    icon: <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />,
                    title: "text-destructive",
                  },
                  warning: {
                    wrap: "border-warning/20 bg-warning/10 border-l-warning",
                    icon: <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />,
                    title: "text-warning",
                  },
                  info: {
                    wrap: "border-primary/20 bg-primary/10 border-l-primary",
                    icon: <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />,
                    title: "text-primary",
                  },
                  neutral: {
                    wrap: "border-muted/40 bg-muted/20 border-l-muted-foreground",
                    icon: <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />,
                    title: "text-foreground",
                  },
                  success: {
                    wrap: "border-success/20 bg-success/10 border-l-success",
                    icon: <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />,
                    title: "text-success",
                  },
                };
                const s = styleMap[alert.type];
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-4 border-l-4",
                      s.wrap,
                    )}
                  >
                    <div className="flex gap-2">
                      {s.icon}
                      <div>
                        {alert.supplier && (
                          <p className={cn("text-xs font-bold", s.title)}>{alert.supplier}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
        <p className="mt-8 text-[10px] text-muted-foreground text-center">
          Sourced from Frappe DocTypes: <code>Supplier</code> · <code>AVL Vendor Meta</code> · <code>Supplier Scorecard</code> · <code>Quality Inspection</code> · <code>Purchase Order</code> · <code>Purchase Invoice</code> · Refresh rate: on-demand
        </p>
      </main>

      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Supplier to AVL</DialogTitle>
            <DialogDescription>
              Create or link an existing supplier in ERPNext and add it to the Approved Vendor List.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSupplier} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="supplierName" className="text-xs">Supplier Name</Label>
              <Input
                id="supplierName"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="e.g. TATA Steel Ltd"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplierGroup" className="text-xs">Supplier Group</Label>
                <Select value={newSupplierGroup} onValueChange={setNewSupplierGroup}>
                  <SelectTrigger id="supplierGroup" className="h-9 text-xs">
                    <SelectValue placeholder="Select Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierType" className="text-xs">Supplier Type</Label>
                <Select value={newSupplierType} onValueChange={(val) => setNewSupplierType(val as "Company" | "Individual")}>
                  <SelectTrigger id="supplierType" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="avlStatus" className="text-xs">AVL Status</Label>
                <Select value={newSupplierStatus} onValueChange={(val) => setNewSupplierStatus(val as SupplierStatus)}>
                  <SelectTrigger id="avlStatus" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Conditional">Conditional</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="avlTier" className="text-xs">AVL Tier</Label>
                <Select value={newSupplierTier} onValueChange={(val) => setNewSupplierTier(val as SupplierTier)}>
                  <SelectTrigger id="avlTier" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Important">Important</SelectItem>
                    <SelectItem value="Useful">Useful</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="complianceStatus" className="text-xs">Compliance Status</Label>
                <Select value={newSupplierCompliance} onValueChange={(val) => setNewSupplierCompliance(val as ComplianceStatus)}>
                  <SelectTrigger id="complianceStatus" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compliant">Compliant</SelectItem>
                    <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastAuditDate" className="text-xs">Last Audit Date</Label>
                <Input
                  id="lastAuditDate"
                  type="date"
                  value={newSupplierLastAudit}
                  onChange={(e) => setNewSupplierLastAudit(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSupplierOpen(false)} disabled={savingSupplier}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingSupplier}>
                {savingSupplier ? "Adding..." : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}