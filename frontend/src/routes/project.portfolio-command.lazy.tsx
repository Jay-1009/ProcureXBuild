import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type Health = "On Track" | "At Risk" | "Critical";

type Project = {
  id: string;
  name: string;
  type: string;
  client: string;
  value: string;
  billed: number;
  billed_amount?: number;
  health: Health;
  cpi: number;
  spi: number;
  complete: number;
  openRfi: number;
  openNcr: number;
  ltiDays: number;
  pm: string;
  pv?: number;
  ev?: number;
  ac?: number;
};

type Alert = {
  id: number;
  severity: "High" | "Medium" | "Low";
  project: string;
  message: string;
  age: string;
  owner: string;
};

type Milestone = {
  project: string;
  name: string;
  forecast: string;
  delay: number;
  risk: "red" | "amber" | "green";
};

type ResourceConflict = {
  type: string;
  conflict: string;
};

// ─── Static data ──────────────────────────────────────────────────────────────

const PROJECTS: Project[] = [
  {
    id: "P01",
    name: "Renuka Sugars Cogen",
    type: "Sugar / Cogen Power",
    client: "Renuka Sugars Ltd",
    value: "₹48.2 Cr",
    billed: 68,
    health: "On Track",
    cpi: 1.04,
    spi: 0.98,
    complete: 71,
    openRfi: 4,
    openNcr: 2,
    ltiDays: 142,
    pm: "R. Hegde",
  },
  {
    id: "P02",
    name: "NTPC Vindhyachal FGD",
    type: "Thermal Power BoP",
    client: "NTPC Limited",
    value: "₹112.6 Cr",
    billed: 52,
    health: "At Risk",
    cpi: 0.91,
    spi: 0.84,
    complete: 48,
    openRfi: 11,
    openNcr: 6,
    ltiDays: 89,
    pm: "S. Patil",
  },
  {
    id: "P03",
    name: "Balrampur Chini Distillery",
    type: "Sugar / Distillery / Ethanol",
    client: "Balrampur Chini Mills",
    value: "₹67.4 Cr",
    billed: 41,
    health: "Critical",
    cpi: 0.86,
    spi: 0.79,
    complete: 38,
    openRfi: 9,
    openNcr: 12,
    ltiDays: 31,
    pm: "M. Tripathi",
  },
  {
    id: "P04",
    name: "Dalmia Bharat Cement",
    type: "Cement Plant Expansion",
    client: "Dalmia Bharat Ltd",
    value: "₹29.8 Cr",
    billed: 83,
    health: "On Track",
    cpi: 1.09,
    spi: 1.02,
    complete: 87,
    openRfi: 2,
    openNcr: 1,
    ltiDays: 218,
    pm: "A. Sharma",
  },
  {
    id: "P05",
    name: "IFFCO Phulpur Ammonia",
    type: "Fertiliser / Process Plant",
    client: "IFFCO",
    value: "₹88.1 Cr",
    billed: 29,
    health: "At Risk",
    cpi: 0.94,
    spi: 0.88,
    complete: 26,
    openRfi: 7,
    openNcr: 4,
    ltiDays: 64,
    pm: "V. Nair",
  },
];

const ALERTS: Alert[] = [
  {
    id: 1,
    severity: "High",
    project: "Balrampur Chini Distillery",
    owner: "M. Tripathi",
    age: "3d",
    message:
      "CPI at 0.86 — cost overrun trajectory confirmed. 12 open NCRs including 4 critical SS weld defects.",
  },
  {
    id: 2,
    severity: "High",
    project: "NTPC Vindhyachal FGD",
    owner: "S. Patil",
    age: "1d",
    message:
      "Schedule slippage 16% — SPI 0.84. Critical path delay: FGD absorber erection behind by 18 days.",
  },
  {
    id: 3,
    severity: "Medium",
    project: "IFFCO Phulpur",
    owner: "Procurement",
    age: "2d",
    message:
      "3 materials on critical path not yet ordered. Ammonia compressor delivery lead time: 14 weeks.",
  },
  {
    id: 4,
    severity: "Medium",
    project: "NTPC Vindhyachal FGD",
    owner: "S. Patil",
    age: "5d",
    message:
      "RA Bill #7 (₹8.4 Cr) pending client certification for 34 days. Escalation required.",
  },
  {
    id: 5,
    severity: "Low",
    project: "IFFCO Phulpur",
    owner: "HSE",
    age: "1d",
    message: "PTW-042 (Hot Work — Reactor area) expires in 2 days. Renewal in progress.",
  },
];

const MILESTONES: Milestone[] = [
  { project: "Balrampur Chini", name: "Distillation column erection", forecast: "02 Sep", delay: 18, risk: "red" },
  { project: "NTPC Vindhyachal", name: "FGD absorber hydro test", forecast: "08 Sep", delay: 17, risk: "red" },
  { project: "IFFCO Phulpur", name: "Ammonia compressor FAT", forecast: "18 Sep", delay: 8, risk: "amber" },
  { project: "Renuka Sugars", name: "Steam turbine commissioning", forecast: "07 Sep", delay: 2, risk: "amber" },
  { project: "Dalmia Bharat", name: "Kiln refractory lining", forecast: "28 Jul", delay: 0, risk: "green" },
];

const RESOURCE_CONFLICTS: ResourceConflict[] = [
  { type: "Liebherr LTM 1200 Crane", conflict: "Also scheduled for IFFCO Phulpur 12–20 Aug" },
  { type: "Sr. Mechanical Engineer — V. Reddy", conflict: "Allocated 100% to both from 1 Aug" },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createLazyFileRoute("/project/portfolio-command")({
  component: PortfolioCommandPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function PortfolioCommandPage() {
  useEffect(() => {
    document.title = "Portfolio Command Centre — CMS";
  }, []);

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>("p1");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");

  const [projectsList, setProjectsList] = useState<{ name: string; project_name: string }[]>([]);
  const [sitesList, setSitesList] = useState<string[]>([]);

  const [totalContractValue, setTotalContractValue] = useState<string>("₹346 Cr");
  const [billedToDate, setBilledToDate] = useState<string>("₹197 Cr");
  const [activeProjectsCount, setActiveProjectsCount] = useState<number>(5);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [alertsPage, setAlertsPage] = useState<number>(1);
  const [milestonesPage, setMilestonesPage] = useState<number>(1);
  const [conflictsPage, setConflictsPage] = useState<number>(1);
  const [evmPage, setEvmPage] = useState<number>(1);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const payload: Record<string, any> = {};
        if (fromDate) payload.from_date = fromDate;
        if (toDate) payload.to_date = toDate;
        if (projectFilter && projectFilter !== "all") payload.project = projectFilter;
        if (siteFilter && siteFilter !== "all") payload.site = siteFilter;

        const res = await fetch("/api/method/quantbit_construction_management.api.portfolio_command_centre.get_dashboard_numbers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.message) {
            const formatCr = (val: number) => `₹${(val / 10000000).toFixed(2)} Cr`;
            setTotalContractValue(formatCr(data.message.total_contract_value || 0));
            setBilledToDate(formatCr(data.message.billed_to_date || 0));
            if (typeof data.message.active_projects_count === "number") {
              setActiveProjectsCount(data.message.active_projects_count);
            }
            if (Array.isArray(data.message.projects_list)) {
              setProjectsList(data.message.projects_list);
            }
            if (Array.isArray(data.message.sites_list)) {
              setSitesList(data.message.sites_list);
            }
            if (Array.isArray(data.message.matrix_projects)) {
              setProjects(data.message.matrix_projects);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard numbers:", err);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [fromDate, toDate, projectFilter, siteFilter, refreshKey]);

  const rows = useMemo(
    () =>
      projects.filter(
        (p) =>
          (query === "" ||
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.client.toLowerCase().includes(query.toLowerCase()) ||
            p.pm.toLowerCase().includes(query.toLowerCase())) &&
          (projectFilter === "all" ||
            p.id === projectFilter ||
            p.name.toLowerCase() === projectFilter.toLowerCase() ||
            projectsList.some(
              (pl) =>
                pl.name === projectFilter &&
                pl.project_name.toLowerCase() === p.name.toLowerCase()
            )),
      ),
    [query, projectFilter, projectsList, projects],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / 10));
  const paginatedRows = useMemo(
    () => rows.slice((currentPage - 1) * 10, currentPage * 10),
    [rows, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
    setAlertsPage(1);
    setMilestonesPage(1);
    setConflictsPage(1);
    setEvmPage(1);
  }, [query, projectFilter, siteFilter, fromDate, toDate]);

  const filteredAlerts = useMemo(() => {
    if (projectFilter === "all") return ALERTS;
    const proj = projectsList.find((pl) => pl.name === projectFilter);
    const nameToMatch = proj ? proj.project_name : projectFilter;
    return ALERTS.filter(
      (a) =>
        a.project.toLowerCase().includes(nameToMatch.toLowerCase()) ||
        nameToMatch.toLowerCase().includes(a.project.toLowerCase()) ||
        a.project === projectFilter
    );
  }, [projectFilter, projectsList]);

  const filteredMilestones = useMemo(() => {
    if (projectFilter === "all") return MILESTONES;
    const proj = projectsList.find((pl) => pl.name === projectFilter);
    const nameToMatch = proj ? proj.project_name : projectFilter;
    return MILESTONES.filter(
      (m) =>
        m.project.toLowerCase().includes(nameToMatch.toLowerCase()) ||
        nameToMatch.toLowerCase().includes(m.project.toLowerCase()) ||
        m.project === projectFilter
    );
  }, [projectFilter, projectsList]);

  const paginatedAlerts = useMemo(
    () => filteredAlerts.slice((alertsPage - 1) * 10, alertsPage * 10),
    [filteredAlerts, alertsPage]
  );
  const paginatedMilestones = useMemo(
    () => filteredMilestones.slice((milestonesPage - 1) * 10, milestonesPage * 10),
    [filteredMilestones, milestonesPage]
  );
  const paginatedConflicts = useMemo(
    () => RESOURCE_CONFLICTS.slice((conflictsPage - 1) * 10, conflictsPage * 10),
    [conflictsPage]
  );
  const paginatedEvmRows = useMemo(
    () => rows.slice((evmPage - 1) * 10, evmPage * 10),
    [rows, evmPage]
  );

  const activeProject = activeId ? projects.find((p) => p.id === activeId) ?? projects[0] ?? null : projects[0] ?? null;

  const {
    portfolioCpiVal,
    portfolioCpiSub,
    portfolioCpiAccent,
    totalOpenNcrsVal,
    totalOpenNcrsSub,
    totalOpenNcrsAccent,
    shortestLtiVal,
    shortestLtiSub,
    shortestLtiAccent,
  } = useMemo(() => {
    if (rows.length === 0) {
      return {
        portfolioCpiVal: "1.00",
        portfolioCpiSub: "No projects",
        portfolioCpiAccent: "green" as const,
        totalOpenNcrsVal: "0",
        totalOpenNcrsSub: "No active NCRs",
        totalOpenNcrsAccent: "green" as const,
        shortestLtiVal: "0d",
        shortestLtiSub: "No projects",
        shortestLtiAccent: "green" as const,
      };
    }

    const sumEv = rows.reduce((acc, p) => acc + (p.ev !== undefined ? p.ev : p.complete), 0);
    const sumAc = rows.reduce((acc, p) => acc + (p.ac !== undefined ? p.ac : (p.cpi > 0 ? p.complete / p.cpi : p.complete)), 0);
    const cpiNum = sumAc > 0 ? sumEv / sumAc : rows.reduce((acc, p) => acc + p.cpi, 0) / rows.length;
    const portfolioCpiVal = cpiNum.toFixed(2);
    const portfolioCpiAccent = cpiNum >= 1.0 ? ("green" as const) : cpiNum >= 0.9 ? ("amber" as const) : ("red" as const);
    const portfolioCpiSub = cpiNum >= 1.0 ? "On target or under budget" : cpiNum >= 0.9 ? "Slight adverse trend" : "Cost overrun detected";

    const ncrSum = rows.reduce((acc, p) => acc + p.openNcr, 0);
    const projWithNcrCount = rows.filter((p) => p.openNcr > 0).length;
    const totalOpenNcrsVal = String(ncrSum);
    const totalOpenNcrsSub = projWithNcrCount === 0 ? "All quality clear" : `${projWithNcrCount} project${projWithNcrCount === 1 ? "" : "s"} with NCRs`;
    const totalOpenNcrsAccent = ncrSum === 0 ? ("green" as const) : ncrSum <= 10 ? ("amber" as const) : ("red" as const);

    const minLtiProj = rows.reduce((min, p) => (p.ltiDays < min.ltiDays ? p : min), rows[0]);
    const shortestLtiVal = `${minLtiProj.ltiDays}d`;
    const shortestLtiSub = minLtiProj.name;
    const shortestLtiAccent = minLtiProj.ltiDays < 60 ? ("amber" as const) : ("green" as const);

    return {
      portfolioCpiVal,
      portfolioCpiSub,
      portfolioCpiAccent,
      totalOpenNcrsVal,
      totalOpenNcrsSub,
      totalOpenNcrsAccent,
      shortestLtiVal,
      shortestLtiSub,
      shortestLtiAccent,
    };
  }, [rows]);

  return (
    <AppShell title="Portfolio Command Centre" breadcrumb="Projects / Portfolio Command">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PageHeader
            title="Portfolio command centre"
            description={`Live across ${activeProjectsCount} active projects · Last synced 4 min ago`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs">
              <span className="text-muted-foreground font-medium">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none"
              />
              <span className="text-muted-foreground font-medium ml-1">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 w-[180px] text-xs bg-card">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectsList.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.project_name} ({p.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs bg-card">
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
            {(fromDate || toDate || projectFilter !== "all" || siteFilter !== "all") && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setProjectFilter("all");
                  setSiteFilter("all");
                }}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total contract value" value={totalContractValue} sub={`${activeProjectsCount} active projects`} />
          <KpiCard label="Billed to date" value={billedToDate} sub="57% of portfolio" />
          <KpiCard label="Collected" value="₹161 Cr" sub="82% of billed" />
          <KpiCard label="Portfolio CPI" value={portfolioCpiVal} sub={portfolioCpiSub} accent={portfolioCpiAccent} />
          <KpiCard label="Open NCRs" value={totalOpenNcrsVal} sub={totalOpenNcrsSub} accent={totalOpenNcrsAccent} />
          <KpiCard label="LTI-free (shortest)" value={shortestLtiVal} sub={shortestLtiSub} accent={shortestLtiAccent} />
        </div>

        {/* ── Health matrix + detail panel ────────────────────────────────── */}
        <div
          className={`mt-6 grid grid-cols-1 gap-4 ${activeProject ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]" : ""
            }`}
        >
          {/* Health matrix */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-sm font-semibold text-foreground">Project health matrix</h2>
              <div className="relative w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search project or PM…"
                  className="pl-8 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {["Project", "Health", "Complete", "CPI", "SPI", "Billed %", "RFIs", "NCRs", "LTI-free", "PM"].map(
                      (col) => (
                        <th key={col} className="px-4 py-2.5 whitespace-nowrap">
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setActiveId(p.id)}
                      className={`cursor-pointer border-b border-border last:border-0 transition-colors ${activeProject?.id === p.id ? "bg-muted" : "hover:bg-muted/40"
                        }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{p.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <HealthBadge health={p.health} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MiniBar value={p.complete} color={healthBarColor(p.health)} />
                          <span className="text-[11px] font-mono text-foreground">{p.complete}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm font-medium ${cpiColor(p.cpi)}`}>
                          {p.cpi.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm font-medium ${spiColor(p.spi)}`}>
                          {p.spi.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          title={
                            p.billed_amount !== undefined
                              ? `RA Billing Amount: ₹${p.billed_amount.toLocaleString("en-IN")}`
                              : undefined
                          }
                        >
                          <MiniBar value={p.billed} color="bg-blue-500" />
                          <span className="text-[11px] font-mono text-foreground">{p.billed}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{p.openRfi}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-sm ${p.openNcr > 8 ? "font-semibold text-destructive" : "text-muted-foreground"
                            }`}
                        >
                          {p.openNcr}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-sm ${p.ltiDays < 60 ? "text-warning" : "text-success"
                            }`}
                        >
                          {p.ltiDays}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.pm}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No projects match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <ListPagination
              total={rows.length}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemLabel="projects"
            />
          </div>

          {/* Project detail panel */}
          {activeProject && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Selected project
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground tracking-tight">{activeProject.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground font-medium">
                    {activeProject.client} · {activeProject.value}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <HealthBadge health={activeProject.health} />
                  <button
                    onClick={() => setActiveId(null)}
                    aria-label="Close project detail"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Physical complete", value: `${activeProject.complete}%` },
                  {
                    label: "Billed",
                    value: `${activeProject.billed}%`,
                  },
                  { label: "CPI", value: activeProject.cpi.toFixed(2) },
                  { label: "SPI", value: activeProject.spi.toFixed(2) },
                  { label: "Open RFIs", value: String(activeProject.openRfi) },
                  { label: "Open NCRs", value: String(activeProject.openNcr) },
                ].map(({ label, value }) => (
                  <InfoCell key={label} label={label} value={value} />
                ))}
              </div>

              {/* EVM snapshot */}
              <div className="mt-6">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  EVM snapshot
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "Planned value (PV)",
                      pct:
                        activeProject.spi < 1
                          ? Math.round(activeProject.complete / activeProject.spi)
                          : activeProject.complete,
                      color: "bg-muted-foreground/40",
                    },
                    { label: "Earned value (EV)", pct: activeProject.complete, color: "bg-blue-500" },
                    {
                      label: "Actual cost (AC)",
                      pct: Math.round(activeProject.complete / activeProject.cpi),
                      color: activeProject.cpi < 1 ? "bg-destructive" : "bg-success",
                    },
                  ].map(({ label, pct, color }) => (
                    <div key={label}>
                      <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                        <span>{label}</span>
                        <span className="font-mono font-bold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/project/project-360"
                className="mt-6 block w-full text-center rounded-lg border border-border py-2.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-border/80 shadow-2xs"
              >
                View full Project 360 →
              </Link>
            </div>
          )}
        </div>

        {/* ── Alerts + Milestones + Conflicts ─────────────────────────────── */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          {/* Critical alerts */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Critical alerts — action required</h2>
            </div>
            <ul className="divide-y divide-border">
              {paginatedAlerts.map((alert) => (
                <li key={alert.id} className="flex gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0">
                    <AlertTriangle
                      className={`h-4 w-4 ${alert.severity === "High"
                          ? "text-destructive"
                          : alert.severity === "Medium"
                            ? "text-warning"
                            : "text-muted-foreground"
                        }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[11px] font-semibold text-muted-foreground">
                        {alert.project}
                      </span>
                      <SeverityBadge severity={alert.severity} />
                    </div>
                    <p className="mt-0.5 text-xs text-foreground">{alert.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Owner: {alert.owner} · {alert.age} ago
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <ListPagination
              total={filteredAlerts.length}
              currentPage={alertsPage}
              onPageChange={setAlertsPage}
              itemLabel="alerts"
            />
          </div>

          {/* Right column: milestones + conflicts */}
          <div className="flex flex-col gap-4">
            {/* Milestones */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Milestones at risk — next 30 days</h2>
              </div>
              <ul className="divide-y divide-border">
                {paginatedMilestones.map((m, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3">
                    <RiskDot risk={m.risk} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">{m.project}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-mono text-muted-foreground">{m.forecast}</div>
                      {m.delay > 0 && (
                        <div className="text-[11px] font-semibold text-destructive">+{m.delay}d</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <ListPagination
                total={filteredMilestones.length}
                currentPage={milestonesPage}
                onPageChange={setMilestonesPage}
                itemLabel="milestones"
              />
            </div>

            {/* Resource conflicts */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Wrench className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-semibold text-foreground">Resource conflicts</h2>
              </div>
              <div className="divide-y divide-border">
                {paginatedConflicts.map((rc, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="text-xs font-medium text-foreground">{rc.type}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{rc.conflict}</div>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-4 py-3">
                  <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    2 conflicts detected across {activeProjectsCount} projects
                  </span>
                </div>
              </div>
              <ListPagination
                total={RESOURCE_CONFLICTS.length}
                currentPage={conflictsPage}
                onPageChange={setConflictsPage}
                itemLabel="conflicts"
              />
            </div>
          </div>
        </div>

        {/* ── Portfolio EVM chart ─────────────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Portfolio EVM — budget vs earned vs actual cost
          </h2>
          <div className="mb-4 flex gap-5">
            {[
              { label: "Planned value", color: "bg-muted-foreground/40" },
              { label: "Earned value", color: "bg-blue-500" },
              { label: "Actual cost", color: "bg-destructive" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-sm ${l.color}`} />
                <span className="text-[11px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-5">
            {paginatedEvmRows.map((p) => {
              const pv = p.pv !== undefined ? p.pv : (p.spi < 1 ? Math.round(p.complete / p.spi) : p.complete);
              const ev = p.ev !== undefined ? p.ev : p.complete;
              const ac = p.ac !== undefined ? p.ac : Math.round(p.complete / p.cpi);
              const maxVal = Math.max(pv, ev, ac, 1);

              const formatVal = (val: number) => {
                if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
                if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
                if (val >= 1000) return `₹${val.toLocaleString()}`;
                if (val > 0 && val < 1000) return `${val.toFixed(0)}`;
                return `0`;
              };

              const bars = [
                { label: `PV ${formatVal(pv)}`, pct: Math.min(100, Math.round((pv / maxVal) * 100)), color: "bg-muted-foreground/40" },
                { label: `EV ${formatVal(ev)}`, pct: Math.min(100, Math.round((ev / maxVal) * 100)), color: "bg-blue-500" },
                { label: `AC ${formatVal(ac)}`, pct: Math.min(100, Math.round((ac / maxVal) * 100)), color: ac > ev ? "bg-destructive" : "bg-success" },
              ];

              return (
                <div key={p.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{p.name}</span>
                    <div className="flex gap-4">
                      <span className="text-[10px] font-mono text-muted-foreground">CPI {p.cpi.toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">SPI {p.spi.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {bars.map((bar) => (
                      <div key={bar.label} className="flex items-center gap-3">
                        <span className="min-w-24 text-right text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          {bar.label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                          <div
                            className={`h-full rounded-full ${bar.color}`}
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 -mx-5 -mb-5">
            <ListPagination
              total={rows.length}
              currentPage={evmPage}
              onPageChange={setEvmPage}
              itemLabel="projects"
            />
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground/60">
          Data sourced from Frappe / ERPNext · CMS DocTypes · Scheduled refresh every 15 min
        </p>
      </main>
    </AppShell>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "red" | "amber" | "green";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tracking-tight ${accent === "red"
            ? "text-destructive"
            : accent === "amber"
              ? "text-warning"
              : accent === "green"
                ? "text-success"
                : "text-foreground"
          }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/80 p-3.5 shadow-2xs transition-all hover:bg-surface">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-extrabold font-mono text-foreground tracking-tight">{value}</div>
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function HealthBadge({ health }: { health: Health }) {
  return (
    <Badge
      variant="outline"
      className={
        health === "On Track"
          ? "border-success/30 bg-success/10 text-success"
          : health === "At Risk"
            ? "border-warning/30 bg-warning/10 text-warning"
            : "border-destructive/30 bg-destructive/10 text-destructive"
      }
    >
      {health}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: Alert["severity"] }) {
  return (
    <Badge
      variant="outline"
      className={
        severity === "High"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : severity === "Medium"
            ? "border-warning/30 bg-warning/10 text-warning"
            : "border-border bg-muted text-muted-foreground"
      }
    >
      {severity}
    </Badge>
  );
}

function RiskDot({ risk }: { risk: Milestone["risk"] }) {
  return (
    <div
      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${risk === "red" ? "bg-destructive" : risk === "amber" ? "bg-warning" : "bg-success"
        }`}
    />
  );
}

function ListPagination({
  total,
  currentPage,
  onPageChange,
  limit = 10,
  itemLabel = "items",
}: {
  total: number;
  currentPage: number;
  onPageChange: Dispatch<SetStateAction<number>>;
  limit?: number;
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total <= 0) return null;
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <div>
        Showing <span className="font-medium text-foreground">{(currentPage - 1) * limit + 1}</span> to{" "}
        <span className="font-medium text-foreground">{Math.min(currentPage * limit, total)}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> {itemLabel}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="px-2 font-mono text-xs">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted transition-colors cursor-pointer"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function healthBarColor(health: Health): string {
  if (health === "On Track") return "bg-success";
  if (health === "At Risk") return "bg-warning";
  return "bg-destructive";
}

function cpiColor(cpi: number): string {
  if (cpi >= 1) return "text-success";
  if (cpi >= 0.9) return "text-warning";
  return "text-destructive";
}

function spiColor(spi: number): string {
  if (spi >= 1) return "text-success";
  if (spi >= 0.85) return "text-warning";
  return "text-destructive";
}