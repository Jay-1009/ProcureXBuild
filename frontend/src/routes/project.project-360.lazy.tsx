import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Minus, Bell, Search, Shield, Zap, RefreshCw, Filter, ArrowUpRight,
  User, Check, AlertCircle, FileText, Briefcase, Activity, Sparkles, ChevronRight, ChevronLeft, X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createLazyFileRoute("/project/project-360")({
  component: Project360Page,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Trend = "up" | "down" | "flat";

type PortfolioSummary = {
  activeProjects: number;
  healthy: number;
  atRisk: number;
  critical: number;
  collectionDelayed: string;
  approvalsP: number;
  forecastMargin: string;
  lastRefresh: string;
};

type KPI = {
  label: string;
  value: string;
  sub: string;
  trend: Trend;
  trendVal: string;
  color: string;
};

type AttentionProject = {
  project: string;
  code: string;
  issue: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  owner: string;
  ownerInitial: string;
  ownerColor: string;
  daysOpen: number;
  impact: string;
  action: string;
  status: string;
  aiRec: string;
};

type HealthyProject = {
  project: string;
};

type DecisionItem = {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  action: string;
  detail: string;
  owner: string;
  ownerInitial: string;
  dueIn: string;
  impact: string;
  type: "approve" | "escalate" | "review";
  tag: string;
};

type FinancialMetric = { label: string; value: string; trend: Trend };

type DelayedActivity = {
  activity: string;
  project: string;
  plannedDate?: string;
  delay: number;
  status?: string;
  responsible: string;
  recovery: string;
};

type ProcurementException = {
  material: string;
  project: string;
  delay: string;
  supplier: string;
  expectedDate: string;
  status: string;
  action: string;
  delayDays?: number;
};

type ScoreBreakdown = { label: string; score: number; color: string };

type Project360Data = {
  portfolioSummary: PortfolioSummary;
  kpis: KPI[];
  attentionProjects: AttentionProject[];
  healthyProjects: HealthyProject[];
  decisionInbox: DecisionItem[];
  financial: {
    metrics: FinancialMetric[];
    revenueMonthly: number[];
    revenueMonths: string[];
  };
  schedule: {
    onTrack: number;
    watchlist: number;
    critical: number;
    delayedActivities: DelayedActivity[];
  };
  cashflow: {
    billsSubmitted: string;
    billsApproved: string;
    outstandingReceivables: string;
    totalReceived: string;
    monthlyIn: number[];
    monthlyOut: number[];
    months: string[];
  };
  procurement: ProcurementException[];
  criticalProcurementIssues?: number;
  labour: {
    planned: number;
    actual: number;
    utilisation: number;
    present: number;
    absent: number;
    overtime: number;
    costMTD: string;
  };
  equipment: {
    total: number;
    active: number;
    idle: number;
    maintenance: number;
    utilisation: number;
    maintenanceCostMTD: string;
    rentalCostMTD: string;
  };
  projectWiseUsage?: {
    projectName: string;
    projectCode: string;
    manpowerUsed: string;
    manpowerCost: string;
    equipmentUsed: string;
    equipmentCost: string;
  }[];
  safety: { incidents: number; nearMiss: number; openNCR: number; reworkCost: string; ltiFreeProjects: number; ltiFreeDays: number };
  aiIntelligence: { overallScore: number; breakdown: ScoreBreakdown[]; summary: string };
};

// ─── Static Executive Data ───────────────────────────────────────────────────

const STATIC_PROJECT360_DATA: Project360Data = {
  portfolioSummary: {
    activeProjects: 14,
    healthy: 8,
    atRisk: 4,
    critical: 2,
    collectionDelayed: "₹18.4 Cr",
    approvalsP: 6,
    forecastMargin: "14.2%",
    lastRefresh: "Today, 15:30 IST",
  },
  kpis: [
    { label: "Unbilled Work Done", value: "₹62.8 Cr", sub: "WIP Ready for RA Bill #6", trend: "flat", trendVal: "Optimal cycle time", color: "#D97706" },
    { label: "Overdue Receivables", value: "₹24.6 Cr", sub: "> 45 Days Overdue (3 Clients)", trend: "down", trendVal: "-₹3.2 Cr recovered", color: "#DC2626" },
    { label: "Procurement Spend", value: "₹412.0 Cr", sub: "48.7% of Total Billed Value", trend: "up", trendVal: "Within BOQ budget", color: "#4F46E5" },
    { label: "Subcontractor Payables", value: "₹38.5 Cr", sub: "Due within next 15 days", trend: "flat", trendVal: "On scheduled terms", color: "#7C3AED" },
  ],
  attentionProjects: [
    {
      project: "NTPC Vindhyachal FGD Phase-2",
      code: "PRJ-2024-001",
      issue: "Absorber erection delayed by 14 days due to heavy crawler crane breakdown & structural steel delivery lag.",
      priority: "CRITICAL",
      owner: "Rajeshwar Rao (PM)",
      ownerInitial: "RR",
      ownerColor: "#DC2626",
      daysOpen: 18,
      impact: "₹6.8 Cr LD Risk / 3-week delay",
      action: "Deploy secondary 250T crawler crane from Singrauli depot immediately.",
      status: "🔴 Critical Path Impacted",
      aiRec: "Approve crane mobilization budget (₹4.5 L) to recover 10 days on critical path.",
    },
    {
      project: "Renuka Sugars Distillery Expansion",
      code: "PRJ-2024-003",
      issue: "Fermentation tanks hydro-test failed due to flange welding defects; 12 welds rejected in NDT ultrasonic testing.",
      priority: "HIGH",
      owner: "Anand Verma (QC Mgr)",
      ownerInitial: "AV",
      ownerColor: "#D97706",
      daysOpen: 9,
      impact: "₹2.1 Cr Rework / 6-day delay",
      action: "Mobilize specialized TIG welding crew & re-test by Friday.",
      status: "🟡 Quality Hold",
      aiRec: "Issue vendor debit note for consumable wastage & accelerate re-testing.",
    },
    {
      project: "IFFCO Phulpur Ammonia Storage",
      code: "PRJ-2024-007",
      issue: "Subcontractor (Shree Civils) labor attendance dropped to 65% due to delayed wage disbursement from main office.",
      priority: "HIGH",
      owner: "Suresh Kumar (Site VP)",
      ownerInitial: "SK",
      ownerColor: "#D97706",
      daysOpen: 11,
      impact: "Civil foundation delay / 8-day lag",
      action: "Direct payment to labor bank accounts against RA Bill #4.",
      status: "🟡 Labor Shortage",
      aiRec: "Release interim payment of ₹45 L directly to labor contractor to restore 100% headcount.",
    },
    {
      project: "Balrampur Chini Cogeneration",
      code: "PRJ-2024-002",
      issue: "Boiler drum lifting permit pending chief inspector of boilers (CIB) statutory clearance & Form II signoff.",
      priority: "MEDIUM",
      owner: "Vikram Gokhale (Liaison)",
      ownerInitial: "VG",
      ownerColor: "#2563EB",
      daysOpen: 7,
      impact: "Erection hold / No cost impact yet",
      action: "Schedule senior management meeting with regional CIB office.",
      status: "🔵 Regulatory Approval Pending",
      aiRec: "Escalate to Director level for expedited inspection clearance this Thursday.",
    },
  ],
  healthyProjects: [
    { project: "Godavari Bioenergy Boiler Revamp" },
    { project: "IOCL Mathura BoP Civil Works" },
    { project: "Praj Industries CBG Plant" },
    { project: "SEIL Sugar Phase 2 Modernization" },
    { project: "Ugar Sugar Expansion Project" },
    { project: "Dalmia Bharat Cement Grinding Unit" },
    { project: "Ultratech Cement Silo Construction" },
    { project: "Hindalco Smelter Expansion" },
  ],
  decisionInbox: [
    {
      id: "DEC-2026-089",
      priority: "CRITICAL",
      action: "Authorise NTPC Crane Mobilization Budget",
      detail: "Approve emergency hire of 250T crawler crane from Sanghvi Cranes for NTPC Vindhyachal site to recover 14-day lag.",
      owner: "Rajeshwar Rao",
      ownerInitial: "RR",
      dueIn: "Today (Overdue Risk)",
      impact: "Prevents ₹6.8 Cr LD penalty",
      type: "approve",
      tag: "CAPEX / Rentals",
    },
    {
      id: "DEC-2026-092",
      priority: "HIGH",
      action: "Approve Tata BlueScope Steel Price Variation",
      detail: "4.5% steel rate hike claim for 450 MT structural steel plates required for Balrampur Chini boiler structure.",
      owner: "Procurement Head",
      ownerInitial: "PH",
      dueIn: "Tomorrow",
      impact: "Unlocks 450 MT delivery",
      type: "approve",
      tag: "Procurement",
    },
    {
      id: "DEC-2026-095",
      priority: "HIGH",
      action: "Direct Labor Payment for Shree Civils",
      detail: "Bypass main contractor and release ₹45 L directly to workers to resume IFFCO Phulpur foundation work.",
      owner: "Suresh Kumar",
      ownerInitial: "SK",
      dueIn: "Within 48 hours",
      impact: "Restores 120+ labor headcount",
      type: "escalate",
      tag: "Finance / Labor",
    },
    {
      id: "DEC-2026-098",
      priority: "MEDIUM",
      action: "Sign CIB Statutory Declaration for Balrampur",
      detail: "Form II technical compliance certificate required for boiler drum erection permit.",
      owner: "Vikram Gokhale",
      ownerInitial: "VG",
      dueIn: "In 3 days",
      impact: "Clears erection hold",
      type: "review",
      tag: "Regulatory",
    },
    {
      id: "DEC-2026-101",
      priority: "MEDIUM",
      action: "Approve Subcontractor Change for Piping Works",
      detail: "Replace underperforming vendor at IOCL Mathura site with L2 bidder (Apex Piping Solutions).",
      owner: "Project Director",
      ownerInitial: "PD",
      dueIn: "In 5 days",
      impact: "Improves welding productivity by 35%",
      type: "review",
      tag: "Subcontracts",
    },
  ],
  financial: {
    metrics: [
      { label: "Total Contract Value", value: "₹1,420.5 Cr", trend: "up" },
      { label: "Total Billed Amount", value: "₹845.2 Cr", trend: "up" },
      { label: "Total Project Cost", value: "₹682.4 Cr", trend: "up" },
      { label: "Gross Margin %", value: "19.26%", trend: "up" },
      { label: "Total Overhead Cost", value: "₹64.2 Cr", trend: "flat" },
      { label: "Project Profit Margin %", value: "11.67%", trend: "up" },
      { label: "Net Cash Flow", value: "+₹38.4 Cr", trend: "up" },
      { label: "Project ROI %", value: "24.8%", trend: "up" },
    ],
    revenueMonthly: [68.4, 72.1, 69.8, 75.4, 81.2, 84.5, 88.0, 92.4, 95.1, 98.6, 102.3, 108.5],
    revenueMonths: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
  },
  schedule: {
    onTrack: 8,
    watchlist: 4,
    critical: 2,
    delayedActivities: [
      { activity: "FGD Absorber Structural Erection", project: "NTPC Vindhyachal", delay: 18, responsible: "Mechanical Erection Team", recovery: "Deploying 250T secondary crane on double shift" },
      { activity: "Fermentation Tank NDT Re-testing", project: "Renuka Sugars", delay: 9, responsible: "QA/QC Department", recovery: "Specialized TIG welders mobilized; testing 24x7" },
      { activity: "Ammonia Tank Foundation Concreting", project: "IFFCO Phulpur", delay: 11, responsible: "Shree Civils (Subcontractor)", recovery: "Direct wage disbursement scheduled to resume work" },
      { activity: "Boiler Drum Elevation & Alignment", project: "Balrampur Chini", delay: 7, responsible: "Liaison Officer", recovery: "Senior management meeting with CIB chief on Thursday" },
      { activity: "Coal Conveyor Gallery Fabrication", project: "Dalmia Bharat", delay: 5, responsible: "Workshop Team", recovery: "Shifted 40 MT fabrication to auxiliary workshop" },
    ],
  },
  cashflow: {
    billsSubmitted: "₹10.83 Cr",
    billsApproved: "₹10.51 Cr",
    outstandingReceivables: "₹2.67 L",
    totalReceived: "₹1.43 Cr",
    monthlyIn: [62.4, 68.1, 71.5, 69.2, 78.4, 82.1, 85.6, 88.2, 91.4, 95.8, 98.2, 104.5],
    monthlyOut: [58.1, 62.3, 65.4, 66.8, 70.2, 74.5, 76.8, 79.1, 82.3, 85.4, 88.1, 91.2],
    months: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
  },
  procurement: [
    { material: "250T Crawler Crane Mobilization", project: "NTPC Vindhyachal", delay: "14 Days", delayDays: 14, supplier: "Sanghvi Cranes Ltd", expectedDate: "2026-04-12", status: "Delayed", action: "Follow-up" },
    { material: "450 MT Structural Steel Plates (IS 2062)", project: "Balrampur Chini", delay: "10 Days", delayDays: 10, supplier: "Tata BlueScope Steel", expectedDate: "2026-04-16", status: "Delayed", action: "Follow-up" },
    { material: "DN500 Duplex Stainless Steel Valves", project: "Renuka Sugars", delay: "8 Days", delayDays: 8, supplier: "L&T Valves Division", expectedDate: "2026-04-18", status: "Delayed", action: "Follow-up" },
    { material: "11kV HT Switchgear Panels", project: "IFFCO Phulpur", delay: "6 Days", delayDays: 6, supplier: "Siemens India", expectedDate: "2026-04-20", status: "Delayed", action: "Follow-up" },
  ],
  criticalProcurementIssues: 4,
  labour: { planned: 250, actual: 225, utilisation: 90, present: 218, absent: 32, overtime: 18, costMTD: "₹12.5 L" },
  equipment: { total: 45, active: 37, idle: 5, maintenance: 3, utilisation: 82, maintenanceCostMTD: "₹2.4 L", rentalCostMTD: "₹8.2 L" },
  projectWiseUsage: [
    { projectName: "Vaibhalaxmi Pune Project", projectCode: "PROJ-0031", manpowerUsed: "32 workers", manpowerCost: "₹1.01 L", equipmentUsed: "18 units", equipmentCost: "₹1.02 L" },
    { projectName: "DAULAT", projectCode: "PROJ-0004", manpowerUsed: "20 workers", manpowerCost: "₹2.55 K", equipmentUsed: "0 units", equipmentCost: "₹0" },
    { projectName: "Kolkata Vaishavi Builders", projectCode: "PROJ-0042", manpowerUsed: "22 workers", manpowerCost: "₹28.50 K", equipmentUsed: "6 units", equipmentCost: "₹34.20 K" },
    { projectName: "Project Vedanta Banglore", projectCode: "PROJ-0020", manpowerUsed: "22 workers", manpowerCost: "₹1.00 K", equipmentUsed: "8 units", equipmentCost: "₹40.00 K" },
    { projectName: "Miraj Project", projectCode: "PROJ-0003", manpowerUsed: "28 workers", manpowerCost: "₹50.00", equipmentUsed: "0 units", equipmentCost: "₹0" },
    { projectName: "ECR JATH 2", projectCode: "PROJ-0046", manpowerUsed: "9 workers", manpowerCost: "₹9.60 K", equipmentUsed: "2 units", equipmentCost: "₹9.60 K" },
  ],
  safety: { incidents: 0, nearMiss: 4, openNCR: 6, reworkCost: "₹24.8 L", ltiFreeProjects: 10, ltiFreeDays: 412 },
  aiIntelligence: {
    overallScore: 88,
    breakdown: [
      { label: "Cost & Budget Efficiency (CPI 1.04)", score: 94, color: "#16A34A" },
      { label: "Schedule Adherence (SPI 0.98)", score: 86, color: "#2563EB" },
      { label: "Quality & Safety Compliance (0 LTI)", score: 92, color: "#7C3AED" },
      { label: "Cashflow & Receivable Velocity", score: 82, color: "#D97706" },
      { label: "Subcontractor & Labour Productivity", score: 86, color: "#DB2777" },
    ],
    summary: "Portfolio is performing robustly with an Overall Health Score of 88/100 (+3 vs last month). Financial efficiency remains exceptionally strong (CPI 1.04, EBITDA margin 11.67%). Primary risks are concentrated in mechanical erection at NTPC Vindhyachal (crane breakdown) and labor headcount at IFFCO Phulpur. Authorizing the 3 immediate executive decisions below will recover 18 days of schedule delay and protect ₹6.8 Cr in liquidated damages.",
  },
};

// ─── API Helper ───────────────────────────────────────────────────────────────

async function frappePost<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/method/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.message;
}

// ─── Page Component ───────────────────────────────────────────────────────────

function Project360Page() {
  useEffect(() => {
    document.title = "PROJECT360 — Management Command Centre";
  }, []);

  // Using static data directly for instantaneous executive rendering
  const [data, setData] = useState<Project360Data>(STATIC_PROJECT360_DATA);
  const [approvedProcurement, setApprovedProcurement] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // New filter states:
  const [selectedSite, setSelectedSite] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sitesList, setSitesList] = useState<string[]>([]);
  const [projectsList, setProjectsList] = useState<{ name: string; label: string }[]>([]);
  const [activitiesPage, setActivitiesPage] = useState<number>(1);
  const [procurementPage, setProcurementPage] = useState<number>(1);

  // Fetch available filter lists on mount
  useEffect(() => {
    frappePost<{ sites: string[]; projects: { name: string; label: string }[] }>("quantbit_construction_management.api.project_360.get_project_360_filters")
      .then((res) => {
        if (res) {
          setSitesList(res.sites || []);
          setProjectsList(res.projects || []);
        }
      })
      .catch((err) => console.error("Failed to load filters:", err));
  }, []);

  // Fetch dynamic KPI data whenever filters change or refresh is clicked
  const loadKpis = useCallback(async (siteVal: string, projVal: string, fromVal: string, toVal: string) => {
    try {
      const res = await frappePost<{
        unbilledWorkDone: { value: string; sub: string };
        overdueReceivables: { value: string; sub: string };
        procurementSpend: { value: string; sub: string };
        subcontractorPayables: { value: string; sub: string };
        financialMetrics?: FinancialMetric[];
        billingTrend?: { months: string[]; monthlyValues: number[] };
        scheduleStatus?: { onTrack: number; watchlist: number; critical: number };
        delayedActivities?: DelayedActivity[];
        cashflowStatus?: {
          billsSubmitted: string;
          billsApproved: string;
          outstandingReceivables: string;
          totalReceived: string;
          monthlyIn: number[];
          monthlyOut: number[];
          months: string[];
        };
        procurementDelays?: ProcurementException[];
        criticalProcurementIssues?: number;
        labourMetrics?: {
          planned: number;
          actual: number;
          utilisation: number;
          present: number;
          absent: number;
          overtime: number;
          costMTD: string;
        };
        equipmentMetrics?: {
          total: number;
          active: number;
          idle: number;
          maintenance: number;
          utilisation: number;
          maintenanceCostMTD: string;
          rentalCostMTD: string;
        };
        projectWiseUsage?: {
          projectName: string;
          projectCode: string;
          manpowerUsed: string;
          manpowerCost: string;
          equipmentUsed: string;
          equipmentCost: string;
        }[];
      }>("quantbit_construction_management.api.project_360.get_project_360_kpis", {
        site: siteVal === "all" ? "" : siteVal,
        project: projVal === "all" ? "" : projVal,
        from_date: fromVal,
        to_date: toVal,
      });

      if (res) {
        setData((prev) => ({
          ...prev,
          kpis: prev.kpis.map((k) => {
            if (k.label === "Unbilled Work Done") {
              return { ...k, value: res.unbilledWorkDone.value, sub: res.unbilledWorkDone.sub };
            }
            if (k.label === "Overdue Receivables") {
              return { ...k, value: res.overdueReceivables.value, sub: res.overdueReceivables.sub };
            }
            if (k.label === "Procurement Spend" && res.procurementSpend) {
              return { ...k, value: res.procurementSpend.value, sub: res.procurementSpend.sub };
            }
            if (k.label === "Subcontractor Payables") {
              return { ...k, value: res.subcontractorPayables.value, sub: res.subcontractorPayables.sub };
            }
            return k;
          }),
          financial: {
            ...prev.financial,
            metrics: res.financialMetrics || prev.financial.metrics,
            revenueMonths: res.billingTrend?.months || prev.financial.revenueMonths,
            revenueMonthly: res.billingTrend?.monthlyValues || prev.financial.revenueMonthly,
          },
          schedule: {
            ...prev.schedule,
            onTrack: res.scheduleStatus !== undefined ? res.scheduleStatus.onTrack : prev.schedule.onTrack,
            watchlist: res.scheduleStatus !== undefined ? res.scheduleStatus.watchlist : prev.schedule.watchlist,
            critical: res.scheduleStatus !== undefined ? res.scheduleStatus.critical : prev.schedule.critical,
            delayedActivities: res.delayedActivities || prev.schedule.delayedActivities,
          },
          cashflow: res.cashflowStatus
            ? {
                billsSubmitted: res.cashflowStatus.billsSubmitted,
                billsApproved: res.cashflowStatus.billsApproved,
                outstandingReceivables: res.cashflowStatus.outstandingReceivables,
                totalReceived: res.cashflowStatus.totalReceived,
                monthlyIn: res.cashflowStatus.monthlyIn,
                monthlyOut: res.cashflowStatus.monthlyOut,
                months: res.cashflowStatus.months,
              }
            : prev.cashflow,
          procurement: res.procurementDelays || prev.procurement,
          criticalProcurementIssues: res.criticalProcurementIssues !== undefined ? res.criticalProcurementIssues : prev.criticalProcurementIssues,
          labour: res.labourMetrics || prev.labour,
          equipment: res.equipmentMetrics || prev.equipment,
          projectWiseUsage: res.projectWiseUsage || prev.projectWiseUsage,
        }));
      }
    } catch (err) {
      console.error("Failed to load KPI data:", err);
    }
  }, []);

  useEffect(() => {
    setActivitiesPage(1);
    setProcurementPage(1);
    loadKpis(selectedSite, selectedProject, fromDate, toDate);
  }, [selectedSite, selectedProject, fromDate, toDate, loadKpis]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadKpis(selectedSite, selectedProject, fromDate, toDate);
    setTimeout(() => {
      setData((prev) => ({ ...prev, portfolioSummary: { ...prev.portfolioSummary, lastRefresh: "Just now" } }));
      setRefreshing(false);
    }, 600);
  }, [selectedSite, selectedProject, fromDate, toDate, loadKpis]);

  const handleProcurementApprove = (idx: number) => {
    setApprovedProcurement((prev) => new Set([...prev, idx]));
  };

  const { portfolioSummary: ps, kpis,
    financial, schedule, cashflow, procurement, criticalProcurementIssues = 4, labour, equipment,
    safety, aiIntelligence } = data;

  const filteredActivities = useMemo(() => {
    if (!query) return schedule.delayedActivities;
    const q = query.toLowerCase();
    return schedule.delayedActivities.filter(
      (a) =>
        a.project.toLowerCase().includes(q) ||
        a.activity.toLowerCase().includes(q) ||
        a.recovery.toLowerCase().includes(q)
    );
  }, [schedule.delayedActivities, query]);

  const filteredProcurement = useMemo(() => {
    if (!query) return procurement;
    const q = query.toLowerCase();
    return procurement.filter(
      (p) =>
        p.project.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
    );
  }, [procurement, query]);

  const revenueChartData = financial.revenueMonths.map((m, i) => ({
    month: m, value: financial.revenueMonthly[i],
  }));

  const cashChartData = cashflow.months.map((m, i) => ({
    month: m, cashIn: cashflow.monthlyIn[i], cashOut: cashflow.monthlyOut[i],
  }));

  return (
    <AppShell title="Project 360" breadcrumb="Project / Project 360">
      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-8 text-slate-800 font-sans selection:bg-blue-600 selection:text-white pb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                PROJECT 360 COMMAND CENTRE
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold">
                  Executive AI Edition
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                Live across {ps.activeProjects} active EPC projects · Last synced {ps.lastRefresh}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-medium">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer font-medium"
              />
              <span className="text-slate-500 font-medium ml-1">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer font-medium"
              />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-8 w-[200px] text-xs bg-white border-slate-200 text-slate-700 font-medium">
                <SelectValue placeholder="All EPC Projects (14 Active)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All EPC Projects (14 Active)</SelectItem>
                {projectsList.length > 0 ? (
                  projectsList.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.label}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="Renuka Sugars Refinery">Renuka Sugars Refinery</SelectItem>
                    <SelectItem value="NTPC Vindhyachal FGD">NTPC Vindhyachal FGD</SelectItem>
                    <SelectItem value="Balrampur Chini Boiler">Balrampur Chini Boiler</SelectItem>
                    <SelectItem value="IFFCO Phulpur Storage">IFFCO Phulpur Storage</SelectItem>
                    <SelectItem value="Dalmia Bharat Cement">Dalmia Bharat Cement</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="h-8 w-[150px] text-xs bg-white border-slate-200 text-slate-700 font-medium">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sitesList.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 gap-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-2xs h-8">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="text-xs text-slate-800 focus:outline-none w-28 bg-transparent placeholder:text-slate-400 font-medium"
              />
            </div>
            {(fromDate || toDate || selectedProject !== "all" || selectedSite !== "all" || query) && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setSelectedProject("all");
                  setSelectedSite("all");
                  setQuery("");
                }}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors h-8"
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 h-8 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI Strip ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Portfolio Financial & Operational Performance
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight ml-2">Key Performance Indicators</h2>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Real-time synchronization · <span className="text-blue-700 font-mono font-semibold">Live Bench Mode</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} kpi={k} />
            ))}
          </div>
        </section>

        {/* ── Financial Snapshot ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-md">
                Financial Health
              </span>
              <h3 className="text-base font-bold text-slate-900">Year-to-Date Financial Snapshot & Billing Trend</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            {financial.metrics.map((m, i) => {
              const colors = ["#2563EB", "#16A34A", "#16A34A", "#16A34A", "#DC2626", "#D97706", "#334155", "#7C3AED"];
              const tc = m.trend === "up" ? "text-emerald-600" : m.trend === "down" ? "text-rose-600" : "text-slate-400";
              const ti = m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→";
              return (
                <div key={m.label} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 hover:border-slate-300 transition-all">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{m.label}</div>
                  <div className="font-mono text-xl font-bold mt-0.5" style={{ color: colors[i] }}>
                    {m.value}
                  </div>
                  <div className={`text-xs font-bold mt-1.5 flex items-center gap-1 ${tc}`}>
                    <span>{ti}</span>
                    <span className="text-[10px] uppercase font-mono text-slate-500">Vs Plan</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                MONTHLY BILLING TREND (₹ Crores)
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                Source: Submitted RA Bills
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `₹${v}`} axisLine={{ stroke: '#E2E8F0' }} />
                <Tooltip formatter={(v: number) => [`₹${v} Cr`, "Monthly Billing"]} contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", fontSize: 12, color: "#0F172A", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Schedule + Cash Flow ─────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">
          {/* Schedule */}
          <section className="col-span-12 lg:col-span-6 flex flex-col">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-widest bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-md">
                Schedule Adherence
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">PROJECT SCHEDULE & DELAY STATUS</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "🟢 ON TRACK PROJECTS", sub: "Actual progress is close to or ahead of plan", val: schedule.onTrack, text: "text-emerald-700", bg: "bg-emerald-50/80", border: "border-emerald-200" },
                { label: "🟡 PROJECTS AT RISK", sub: "Progress behind plan, not significantly delayed", val: schedule.watchlist, text: "text-amber-700", bg: "bg-amber-50/80", border: "border-amber-200" },
                { label: "🔴 DELAYED PROJECTS", sub: "Planned completion passed / significant delay", val: schedule.critical, text: "text-rose-700", bg: "bg-rose-50/80", border: "border-rose-200" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-3.5 text-center shadow-2xs flex flex-col justify-center`}>
                  <div className={`font-mono text-2xl font-black ${s.text}`}>{s.val}</div>
                  <div className="text-[11px] font-extrabold text-slate-800 mt-1.5 tracking-wide leading-tight">{s.label}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col justify-between">
              <div className="px-5 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <span>TOP DELAYED PROJECT ACTIVITIES</span>
                <span className="text-rose-600 font-mono">{filteredActivities.length} Action Plans Active</span>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        {["Activity Description", "Project", "Delay (Days)", "Recovery Strategy"].map((h) => (
                          <th key={h} className="px-4 py-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActivities.slice((activitiesPage - 1) * 10, activitiesPage * 10).map((a, i) => (
                        <tr key={`${a.activity}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-slate-900">{a.activity}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-medium">{a.project}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded ${a.delay > 14 ? "bg-rose-50 text-rose-700 border border-rose-200" : a.delay > 7 ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-slate-500"}`}>
                              +{a.delay} Days
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-emerald-700 font-semibold">{a.recovery}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {filteredActivities.length > 10 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 text-xs text-slate-500 bg-slate-50/50">
                  <div>
                    Showing <span className="font-bold text-slate-700">{(activitiesPage - 1) * 10 + 1}</span> to{" "}
                    <span className="font-bold text-slate-700">{Math.min(activitiesPage * 10, filteredActivities.length)}</span> of{" "}
                    <span className="font-bold text-slate-700">{filteredActivities.length}</span> activities
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActivitiesPage((p) => Math.max(1, p - 1))}
                      disabled={activitiesPage === 1}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </button>
                    <span className="px-2 font-mono text-xs font-medium text-slate-700">
                      Page {activitiesPage} of {Math.max(1, Math.ceil(filteredActivities.length / 10))}
                    </span>
                    <button
                      onClick={() => setActivitiesPage((p) => Math.min(Math.max(1, Math.ceil(filteredActivities.length / 10)), p + 1))}
                      disabled={activitiesPage === Math.max(1, Math.ceil(filteredActivities.length / 10))}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Cash Flow */}
          <section className="col-span-12 lg:col-span-6 flex flex-col">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-md">
                Working Capital & Velocity
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">BILLING & COLLECTION STATUS</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Bills Submitted", val: cashflow.billsSubmitted, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                { label: "Bills Approved", val: cashflow.billsApproved, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
                { label: "Outstanding Receivables", val: cashflow.outstandingReceivables, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
                { label: "Total Received", val: cashflow.totalReceived, color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl border ${c.bg} p-3.5 shadow-2xs bg-white`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{c.label}</div>
                  <div className={`font-mono text-xl font-extrabold ${c.color}`}>{c.val}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex-1 flex flex-col justify-between min-h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  MONTHLY CASH FLOW
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600" /> Cash In</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-600" /> Cash Out</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={cashChartData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `₹${v}`} axisLine={{ stroke: '#E2E8F0' }} />
                  <Tooltip formatter={(v: number, name: string) => [`₹${v} Cr`, name]} contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: "8px", fontSize: 12, color: "#0F172A", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="cashIn" name="Cash In" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cashOut" name="Cash Out" fill="#E11D48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ── Procurement Exceptions ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 rounded-md">
                Supply Chain Alert
              </span>
              <h3 className="text-base font-bold text-slate-900">Critical Procurement & Material Delays</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 rounded-full px-3 py-1">
                Critical Procurement Issues: {criticalProcurementIssues}
              </span>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1">
                {filteredProcurement.length} Total Monitored Items
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                  <tr>
                    {["MATERIAL / ITEM", "PROJECT", "DELAY", "SUPPLIER", "EXPECTED DATE", "STATUS", "ACTION"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProcurement.slice((procurementPage - 1) * 10, procurementPage * 10).map((p, i) => (
                    <tr key={`${p.material}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-900">{p.material}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{p.project}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          (p.delayDays || 0) > 14 
                            ? "bg-rose-50 text-rose-700 border border-rose-200" 
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          +{p.delayDays || 0}d
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">{p.supplier}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{p.expectedDate}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          p.status === "Escalated to PM"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (p.action === "Follow-up" && !approvedProcurement.has((procurementPage - 1) * 10 + i)) {
                              setApprovedProcurement((prev) => new Set(prev).add((procurementPage - 1) * 10 + i));
                            }
                          }}
                          disabled={p.action !== "Follow-up" || approvedProcurement.has((procurementPage - 1) * 10 + i)}
                          className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            p.action === "Follow-up"
                              ? approvedProcurement.has((procurementPage - 1) * 10 + i)
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs hover:shadow-md"
                              : "bg-slate-100 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {p.action === "Follow-up"
                            ? approvedProcurement.has((procurementPage - 1) * 10 + i)
                              ? "✓ Followed Up"
                              : "Trigger Follow-up"
                            : p.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProcurement.length > 10 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 text-xs text-slate-500 bg-slate-50/50">
                <div>
                  Showing <span className="font-bold text-slate-700">{(procurementPage - 1) * 10 + 1}</span> to{" "}
                  <span className="font-bold text-slate-700">{Math.min(procurementPage * 10, filteredProcurement.length)}</span> of{" "}
                  <span className="font-bold text-slate-700">{filteredProcurement.length}</span> items
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setProcurementPage((p) => Math.max(1, p - 1))}
                    disabled={procurementPage === 1}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <span className="px-2 font-mono text-xs font-medium text-slate-700">
                    Page {procurementPage} of {Math.max(1, Math.ceil(filteredProcurement.length / 10))}
                  </span>
                  <button
                    onClick={() => setProcurementPage((p) => Math.min(Math.max(1, Math.ceil(filteredProcurement.length / 10)), p + 1))}
                    disabled={procurementPage === Math.max(1, Math.ceil(filteredProcurement.length / 10))}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Labour + Safety ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">
          {/* Labour & Equipment */}
          <section className="col-span-12 xl:col-span-7 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-md">
                  Site Productivity & Assets
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Project-wise Equipment & Manpower Deployment</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {(data.projectWiseUsage || []).length} Active Sites
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col justify-between">
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Manpower Used</th>
                      <th className="py-3 px-4">Equipment Used</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(data.projectWiseUsage || []).map((p) => (
                      <tr key={p.projectCode} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.projectName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{p.projectCode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-blue-700 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-500" /> {p.manpowerUsed}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">Cost: {p.manpowerCost}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-emerald-700 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> {p.equipmentUsed}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">Cost: {p.equipmentCost}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active Site
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(data.projectWiseUsage || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                          No site usage records found for selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </section>

          {/* Safety & Quality */}
          <section className="col-span-12 xl:col-span-5 flex flex-col">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-md">
                HSE & Quality Assurance
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Safety Incidents & Non-Conformance Reports</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: "Lost Time Incidents", val: safety.incidents, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
                { label: "Near Miss Reports", val: safety.nearMiss, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
                { label: "Open Quality NCRs", val: safety.openNCR, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
                { label: "Rework Cost (MTD)", val: safety.reworkCost, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4 shadow-2xs bg-white`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{s.label}</div>
                  <div className={`font-mono text-2xl font-black ${s.color}`}>{s.val}</div>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 shadow-2xs flex-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {safety.ltiFreeProjects} of 14 Projects LTI-Free
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded uppercase">Gold Standard</span>
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  Portfolio achieved <strong className="text-emerald-800 font-mono font-bold">{safety.ltiFreeDays} LTI-free days</strong> on flagship projects. Strict adherence to HSE protocol across all 2,300+ workers.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── AI Decision Intelligence ─────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-widest bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1 rounded-full">
              🤖 AI Executive Advisor
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">Portfolio Health Score & Strategic Action Plan</h2>
          </div>
          <div className="bg-gradient-to-br from-violet-50/90 via-indigo-50/60 to-white border border-violet-200/80 rounded-2xl p-8 shadow-sm relative overflow-hidden">
            <div className="grid grid-cols-12 gap-8 items-center">
              {/* Score */}
              <div className="col-span-12 xl:col-span-3 flex flex-col items-center justify-center border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-8 text-center">
                <div className="text-xs font-extrabold uppercase tracking-widest text-violet-700 mb-3">Portfolio Health Index</div>
                <div className="relative flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full border-8 border-violet-200 flex items-center justify-center bg-white shadow-inner">
                    <div className="font-mono text-5xl font-black text-slate-900 leading-none">
                      {aiIntelligence.overallScore}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-sm">
                    Optimal
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-4">Out of 100 benchmark points</div>
                <div className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1 justify-center">
                  <TrendingUp className="w-3.5 h-3.5" /> +3.0 Points vs Last Month
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="col-span-12 xl:col-span-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-8">
                <div className="text-xs font-extrabold uppercase tracking-widest text-indigo-900 mb-4">
                  Multi-Factor Score Breakdown
                </div>
                <div className="space-y-3.5">
                  {aiIntelligence.breakdown.map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-slate-700 font-semibold">{b.label}</span>
                        <span className="font-mono text-xs font-bold" style={{ color: b.color }}>
                          {b.score}/100
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${b.score}%`, background: b.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Summary */}
              <div className="col-span-12 xl:col-span-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-violet-800 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-600" /> Executive AI Analysis
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {aiIntelligence.summary}
                  </p>
                </div>
                <div className="bg-white border border-indigo-200/80 rounded-xl p-4 shadow-2xs">
                  <div className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4 text-blue-600" /> Immediate MD Priority Checklist Today
                  </div>
                  <div className="text-xs text-slate-700 space-y-2 font-medium">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                      <span>Authorise emergency crane hire for NTPC Vindhyachal — <strong className="text-rose-700 font-mono font-bold">₹6.8 Cr LD risk</strong> at stake.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                      <span>Approve Tata BlueScope steel PO price escalation — unlocks 450 MT delivery for Balrampur.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                      <span>Bypass contractor &amp; release <strong className="text-emerald-700 font-mono font-bold">₹45 L direct wage disbursement</strong> to restore IFFCO labor headcount.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Executive Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-6">
            <span>
              Last Synchronised: <span className="font-mono text-slate-700 font-semibold">{ps.lastRefresh}</span>
            </span>
            <span className="hidden md:inline">ERPNext v15 · Frappe Enterprise Core</span>
            <span>
              Active Connected Leaders: <span className="font-mono text-blue-700 font-bold">14</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 font-semibold">PROJECT360 Management Command Centre</span> · Quantbit v2.4
          </div>
        </div>
      </footer>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KPI }) {
  const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    kpi.trend === "up" ? "text-emerald-600" : kpi.trend === "down" ? "text-rose-600" : "text-slate-400";
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 hover:shadow-md hover:border-slate-300 transition-all duration-300 relative overflow-hidden group"
      style={{ borderTop: `3px solid ${kpi.color}` }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 group-hover:text-slate-600 transition-colors">
        {kpi.label}
      </div>
      <div className="font-mono text-2xl font-extrabold leading-tight tracking-tight text-slate-900" style={{ color: kpi.color }}>
        {kpi.value}
      </div>
      <div className="text-[11px] text-slate-500 mt-1 font-medium">{kpi.sub}</div>
      <div className={`flex items-center gap-1 mt-2 text-[11px] font-bold ${trendColor}`}>
        <TrendIcon className="h-3.5 w-3.5" />
        <span>{kpi.trendVal}</span>
      </div>
    </div>
  );
}
