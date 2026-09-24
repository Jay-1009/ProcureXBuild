import { createLazyFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Search,
  TrendingUp,
  X,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = "Submitted" | "Certified" | "Paid";

type RaBill = {
  id: string;
  project: string;
  client: string;
  period: string;
  gross: number;
  retention: number;
  advRec: number;
  net: number;
  status: BillStatus;
  age: number;
};

type UnclaimedItem = {
  project: string;
  category: string;
  value: number;
  age: number;
};

type CashMonth = {
  month: string;
  inflow: number;
  outflow: number;
  forecast?: boolean;
};

type RetentionRow = {
  project: string;
  held: number;
  dlp: string;
  pct: number;
};

type SalesOrder = {
  id: string;
  project: string;
  customer: string;
  value: number;
  status: string;
  age: number;
};

// ─── Static data ──────────────────────────────────────────────────────────────

const RA_BILLS: RaBill[] = [
  { id: "RAB-P02-009", project: "NTPC Vindhyachal FGD", client: "NTPC Ltd", period: "Jun 2026", gross: 8.4, retention: 0.84, advRec: 0.42, net: 7.14, status: "Submitted", age: 34 },
  { id: "RAB-P03-007", project: "Balrampur Chini", client: "Balrampur Chini Mills", period: "Jun 2026", gross: 4.1, retention: 0.41, advRec: 0.20, net: 3.49, status: "Certified", age: 18 },
  { id: "RAB-P01-012", project: "Renuka Sugars Cogen", client: "Renuka Sugars", period: "Jun 2026", gross: 6.8, retention: 0.68, advRec: 0.34, net: 5.78, status: "Paid", age: 0 },
  { id: "RAB-P05-004", project: "IFFCO Phulpur", client: "IFFCO", period: "May 2026", gross: 5.2, retention: 0.52, advRec: 0.26, net: 4.42, status: "Submitted", age: 47 },
  { id: "RAB-P04-011", project: "Dalmia Bharat Cement", client: "Dalmia Bharat", period: "Jun 2026", gross: 3.6, retention: 0.36, advRec: 0.18, net: 3.06, status: "Paid", age: 0 },
  { id: "RAB-P02-008", project: "NTPC Vindhyachal FGD", client: "NTPC Ltd", period: "May 2026", gross: 7.1, retention: 0.71, advRec: 0.36, net: 6.03, status: "Paid", age: 0 },
];

const UNCLAIMED: UnclaimedItem[] = [
  { project: "NTPC Vindhyachal FGD", category: "Variation Orders (3 approved)", value: 1.82, age: 67 },
  { project: "Balrampur Chini", category: "Progress — Jul 2026 not yet billed", value: 2.9, age: 22 },
  { project: "IFFCO Phulpur", category: "Milestone — Reactor foundation (achieved)", value: 4.5, age: 41 },
  { project: "Renuka Sugars", category: "Variation Orders (1 approved)", value: 0.65, age: 19 },
];

const CASH_FLOW: CashMonth[] = [
  { month: "Feb", inflow: 12.4, outflow: 9.8 },
  { month: "Mar", inflow: 18.6, outflow: 14.2 },
  { month: "Apr", inflow: 15.1, outflow: 13.6 },
  { month: "May", inflow: 22.3, outflow: 17.4 },
  { month: "Jun", inflow: 19.8, outflow: 16.1 },
  { month: "Jul (f)", inflow: 24.5, outflow: 18.9, forecast: true },
  { month: "Aug (f)", inflow: 26.2, outflow: 19.4, forecast: true },
];

const RETENTION: RetentionRow[] = [
  { project: "Renuka Sugars Cogen", held: 3.28, dlp: "31 Mar 2028", pct: 5 },
  { project: "NTPC Vindhyachal FGD", held: 5.87, dlp: "30 Jun 2028", pct: 5 },
  { project: "Balrampur Chini", held: 2.76, dlp: "15 Dec 2027", pct: 5 },
  { project: "Dalmia Bharat", held: 2.48, dlp: "28 Feb 2027", pct: 5 },
  { project: "IFFCO Phulpur", held: 2.55, dlp: "31 Oct 2028", pct: 5 },
];

const SALES_ORDERS: SalesOrder[] = [
  { id: "SAL-ORD-2026-00004", project: "PROJ-0002", customer: "Harnai Sahakari Soot Girani Ltd", value: 420.0, status: "To Deliver and Bill", age: 88 },
  { id: "SAL-ORD-2026-00003", project: "", customer: "Harnai Sahakari Soot Girani Ltd", value: 52.5, status: "To Deliver and Bill", age: 90 },
  { id: "SAL-ORD-2026-00002", project: "", customer: "Harnai Sahakari Soot Girani Ltd", value: 52.5, status: "Completed", age: 90 },
  { id: "SAL-ORD-2026-00001", project: "", customer: "Harnai Sahakari Soot Girani Ltd", value: 105.0, status: "To Bill", age: 90 },
];

const CHART_MAX = 30;

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

type BillingData = {
  totalBilled: { value: string; sub: string; raw: number };
  pendingCert: { value: string; sub: string; raw: number; count: number; avgDays: number };
  retentionHeld: { value: string; sub: string; raw: number };
  collectionRate: { value: string; sub: string; raw: number };
  raBills: RaBill[];
  retentionList: RetentionRow[];
  cashFlow: CashMonth[];
  salesOrders?: SalesOrder[];
  projectsList?: { name: string; project_name: string }[];
  sitesList?: string[];
};

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createLazyFileRoute("/finance/billing-and-cash")({
  component: BillingAndCashPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function BillingAndCashPage() {
  const [data, setData] = useState<BillingData>({
    totalBilled: { value: "₹197 Cr", sub: "57% of contract value", raw: 197 },
    pendingCert: { value: "₹13.6 Cr", sub: "2 bills · avg 40 days", raw: 13.6, count: 2, avgDays: 40 },
    retentionHeld: { value: "₹16.4 Cr", sub: "All projects · 5% rate", raw: 16.4 },
    collectionRate: { value: "82%", sub: "Of certified amounts", raw: 82 },
    raBills: RA_BILLS,
    retentionList: RETENTION,
    cashFlow: CASH_FLOW,
    salesOrders: SALES_ORDERS,
  });

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [projectsList, setProjectsList] = useState<{ name: string; project_name: string }[]>([]);
  const [sitesList, setSitesList] = useState<string[]>([]);

  const loadData = useCallback(() => {
    const payload: Record<string, string> = {};
    if (fromDate) payload.from_date = fromDate;
    if (toDate) payload.to_date = toDate;
    if (projectFilter && projectFilter !== "all") payload.project = projectFilter;
    if (siteFilter && siteFilter !== "all") payload.site = siteFilter;

    frappePost<BillingData>("quantbit_construction_management.api.Billig and cash.get_billing_and_cash_data", payload)
      .then((res) => {
        if (res) {
          if (Array.isArray(res.projectsList)) setProjectsList(res.projectsList);
          if (Array.isArray(res.sitesList)) setSitesList(res.sitesList);
          setData((prev) => ({
            ...prev,
            totalBilled: res.totalBilled ?? prev.totalBilled,
            pendingCert: res.pendingCert ?? prev.pendingCert,
            retentionHeld: res.retentionHeld ?? prev.retentionHeld,
            collectionRate: res.collectionRate ?? prev.collectionRate,
            raBills: res.raBills ?? prev.raBills,
            retentionList: res.retentionList ?? prev.retentionList,
            cashFlow: res.cashFlow ?? prev.cashFlow,
            salesOrders:
              res.salesOrders && res.salesOrders.length > 0
                ? res.salesOrders
                : SALES_ORDERS,
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to load billing & cash data:", err);
      });
  }, [fromDate, toDate, projectFilter, siteFilter]);

  useEffect(() => {
    document.title = "Billing & Cash — CMS Finance";
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [loadData]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | BillStatus>("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cashView, setCashView] = useState<"all" | "forecast">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [soPage, setSoPage] = useState(1);
  const [retPage, setRetPage] = useState(1);
  const pageSize = 10;

  const rows = useMemo(
    () =>
      data.raBills.filter(
        (b) =>
          (statusFilter === "All" || b.status === statusFilter) &&
          (query === "" ||
            b.id.toLowerCase().includes(query.toLowerCase()) ||
            b.project.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, statusFilter, data.raBills],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const activeBill = activeId ? data.raBills.find((b) => b.id === activeId) ?? null : null;

  const totalUnclaimed = UNCLAIMED.reduce((s, u) => s + u.value, 0);
  const totalRetention = data.retentionList.reduce((s, r) => s + r.held, 0);

  const chartMonths = cashView === "forecast" ? data.cashFlow.filter((m) => m.forecast) : data.cashFlow;

  const lastHist = useMemo(
    () => data.cashFlow.filter((m) => !m.forecast).slice(-1)[0] ?? { month: "Current", inflow: 0, outflow: 0 },
    [data.cashFlow],
  );
  const netHist = lastHist.inflow - lastHist.outflow;
  const earliestRet = useMemo(
    () => data.retentionList[0] ?? { project: "None", dlp: "N/A" },
    [data.retentionList],
  );

  const soList = data.salesOrders ?? SALES_ORDERS;
  const totalSO = useMemo(() => soList.reduce((sum, s) => sum + s.value, 0), [soList]);
  const totalToBill = useMemo(() => soList.filter((s) => s.status.toLowerCase().includes("bill")).reduce((sum, s) => sum + s.value, 0), [soList]);
  const soPageSize = 5;
  const soTotalPages = Math.max(1, Math.ceil(soList.length / soPageSize));
  const currentSoPage = Math.min(soPage, soTotalPages);
  const paginatedSoList = useMemo(() => {
    const start = (currentSoPage - 1) * soPageSize;
    return soList.slice(start, start + soPageSize);
  }, [soList, currentSoPage, soPageSize]);

  const retList = data.retentionList;
  const retPageSize = 4;
  const retTotalPages = Math.max(1, Math.ceil(retList.length / retPageSize));
  const currentRetPage = Math.min(retPage, retTotalPages);
  const paginatedRetList = useMemo(() => {
    const start = (currentRetPage - 1) * retPageSize;
    return retList.slice(start, start + retPageSize);
  }, [retList, currentRetPage, retPageSize]);

  return (
    <AppShell title="Billing & Cash" breadcrumb="Finance / Billing & Cash">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Billing & cash command"
            description="Revenue tracking, collections and cash flow across all projects."
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
            <button onClick={loadData} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total billed (portfolio)" value={data.totalBilled.value} sub={data.totalBilled.sub} />
          <KpiCard label="Pending certification" value={data.pendingCert.value} sub={data.pendingCert.sub} accent="amber" />
          <KpiCard label="Unclaimed earned work" value={`₹${totalUnclaimed.toFixed(1)} Cr`} sub="Billable but not raised" accent="red" />
          <KpiCard label="Retention held" value={data.retentionHeld.value} sub={data.retentionHeld.sub} />
          <KpiCard label="Collection rate" value={data.collectionRate.value} sub={data.collectionRate.sub} accent="green" />
        </div>

        {/* ── RA bill register + bill detail ──────────────────────────────── */}
        <div
          className={`mt-6 grid grid-cols-1 gap-4 ${activeBill ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]" : ""
            }`}
        >
          {/* Register */}
          <div className="rounded-xl border border-border bg-card">
            <div className="space-y-2 border-b border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">RA bill register</h2>
                <button className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Export
                </button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search bill ID or project…"
                  className="pl-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                {(["All", "Submitted", "Certified", "Paid"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${statusFilter === s
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {activeBill ? (
              /* Compact list when detail is open */
              <ul className="max-h-[540px] overflow-y-auto">
                {paginatedRows.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => setActiveId(b.id)}
                      className={`w-full border-b border-border px-3 py-3 text-left transition-colors last:border-0 ${activeBill.id === b.id ? "bg-muted" : "hover:bg-muted/40"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-foreground">{b.id}</span>
                        <BillStatusBadge status={b.status} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{b.project}</div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{b.period}</span>
                        <span className="font-mono font-semibold text-foreground">₹{b.net.toFixed(1)} Cr</span>
                      </div>
                    </button>
                  </li>
                ))}
                {rows.length === 0 && (
                  <li className="px-4 py-12 text-center text-sm text-muted-foreground">No bills match.</li>
                )}
              </ul>
            ) : (
              /* Full table when no detail open */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {["Bill No.", "Project", "Period", "Gross (Cr)", "Net (Cr)", "Status", "Age"].map((col) => (
                        <th key={col} className="px-4 py-2.5 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => setActiveId(b.id)}
                        className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{b.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{b.project}</div>
                          <div className="text-[11px] text-muted-foreground">{b.client}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.period}</td>
                        <td className="px-4 py-3 font-mono text-foreground">₹{b.gross.toFixed(1)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">₹{b.net.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <BillStatusBadge status={b.status} />
                        </td>
                        <td className="px-4 py-3">
                          {b.status === "Paid" ? (
                            <span className="text-[11px] text-success">Settled</span>
                          ) : (
                            <span
                              className={`font-mono text-[11px] font-semibold ${b.age > 30 ? "text-destructive" : "text-warning"
                                }`}
                            >
                              {b.age}d
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          No bills match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {rows.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <div>
                  Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * pageSize, rows.length)}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{rows.length}</span> bills
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 font-medium text-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bill detail panel */}
          {activeBill && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {activeBill.id}
                  </div>
                  <div className="mt-0.5 text-base font-semibold text-foreground">{activeBill.project}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <BillStatusBadge status={activeBill.status} />
                    <span>{activeBill.client} · {activeBill.period}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveId(null)}
                  aria-label="Close bill detail"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Gross amount", value: `₹${activeBill.gross.toFixed(2)} Cr` },
                  { label: "Retention (10%)", value: `₹${activeBill.retention.toFixed(2)} Cr` },
                  { label: "Advance recovery", value: `₹${activeBill.advRec.toFixed(2)} Cr` },
                  { label: "Net certified", value: `₹${activeBill.net.toFixed(2)} Cr` },
                ].map(({ label, value }) => (
                  <InfoCell key={label} label={label} value={value} />
                ))}
              </div>

              {/* Payment progress */}
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment progress
                </div>
                <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {activeBill.status === "Paid"
                      ? "100% paid"
                      : activeBill.status === "Certified"
                        ? "Awaiting payment"
                        : `${activeBill.age} days pending`}
                  </span>
                  <span className={activeBill.age > 30 && activeBill.status !== "Paid" ? "font-semibold text-destructive" : ""}>
                    {activeBill.status === "Paid"
                      ? "Settled"
                      : `₹${activeBill.net.toFixed(1)} Cr outstanding`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all ${activeBill.status === "Paid" ? "bg-success" : "bg-border"
                      }`}
                    style={{ width: activeBill.status === "Paid" ? "100%" : "0%" }}
                  />
                </div>
              </div>

              {/* Overdue banner */}
              {activeBill.age > 30 && activeBill.status !== "Paid" && (
                <div className="mt-4 flex gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <p className="text-[11px] text-destructive">
                    Bill overdue by {activeBill.age - 30} days. Recommend escalation to client finance team.
                  </p>
                </div>
              )}

              <button className="mt-5 w-full rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                View in ERPNext →
              </button>
            </div>
          )}
        </div>

        {/* ── Unclaimed work + Variation orders ───────────────────────────── */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {/* Unclaimed */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold text-foreground">Unclaimed earned work</h2>
              <span className="ml-auto text-xs font-semibold text-destructive">
                ₹{totalUnclaimed.toFixed(1)} Cr total
              </span>
            </div>
            <p className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
              Physical progress completed but not yet billed. Each day of delay = cost of capital.
            </p>
            <ul className="divide-y divide-border">
              {UNCLAIMED.map((u, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{u.project}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{u.category}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-destructive">₹{u.value.toFixed(2)} Cr</div>
                      <div className="text-[11px] text-warning">{u.age}d unbilled</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Sales order & invoice pipeline */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Sales order & invoice pipeline</h2>
              <button className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {["Document Number", "Project", "Customer", "Value (Cr)", "Status", "Age"].map((col) => (
                      <th key={col} className="px-4 py-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSoList.map((so) => (
                    <tr
                      key={so.id}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{so.id}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{so.project}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{so.customer}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">₹{so.value.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <SOStatusBadge status={so.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[11px] font-semibold ${so.age > 60
                              ? "text-destructive"
                              : so.age > 30
                                ? "text-warning"
                                : "text-muted-foreground"
                            }`}
                        >
                          {so.age}d
                        </span>
                      </td>
                    </tr>
                  ))}
                  {soList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No active sales orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Total in pipeline:{" "}
                  <span className="font-semibold text-foreground">₹{totalSO.toFixed(2)} Cr</span>
                </span>
                <span>
                  To be billed:{" "}
                  <span className="font-semibold text-warning">₹{totalToBill.toFixed(2)} Cr</span>
                </span>
              </div>
              {soTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSoPage((p) => Math.max(1, p - 1))}
                    disabled={currentSoPage === 1}
                    className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="px-2 font-medium text-foreground">
                    Page {currentSoPage} of {soTotalPages}
                  </span>
                  <button
                    onClick={() => setSoPage((p) => Math.min(soTotalPages, p + 1))}
                    disabled={currentSoPage === soTotalPages}
                    className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Cash flow chart + Retention ledger ──────────────────────────── */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          {/* Cash flow */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-foreground">13-week cash flow view</h2>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                {(["all", "forecast"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCashView(v)}
                    className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${cashView === v
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {v === "all" ? "All" : "Forecast only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mb-5 flex gap-5">
              {[
                { label: "Inflow (certified + collected)", color: "bg-blue-500" },
                { label: "Outflow (payments due)", color: "bg-border" },
                { label: "Forecast", color: "bg-blue-500/30" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-sm ${l.color}`} />
                  <span className="text-[11px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="flex h-40 items-end gap-2">
              {chartMonths.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end gap-0.5">
                    <div
                      className={`flex-1 rounded-t-sm transition-all ${m.forecast ? "bg-blue-500/30" : "bg-blue-500"
                        }`}
                      style={{ height: `${(m.inflow / CHART_MAX) * 140}px` }}
                      title={`Inflow: ₹${m.inflow} Cr`}
                    />
                    <div
                      className={`flex-1 rounded-t-sm transition-all ${m.forecast ? "bg-border/60" : "bg-border"
                        }`}
                      style={{ height: `${(m.outflow / CHART_MAX) * 140}px` }}
                      title={`Outflow: ₹${m.outflow} Cr`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
              <InfoCell label={`${lastHist.month} inflow`} value={`₹${lastHist.inflow.toFixed(2)} Cr`} />
              <InfoCell label={`${lastHist.month} outflow`} value={`₹${lastHist.outflow.toFixed(2)} Cr`} />
              <InfoCell label={`Net ${lastHist.month} position`} value={`${netHist >= 0 ? "+" : ""}₹${netHist.toFixed(2)} Cr`} />
            </div>
          </div>

          {/* Retention ledger */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Retention ledger</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Retention held by clients. Release on DLP expiry.{" "}
                <span className="font-semibold text-foreground">
                  Total locked: ₹{totalRetention.toFixed(2)} Cr
                </span>
              </p>
            </div>

            <ul className="divide-y divide-border">
              {paginatedRetList.map((r, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                      {r.project}
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-foreground">
                      ₹{r.held.toFixed(2)} Cr
                    </div>
                  </div>
                  <div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>DLP: {r.dlp}</span>
                    <span>{r.pct}% rate</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40 transition-all"
                      style={{ width: `${totalRetention > 0 ? (r.held / totalRetention) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {retTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                <span>
                  Showing {paginatedRetList.length} of {retList.length} projects
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRetPage((p) => Math.max(1, p - 1))}
                    disabled={currentRetPage === 1}
                    className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="px-2 font-medium text-foreground">
                    Page {currentRetPage} of {retTotalPages}
                  </span>
                  <button
                    onClick={() => setRetPage((p) => Math.min(retTotalPages, p + 1))}
                    disabled={currentRetPage === retTotalPages}
                    className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            <div className="m-4 rounded-lg border border-warning/20 bg-warning/10 p-3">
              <p className="text-[11px] font-semibold text-warning">
                Earliest release: {earliestRet.project} — {earliestRet.dlp}
              </p>
              <p className="mt-0.5 text-[11px] text-warning/80">
                Ensure DLP snag list closure 60 days before DLP date.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground/60">
          Sourced from CMS RA Bill · Variation Order · ERPNext GL DocTypes · Refresh every 15 min
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
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function BillStatusBadge({ status }: { status: BillStatus }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "Paid"
          ? "border-success/30 bg-success/10 text-success"
          : status === "Certified"
            ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
            : "border-warning/30 bg-warning/10 text-warning"
      }
    >
      {status}
    </Badge>
  );
}

function SOStatusBadge({ status }: { status: string }) {
  const isGreen = status === "Completed" || status === "Fully Billed" || status === "Approved";
  const isRed = status === "Cancelled" || status === "Closed" || status === "Disputed";
  return (
    <Badge
      variant="outline"
      className={
        isGreen
          ? "border-success/30 bg-success/10 text-success"
          : isRed
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-blue-500/30 bg-blue-500/10 text-blue-600"
      }
    >
      {status}
    </Badge>
  );
}