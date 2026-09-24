import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  AlertCircle,
  Sparkles,
  Briefcase,
  DollarSign,
  Layers,
  ArrowUpDown,
  Search,
  Star,
  ChevronDown,
  ChevronRight,
  Info,
  Download,
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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Line,
  ComposedChart,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Data Types ──────────────────────────────────────────────────────────────

type ProjectData = {
  name: string;
  loc: string;
  budget: number;
  committed: number;
  paid: number;
  cats: number[]; // matches CAT_NAMES indexing
};

type SupplierData = {
  name: string;
  pos: number;
  val: number;
  ontime: number;
  rating: number;
  payment: "Paid" | "Partial" | "Overdue";
};

type FunnelStage = {
  label: string;
  count: number;
  value: number;
  days: number;
  bottleneck: boolean;
};

type SavingsData = {
  cat: string;
  baseline: string;
  negotiated: string;
  pct: number;
  saving: number;
  by: string;
  validated: boolean;
};

// ─── Custom Progress Component ───────────────────────────────────────────────

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

// ─── Theme Color Mappings & Static Data ───────────────────────────────────────

// Uses CSS variables from styles.css so they adapt to light/dark themes
const CAT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

const FCOLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

const CAT_NAMES = [
  "Mechanical Equip.",
  "Civil & Structural",
  "Electrical & I&C",
  "Piping & Valves",
  "Subcontracts",
  "Consumables & Misc",
];

const CAT_BUDGET = [90.0, 80.0, 55.0, 40.0, 30.0, 17.4]; // YTD baseline budgets
const CAT_VALUES = [94.2, 78.4, 52.1, 38.7, 31.6, 17.4]; // YTD actual committed

const PROJECTS: ProjectData[] = [
  {
    name: "Renuka Sugars Cogen",
    loc: "Karnataka",
    budget: 42.8,
    committed: 44.1,
    paid: 28.6,
    cats: [13.2, 11.4, 7.8, 5.9, 4.3, 1.5],
  },
  {
    name: "NTPC Vindhyachal FGD",
    loc: "Madhya Pradesh",
    budget: 67.3,
    committed: 64.8,
    paid: 41.2,
    cats: [22.0, 15.3, 11.2, 7.8, 5.9, 2.6],
  },
  {
    name: "Balrampur Chini Dist.",
    loc: "Uttar Pradesh",
    budget: 28.9,
    committed: 31.2,
    paid: 17.4,
    cats: [9.0, 7.4, 5.3, 4.2, 3.6, 1.7],
  },
  {
    name: "Dalmia Bharat Cement",
    loc: "Andhra Pradesh",
    budget: 89.4,
    committed: 85.6,
    paid: 56.3,
    cats: [28.4, 22.4, 14.8, 11.2, 6.8, 2.0],
  },
  {
    name: "IFFCO Phulpur Fert.",
    loc: "Uttar Pradesh",
    budget: 84.0,
    committed: 86.7,
    paid: 44.1,
    cats: [21.6, 21.9, 13.0, 9.6, 11.0, 9.6],
  },
];

const SUPPLIERS: SupplierData[] = [
  { name: "JSW Steel Ltd", pos: 3, val: 38.6, ontime: 94.2, rating: 5, payment: "Paid" },
  { name: "Thermax Ltd", pos: 2, val: 29.4, ontime: 87.1, rating: 4, payment: "Partial" },
  { name: "Tata BlueScope Steel", pos: 4, val: 24.8, ontime: 91.5, rating: 4, payment: "Paid" },
  { name: "Siemens India", pos: 1, val: 22.3, ontime: 96.0, rating: 5, payment: "Paid" },
  { name: "L&T Hydrocarbon", pos: 2, val: 18.9, ontime: 78.3, rating: 3, payment: "Overdue" },
  { name: "Sika India Pvt Ltd", pos: 5, val: 12.4, ontime: 89.7, rating: 4, payment: "Paid" },
  { name: "Dalmia Bharat Refrac.", pos: 3, val: 9.8, ontime: 82.1, rating: 3, payment: "Partial" },
  { name: "RMD Kwikform India", pos: 6, val: 7.2, ontime: 93.4, rating: 4, payment: "Paid" },
];

const FUNNEL_STAGES: FunnelStage[] = [
  { label: "Indent Raised", count: 87, value: 42.3, days: 3.2, bottleneck: false },
  { label: "RFQ Issued", count: 74, value: 38.1, days: 8.4, bottleneck: false },
  { label: "Quotes Received", count: 61, value: 32.7, days: 14.6, bottleneck: true },
  { label: "PO Awarded", count: 52, value: 29.8, days: 5.8, bottleneck: false },
  { label: "GRN Done", count: 29, value: 18.4, days: 9.2, bottleneck: false },
];

const SAVINGS: SavingsData[] = [
  {
    cat: "Mechanical Equip.",
    baseline: "₹7,240/t",
    negotiated: "₹6,890/t",
    pct: 4.83,
    saving: 2.8,
    by: "N. Sharma",
    validated: true,
  },
  {
    cat: "Civil & Structural",
    baseline: "₹580/bag",
    negotiated: "₹545/bag",
    pct: 6.03,
    saving: 2.1,
    by: "R. Mehta",
    validated: true,
  },
  {
    cat: "Electrical & I&C",
    baseline: "₹1,850/u",
    negotiated: "₹1,780/u",
    pct: 3.78,
    saving: 1.4,
    by: "A. Pillai",
    validated: false,
  },
  {
    cat: "Piping & Valves",
    baseline: "₹3,200/m",
    negotiated: "₹3,120/m",
    pct: 2.5,
    saving: 0.9,
    by: "P. Hegde",
    validated: true,
  },
  {
    cat: "Subcontracts",
    baseline: "₹1,420/d",
    negotiated: "₹1,380/d",
    pct: 2.82,
    saving: 0.7,
    by: "S. Naidu",
    validated: false,
  },
  {
    cat: "Consumables",
    baseline: "₹980/u",
    negotiated: "₹965/u",
    pct: 1.53,
    saving: 0.5,
    by: "R. Mehta",
    validated: true,
  },
];

// Stacked monthly trends (Oct 24 - Mar 25)
const MONTHLY_TRENDS = [
  {
    month: "Oct",
    Mechanical: 11.2,
    Civil: 9.4,
    Electrical: 6.2,
    Piping: 4.6,
    Subcontract: 3.8,
    Consumables: 2.1,
    total: 37.3,
    cumulative: 37.3,
  },
  {
    month: "Nov",
    Mechanical: 13.0,
    Civil: 10.8,
    Electrical: 7.1,
    Piping: 5.2,
    Subcontract: 4.1,
    Consumables: 2.3,
    total: 42.5,
    cumulative: 79.8,
  },
  {
    month: "Dec",
    Mechanical: 15.4,
    Civil: 12.2,
    Electrical: 8.4,
    Piping: 6.0,
    Subcontract: 4.6,
    Consumables: 2.6,
    total: 49.2,
    cumulative: 129.0,
  },
  {
    month: "Jan",
    Mechanical: 17.8,
    Civil: 13.6,
    Electrical: 9.2,
    Piping: 6.8,
    Subcontract: 5.2,
    Consumables: 2.8,
    total: 55.4,
    cumulative: 184.4,
  },
  {
    month: "Feb",
    Mechanical: 19.2,
    Civil: 14.8,
    Electrical: 10.0,
    Piping: 7.4,
    Subcontract: 5.8,
    Consumables: 3.0,
    total: 60.2,
    cumulative: 244.6,
  },
  {
    month: "Mar",
    Mechanical: 17.6,
    Civil: 17.6,
    Electrical: 11.2,
    Piping: 8.7,
    Subcontract: 7.1,
    Consumables: 4.6,
    total: 66.8,
    cumulative: 311.4,
  },
];

// Cash forecasting (Apr-Sep 2025)
const CASH_FORECAST = [
  {
    month: "Apr '25",
    subcontract: 4.2,
    material: 9.8,
    equipment: 3.1,
    retention: 0.8,
    budget: 24.0,
    total: 17.9,
  },
  {
    month: "May '25",
    subcontract: 5.1,
    material: 11.2,
    equipment: 3.4,
    retention: 1.2,
    budget: 26.0,
    total: 20.9,
  },
  {
    month: "Jun '25",
    subcontract: 6.8,
    material: 14.6,
    equipment: 4.2,
    retention: 2.8,
    budget: 29.0,
    total: 28.4,
  },
  {
    month: "Jul '25",
    subcontract: 5.6,
    material: 12.1,
    equipment: 3.8,
    retention: 1.4,
    budget: 25.0,
    total: 22.9,
  },
  {
    month: "Aug '25",
    subcontract: 4.9,
    material: 10.4,
    equipment: 3.2,
    retention: 2.1,
    budget: 23.0,
    total: 20.6,
  },
  {
    month: "Sep '25",
    subcontract: 3.8,
    material: 8.6,
    equipment: 2.9,
    retention: 1.8,
    budget: 21.0,
    total: 17.1,
  },
];

export const Route = createLazyFileRoute("/spend-analytics")({
  component: SpendAnalyticsDashboard,
});

function SpendAnalyticsDashboard() {
  useEffect(() => {
    document.title = "Spend Analytics — ProcureX";
  }, []);

  // ─── Filter States ────────────────────────────────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState<
    "This Month" | "This Quarter" | "YTD" | "Custom Range"
  >("YTD");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [highlightedCategory, setHighlightedCategory] = useState<number | null>(null);

  // Supplier Search & Sorting States
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierSortCol, setSupplierSortCol] = useState<keyof SupplierData | null>("val");
  const [supplierSortAsc, setSupplierSortAsc] = useState(false);

  // Savings Search
  const [savingsSearch, setSavingsSearch] = useState("");

  // Project Matrix expanded row tracking
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  // ─── Computed Statistics (Dynamically Affected by Project Filter) ───────────
  const { kpis, donutData, projectTotalRow } = useMemo(() => {
    // Basic defaults representing total portfolio
    let totalCommitted = 312.4;
    let totalBudget = 312.4;
    let actualPaid = 187.6;
    let totalSavings = 8.4;
    let poPendingValue = 18.7;
    let certifiedSubcontract = 19.2;
    let uncertifiedSubcontract = 12.4;
    let subcontractExposure = 31.6;

    // Filter calculations
    if (selectedProject !== "all") {
      const proj = PROJECTS.find((p) => p.name === selectedProject);
      if (proj) {
        totalCommitted = proj.committed;
        totalBudget = proj.budget;
        actualPaid = proj.paid;

        // Dynamic calculations for selected project
        const projectShare = proj.committed / 312.4;
        totalSavings = parseFloat((8.4 * projectShare).toFixed(1));
        poPendingValue = parseFloat((18.7 * projectShare).toFixed(1));

        // Proportional subcontractor exposure
        subcontractExposure = proj.cats[4] || 0; // Subcontracts category
        certifiedSubcontract = parseFloat((subcontractExposure * 0.608).toFixed(1));
        uncertifiedSubcontract = parseFloat((subcontractExposure * 0.392).toFixed(1));
      }
    }

    const calculatedKpis = {
      committedSpend: totalCommitted,
      budget: totalBudget,
      utilizedPct: Math.round((totalCommitted / totalBudget) * 100),
      actualSpend: actualPaid,
      paidPct: ((actualPaid / totalCommitted) * 100).toFixed(1),
      savings: totalSavings,
      savingsPct: ((totalSavings / (totalCommitted + totalSavings)) * 100).toFixed(2),
      pendingGRNCount: selectedProject === "all" ? 23 : Math.round(23 * (totalCommitted / 312.4)),
      pendingGRNValue: poPendingValue,
      subcontractCertified: certifiedSubcontract,
      subcontractUncertified: uncertifiedSubcontract,
      subcontractTotal: subcontractExposure,
      subcontractCertifiedPct:
        subcontractExposure > 0
          ? ((certifiedSubcontract / subcontractExposure) * 100).toFixed(1)
          : "0.0",
    };

    // Construct Pie Chart Data
    let pieValues = [...CAT_VALUES];
    if (selectedProject !== "all") {
      const proj = PROJECTS.find((p) => p.name === selectedProject);
      if (proj) {
        pieValues = proj.cats;
      }
    }

    const calculatedDonutData = CAT_NAMES.map((name, i) => {
      const val = pieValues[i];
      const budgetVal =
        selectedProject === "all"
          ? CAT_BUDGET[i]
          : PROJECTS.find((p) => p.name === selectedProject)?.cats[i] || 1;
      const budgetPct = Math.round((val / budgetVal) * 100);
      return {
        name,
        value: parseFloat(val.toFixed(1)),
        color: CAT_COLORS[i],
        budgetPct,
      };
    });

    // Compute Project Table Totals
    const budgetSum = PROJECTS.reduce((acc, p) => acc + p.budget, 0);
    const committedSum = PROJECTS.reduce((acc, p) => acc + p.committed, 0);
    const paidSum = PROJECTS.reduce((acc, p) => acc + p.paid, 0);
    const varianceSum = budgetSum - committedSum;

    const calculatedProjectTotalRow = {
      budget: budgetSum,
      committed: committedSum,
      paid: paidSum,
      pctCommitted: Math.round((committedSum / budgetSum) * 100),
      pctPaid: Math.round((paidSum / committedSum) * 100),
      variance: varianceSum,
    };

    return {
      kpis: calculatedKpis,
      donutData: calculatedDonutData,
      projectTotalRow: calculatedProjectTotalRow,
    };
  }, [selectedProject]);

  // Handle supplier search and sorting
  const filteredSuppliers = useMemo(() => {
    let result = [...SUPPLIERS];

    // Search filter
    if (supplierSearch.trim()) {
      result = result.filter((s) => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
    }

    // Sort order
    if (supplierSortCol) {
      result.sort((a, b) => {
        const valA = a[supplierSortCol];
        const valB = b[supplierSortCol];

        if (typeof valA === "string" && typeof valB === "string") {
          return supplierSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return supplierSortAsc ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return result;
  }, [supplierSearch, supplierSortCol, supplierSortAsc]);

  // Handle savings search
  const filteredSavings = useMemo(() => {
    let result = [...SAVINGS];
    if (savingsSearch.trim()) {
      result = result.filter(
        (s) =>
          s.cat.toLowerCase().includes(savingsSearch.toLowerCase()) ||
          s.by.toLowerCase().includes(savingsSearch.toLowerCase()),
      );
    }
    return result;
  }, [savingsSearch]);

  const toggleProjectDrill = (idx: number) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleSupplierSort = (col: keyof SupplierData) => {
    if (supplierSortCol === col) {
      setSupplierSortAsc((prev) => !prev);
    } else {
      setSupplierSortCol(col);
      setSupplierSortAsc(true);
    }
  };

  const handleExport = () => {
    toast.success("Export started", {
      description: `Downloading spend analytics data for ${selectedProject === "all" ? "all projects" : selectedProject} (${selectedPeriod}).`,
    });
  };

  return (
    <AppShell title="Spend Analytics" breadcrumb="Procurement / Spend Analytics">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        {/* ─── PAGE HEADER & FILTERS ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <PageHeader
            title="Spend Analytics Dashboard"
            description="Category and supplier spend intelligence across your purchase orders."
          />
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
              {(["This Month", "This Quarter", "YTD", "Custom Range"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setSelectedPeriod(period);
                    toast.info(`Period changed to: ${period}`);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${selectedPeriod === period
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Project Filter select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Project</span>
              <Select
                value={selectedProject}
                onValueChange={(val) => {
                  setSelectedProject(val);
                  toast.success(
                    val === "all" ? "Showing portfolio overview" : `Filtering by: ${val}`,
                  );
                }}
              >
                <SelectTrigger className="w-[200px] text-xs h-9 bg-card">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {PROJECTS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Trigger */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleExport}
              title="Export Current View"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* ─── SECTION 1: KPI STRIP ─────────────────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              ₹
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground font-sans">Spend Command</h2>
              <p className="text-xs text-muted-foreground">
                Portfolio snapshot · {selectedPeriod} Apr 2024 – Mar 2025
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* KPI 1: Committed Spend */}
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground/45" />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Committed Spend
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                  ₹{kpis.committedSpend.toFixed(1)}
                  <span className="text-sm font-semibold text-muted-foreground"> Cr</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground">
                  vs Budget ₹{kpis.budget.toFixed(1)} Cr · {kpis.utilizedPct}% utilized
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-success/20 bg-success/10 text-success text-[9px] font-bold"
                  >
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5 inline" /> +4.2% YoY
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-warning/20 bg-warning/10 text-warning text-[9px] font-bold"
                  >
                    Watch
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Actual Spend */}
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/45" />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actual Paid / Invoiced
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                  ₹{kpis.actualSpend.toFixed(1)}
                  <span className="text-sm font-semibold text-muted-foreground"> Cr</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground">
                  {kpis.paidPct}% of committed spend
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-success/20 bg-success/10 text-success text-[9px] font-bold"
                  >
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5 inline" /> +11.3% vs Q3
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-success/20 bg-success/10 text-success text-[9px] font-bold"
                  >
                    On Track
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Savings */}
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground/45" />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Savings vs Baseline
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                  ₹{kpis.savings.toFixed(1)}
                  <span className="text-sm font-semibold text-muted-foreground"> Cr</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground">
                  {kpis.savingsPct}% achieved · Target 3.5%
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-muted bg-muted/50 text-muted-foreground text-[9px] font-bold"
                  >
                    ▲ +0.4% vs Q3
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-warning/20 bg-warning/10 text-warning text-[9px] font-bold"
                  >
                    Below Target
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Pending GRN */}
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/45" />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  POs Pending GRN
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                  {kpis.pendingGRNCount}
                  <span className="text-sm font-semibold text-muted-foreground"> POs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-destructive font-semibold">
                  ⚠ 7 overdue GRNs · ₹{kpis.pendingGRNValue.toFixed(1)} Cr
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-destructive/20 bg-destructive/10 text-destructive text-[9px] font-bold"
                  >
                    Action Req.
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* KPI 5: Subcontract Exposure */}
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 h-10 w-10 bg-muted/30 rounded-bl-[40px] flex items-start justify-end p-1">
                <Layers className="h-3.5 w-3.5 text-muted-foreground/45" />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Subcontract Exposure
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight mt-1">
                  ₹{kpis.subcontractTotal.toFixed(1)}
                  <span className="text-sm font-semibold text-muted-foreground"> Cr</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[11px] text-muted-foreground">
                  ₹{kpis.subcontractCertified} Cr certified · {kpis.subcontractCertifiedPct}%
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-warning/20 bg-warning/10 text-warning text-[9px] font-bold"
                  >
                    Monitor
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── SECTION 2: SPEND BREAKDOWN (PIE CHART & HISTORICAL TREND) ─────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              ◉
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Spend Breakdown</h2>
              <p className="text-xs text-muted-foreground">
                Category distribution & monthly historical trend
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Pie Chart Card */}
            <Card className="lg:col-span-5 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Category Spend Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Hover or select slices to drill details
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {/* Recharts Pie Chart */}
                  <div className="relative h-[180px] w-[180px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {donutData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={entry.color}
                              style={{
                                outline: "none",
                                cursor: "pointer",
                                opacity:
                                  highlightedCategory === null || highlightedCategory === idx
                                    ? 1
                                    : 0.35,
                                transform: highlightedCategory === idx ? "scale(1.05)" : "scale(1)",
                                transformOrigin: "50% 50%",
                                transition: "all 0.2s ease",
                              }}
                              onClick={() => {
                                setHighlightedCategory((prev) => (prev === idx ? null : idx));
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: string | number) => [`₹${value} Cr`, "Spend"]}
                          contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        {highlightedCategory !== null
                          ? CAT_NAMES[highlightedCategory].split(" ")[0]
                          : "Total"}
                      </span>
                      <span className="text-sm font-black text-foreground">
                        ₹
                        {highlightedCategory !== null
                          ? donutData[highlightedCategory].value.toFixed(1)
                          : kpis.committedSpend.toFixed(1)}
                        Cr
                      </span>
                    </div>
                  </div>

                  {/* Custom Legend with mini Progress bars */}
                  <div className="flex-1 space-y-1.5 w-full">
                    {donutData.map((cat, idx) => (
                      <div
                        key={cat.name}
                        onClick={() =>
                          setHighlightedCategory((prev) => (prev === idx ? null : idx))
                        }
                        className={`flex flex-col p-1.5 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors ${highlightedCategory === idx
                          ? "bg-muted shadow-sm font-semibold border-l-2 border-primary"
                          : ""
                          }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-muted-foreground text-[11px] truncate max-w-[130px]">
                              {cat.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">₹{cat.value} Cr</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {Math.round((cat.value / kpis.committedSpend) * 100)}%
                            </span>
                          </div>
                        </div>
                        {/* Mini budget tracking bar */}
                        <div className="flex items-center gap-1">
                          <CustomProgress
                            value={Math.min(cat.budgetPct, 100)}
                            className="h-1"
                            indicatorClassName={
                              cat.budgetPct > 100 ? "bg-destructive" : "bg-primary"
                            }
                          />
                          <span
                            className={`text-[9px] font-mono leading-none ${cat.budgetPct > 100 ? "text-destructive font-bold" : "text-muted-foreground"}`}
                          >
                            {cat.budgetPct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend Card */}
            <Card className="lg:col-span-7 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Monthly Spend Trend</CardTitle>
                  <CardDescription className="text-xs">
                    Oct 2024 – Mar 2025 · Stacked by category type
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground bg-muted/40 text-[10px]"
                >
                  Budget Burn: ₹52.1 Cr/mo
                </Badge>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={MONTHLY_TRENDS}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="month"
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                        formatter={(value: string | number) => [`₹${value} Cr`]}
                      />
                      <Bar
                        dataKey="Mechanical"
                        stackId="a"
                        fill={CAT_COLORS[0]}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar dataKey="Civil" stackId="a" fill={CAT_COLORS[1]} radius={[0, 0, 0, 0]} />
                      <Bar
                        dataKey="Electrical"
                        stackId="a"
                        fill={CAT_COLORS[2]}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Piping"
                        stackId="a"
                        fill={CAT_COLORS[3]}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Subcontract"
                        stackId="a"
                        fill={CAT_COLORS[4]}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Consumables"
                        stackId="a"
                        fill={CAT_COLORS[5]}
                        radius={[4, 4, 0, 0]}
                      />
                      {/* Cumulative Line Overlay */}
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        strokeDasharray="4 2"
                        dot={{ r: 3.5, fill: "var(--primary)" }}
                        name="Cumulative Spend"
                      />
                      {/* Budget reference line */}
                      <ReferenceLine
                        y={52.1}
                        stroke="var(--destructive)"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{
                          value: "Budget limit ₹52.1Cr",
                          position: "top",
                          fill: "var(--destructive)",
                          fontSize: 9,
                          fontFamily: "monospace",
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── SECTION 3: PROJECT MATRIX WITH CATEGORY DRILLDOWNS ───────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              ⊞
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Project Spend Matrix</h2>
              <p className="text-xs text-muted-foreground">
                Dynamic billing matrix · Click any row to expand category breakdown
              </p>
            </div>
          </div>

          <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    <th className="p-3">Project</th>
                    <th className="p-3 text-right">Budget (₹ Cr)</th>
                    <th className="p-3 text-right">Committed (₹ Cr)</th>
                    <th className="p-3 text-right">Actual Paid (₹ Cr)</th>
                    <th className="p-3">Usage Progress</th>
                    <th className="p-3 text-right">% Paid</th>
                    <th className="p-3 text-right">Variance (₹ Cr)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PROJECTS.map((proj, idx) => {
                    const isExpanded = !!expandedProjects[idx];
                    const pctCommitted = Math.round((proj.committed / proj.budget) * 100);
                    const pctPaid = Math.round((proj.paid / proj.committed) * 100);
                    const variance = proj.budget - proj.committed;
                    const isOverBudget = variance < 0;

                    let statusText = "Under Budget";
                    let statusClass = "bg-success/10 text-success border-success/20";
                    let progressBarColor = "bg-success";

                    if (pctCommitted > 105) {
                      statusText = "Over Committed";
                      statusClass = "bg-destructive/10 text-destructive border-destructive/20";
                      progressBarColor = "bg-destructive";
                    } else if (pctCommitted > 95) {
                      statusText = "Watch";
                      statusClass = "bg-warning/10 text-warning border-warning/20";
                      progressBarColor = "bg-warning";
                    }

                    return (
                      <React.Fragment key={proj.name}>
                        {/* Summary Row */}
                        <tr
                          onClick={() => toggleProjectDrill(idx)}
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <td className="p-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                              <div>
                                <div>{proj.name}</div>
                                <span className="font-mono text-[9px] text-muted-foreground font-normal">
                                  {proj.loc}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-muted-foreground">
                            ₹{proj.budget.toFixed(1)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-foreground">
                            ₹{proj.committed.toFixed(1)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-foreground">
                            ₹{proj.paid.toFixed(1)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <CustomProgress
                                value={Math.min(pctCommitted, 100)}
                                className="h-1.5"
                                indicatorClassName={progressBarColor}
                              />
                              <span className="font-mono text-[10px] font-semibold">
                                {pctCommitted}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-muted-foreground">
                            {pctPaid}%
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold ${isOverBudget ? "text-destructive" : "text-success"}`}
                          >
                            {isOverBudget ? "-" : "+"}
                            {Math.abs(variance).toFixed(1)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className={`${statusClass} font-bold text-[9px] px-1.5 py-0.5`}
                            >
                              {statusText}
                            </Badge>
                          </td>
                        </tr>

                        {/* Collapsible Category breakdown table */}
                        {isExpanded && (
                          <tr className="bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-200">
                            <td colSpan={8} className="p-0 border-t border-border">
                              <div className="px-10 py-3 border-l-4 border-primary bg-muted/20">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                  Category Spend Allocation — {proj.name}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                  {CAT_NAMES.map((cat, catIdx) => {
                                    const spendValue = proj.cats[catIdx];
                                    const catShare = Math.round(
                                      (spendValue / proj.committed) * 100,
                                    );
                                    return (
                                      <div
                                        key={cat}
                                        className="bg-card border border-border rounded-lg p-2.5 shadow-sm"
                                      >
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: CAT_COLORS[catIdx] }}
                                          />
                                          <span className="text-[10px] text-muted-foreground truncate font-medium">
                                            {cat}
                                          </span>
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                          <span className="text-xs font-bold text-foreground">
                                            ₹{spendValue.toFixed(1)} Cr
                                          </span>
                                          <span className="text-[9px] font-mono text-muted-foreground">
                                            {catShare}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Portfolio Totals Row */}
                  <tr className="bg-muted/60 font-bold border-t-2 border-border">
                    <td className="p-3 text-foreground font-bold">Portfolio Total</td>
                    <td className="p-3 text-right font-mono">
                      ₹{projectTotalRow.budget.toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹{projectTotalRow.committed.toFixed(1)}
                    </td>
                    <td className="p-3 text-right font-mono">₹{projectTotalRow.paid.toFixed(1)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <CustomProgress
                          value={projectTotalRow.pctCommitted}
                          className="h-2 bg-muted-foreground/20"
                        />
                        <span className="font-mono text-[10px] font-bold">
                          {projectTotalRow.pctCommitted}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">{projectTotalRow.pctPaid}%</td>
                    <td
                      className={`p-3 text-right font-mono font-black ${projectTotalRow.variance < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {projectTotalRow.variance < 0 ? "-" : "+"}
                      {Math.abs(projectTotalRow.variance).toFixed(1)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className="border-warning/20 bg-warning/10 text-warning font-black text-[9px]"
                      >
                        Balanced
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ─── SECTION 4: SUPPLIER PERFORMANCE & CONCENTRATION ────────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              ▤
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Supplier Performance</h2>
              <p className="text-xs text-muted-foreground">
                League table & spend concentration analysis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Supplier League Table */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Top Suppliers League Table
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click column header to sort supplier metrics
                  </CardDescription>
                </div>
                {/* Supplier Search box */}
                <div className="relative w-full sm:w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search supplier..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-muted/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="sticky top-0 bg-card border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground z-10">
                      <tr>
                        <th className="p-2.5 w-[35px]">#</th>
                        <th
                          className="p-2.5 cursor-pointer hover:text-primary"
                          onClick={() => handleSupplierSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Supplier <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th
                          className="p-2.5 text-center cursor-pointer hover:text-primary"
                          onClick={() => handleSupplierSort("pos")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            POs <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th
                          className="p-2.5 text-right cursor-pointer hover:text-primary"
                          onClick={() => handleSupplierSort("val")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            PO Value <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th
                          className="p-2.5 cursor-pointer hover:text-primary"
                          onClick={() => handleSupplierSort("ontime")}
                        >
                          <div className="flex items-center gap-1">
                            On-Time % <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="p-2.5">Rating</th>
                        <th className="p-2.5">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSuppliers.map((supp, index) => {
                        const isTop = supp.val >= 22;
                        const onColor =
                          supp.ontime >= 90
                            ? "text-success"
                            : supp.ontime >= 80
                              ? "text-warning"
                              : "text-destructive";
                        const progressIndicator =
                          supp.ontime >= 90
                            ? "bg-success"
                            : supp.ontime >= 80
                              ? "bg-warning"
                              : "bg-destructive";

                        let payBadgeClass = "bg-success/10 text-success border-success/20";
                        if (supp.payment === "Partial") {
                          payBadgeClass = "bg-warning/10 text-warning border-warning/20";
                        } else if (supp.payment === "Overdue") {
                          payBadgeClass =
                            "bg-destructive/10 text-destructive border-destructive/20";
                        }

                        return (
                          <tr key={supp.name} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5">
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold ${isTop
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="p-2.5 font-medium text-foreground">{supp.name}</td>
                            <td className="p-2.5 text-center font-mono">{supp.pos}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-foreground">
                              ₹{supp.val.toFixed(1)} Cr
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-col gap-1 min-w-[70px]">
                                <div className="flex items-center justify-between text-[9px] font-mono">
                                  <span className={`${onColor} font-semibold`}>{supp.ontime}%</span>
                                </div>
                                <CustomProgress
                                  value={supp.ontime}
                                  className="h-1"
                                  indicatorClassName={progressIndicator}
                                />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-2.5 w-2.5 ${i < supp.rating ? "fill-warning stroke-warning" : "stroke-muted-foreground/30 fill-transparent"}`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0.2 font-bold ${payBadgeClass}`}
                              >
                                {supp.payment}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSuppliers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">
                            No suppliers matched search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Concentration Risk */}
            <Card className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Supplier Spend Concentration
                </CardTitle>
                <CardDescription className="text-xs">
                  % of total ₹{kpis.committedSpend.toFixed(1)} Cr portfolio spend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {SUPPLIERS.map((supp) => {
                    const percentage = (supp.val / 312.4) * 100;
                    const isRisk = percentage > 15;
                    const percentageOfMax = (supp.val / 38.6) * 100;
                    const barColor = isRisk ? "bg-warning" : "bg-success";

                    return (
                      <div key={supp.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground text-[11px]">
                            {supp.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-muted-foreground text-[10px]">
                              ₹{supp.val.toFixed(1)} Cr
                            </span>
                            <span
                              className={`font-mono font-bold ${isRisk ? "text-warning" : "text-success"}`}
                            >
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <CustomProgress
                            value={percentageOfMax}
                            className="h-3"
                            indicatorClassName={barColor}
                          />
                          {isRisk && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white tracking-wider flex items-center gap-0.5">
                              ⚠️ Concentration Risk
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 border-l-4 border-l-destructive">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive font-medium">
                      Top 3 suppliers = 29.6% of total spend (₹92.8 Cr) — concentration risk
                      flagged. Recommend diversifying raw structural material sourcing to alternate
                      Qualified AVL vendors.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── SECTION 5: PO LIFECYCLE FUNNEL & SAVINGS TRACKER ──────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              ▧
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">PO Lifecycle Funnel & Savings</h2>
              <p className="text-xs text-muted-foreground">
                Procurement pipeline workflow analysis and negotiated tracker
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* PO Lifecycle Funnel */}
            <Card className="lg:col-span-5 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">PO Lifecycle Funnel</CardTitle>
                <CardDescription className="text-xs">
                  Current active pipeline cycle · Bottlenecks highlighted
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-2.5">
                {FUNNEL_STAGES.map((stage, idx) => {
                  const maxCount = FUNNEL_STAGES[0].count;
                  const widthPct = (stage.count / maxCount) * 100;
                  const barColor = stage.bottleneck
                    ? "bg-warning hover:bg-warning/90"
                    : "bg-primary hover:bg-primary/90";

                  return (
                    <div key={stage.label} className="flex flex-col items-center w-full">
                      {idx > 0 && <div className="h-3 w-1 bg-border rounded-full my-0.5" />}
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground text-[11px]">
                              {stage.label}
                            </span>
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {stage.count} POs · ₹{stage.value} Cr
                            </span>
                          </div>
                          <div className="relative">
                            <CustomProgress
                              value={widthPct}
                              className="h-6"
                              indicatorClassName={`${barColor} transition-all`}
                            />
                            {stage.bottleneck && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold uppercase text-white tracking-widest animate-pulse">
                                ⚠ BOTTLENECK DETECTED
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[9px] w-[55px] text-center font-bold"
                        >
                          {stage.days}d avg
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Savings Tracker Table */}
            <Card className="lg:col-span-7 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Negotiated Savings Tracker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Savings achieved vs supplier initial quotes
                  </CardDescription>
                </div>
                {/* Search category */}
                <div className="relative w-full sm:w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search category..."
                    value={savingsSearch}
                    onChange={(e) => setSavingsSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-muted/40"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border text-[9.5px] uppercase font-bold tracking-wider text-muted-foreground">
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Baseline Quote</th>
                        <th className="p-3 text-right">Negotiated PO</th>
                        <th className="p-3">Saving %</th>
                        <th className="p-3 text-right">Saving ₹ Cr</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSavings.map((save) => (
                        <tr key={save.cat} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-semibold text-foreground">
                            <div>
                              <div>{save.cat}</div>
                              <span className="text-[9px] text-muted-foreground font-normal">
                                Buyer: {save.by}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {save.baseline}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-success">
                            {save.negotiated}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 min-w-[80px]">
                              <CustomProgress
                                value={Math.min(save.pct * 12, 100)}
                                className="h-1.5"
                              />
                              <span className="font-mono text-[9px] font-bold text-muted-foreground">
                                {save.pct.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            ₹{save.saving.toFixed(1)} Cr
                          </td>
                          <td className="p-3 text-center">
                            {save.validated ? (
                              <Badge
                                variant="outline"
                                className="border-success/20 bg-success/10 text-success text-[9px] font-bold"
                              >
                                ✓ Validated
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-warning/20 bg-warning/10 text-warning text-[9px] font-bold"
                              >
                                ⏳ Pending
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Subtotal row */}
                      <tr className="bg-muted/40 font-bold border-t-2 border-border">
                        <td colSpan={4} className="p-3 text-foreground font-bold">
                          Total Portfolio Savings
                        </td>
                        <td className="p-3 text-right font-mono font-black text-success text-sm">
                          ₹{SAVINGS.reduce((acc, s) => acc + s.saving, 0).toFixed(1)} Cr
                        </td>
                        <td className="p-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── SECTION 6: CASH OUTFLOW FORECAST ─────────────────────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              ⟳
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Cash Outflow Forecast</h2>
              <p className="text-xs text-muted-foreground">
                Apr–Sep 2025 · Projected monthly cash schedule by payout categories
              </p>
            </div>
          </div>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    180-Day Cash Outflow Projection
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Stacked by invoices & payments type against cash budget ceilings
                  </CardDescription>
                </div>
                {/* Color Legend */}
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: FCOLORS[0] }}
                    />
                    <span>Subcontract Bills</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: FCOLORS[1] }}
                    />
                    <span>Material Invoices</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: FCOLORS[2] }}
                    />
                    <span>Equipment Hire</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: FCOLORS[3] }}
                    />
                    <span>Retention Release</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-[2px] w-4 bg-[var(--destructive)] border-t border-dashed border-[var(--destructive)]" />
                    <span className="text-destructive">Cash Budget Limit</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    data={CASH_FORECAST}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                      formatter={(value: string | number) => [`₹${value} Cr`]}
                    />
                    <Bar
                      dataKey="subcontract"
                      stackId="cf"
                      fill={FCOLORS[0]}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar dataKey="material" stackId="cf" fill={FCOLORS[1]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="equipment" stackId="cf" fill={FCOLORS[2]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="retention" stackId="cf" fill={FCOLORS[3]} radius={[4, 4, 0, 0]} />
                    {/* Red line ceiling for Budget limit */}
                    <ReferenceLine
                      y={29.0}
                      stroke="var(--destructive)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      label={{
                        value: "Limit ceiling ₹29.0Cr",
                        position: "top",
                        fill: "var(--destructive)",
                        fontSize: 9,
                        fontFamily: "monospace",
                      }}
                    />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3.5 border-l-4 border-l-warning">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning font-medium">
                    Peak outflow month: <strong>June 2025</strong> — ₹28.4 Cr projected vs ₹29.0 Cr
                    budget · Ensure payment facility of ₹5.4 Cr additional headroom is active for
                    electrical equipment release triggers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── FOOTER METRIC INFO ───────────────────────────────────────────── */}
        <p className="mt-8 text-[10px] text-muted-foreground text-center">
          Sourced in real-time from Frappe DocTypes: <code>Purchase Order</code> ·{" "}
          <code>Purchase Receipt (GRN)</code> · <code>RA Bill Ledger</code> · Refresh rate: 15 min.
        </p>
      </main>
    </AppShell>
  );
}
