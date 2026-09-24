import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldAlert,
  PackageSearch,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppShell, PageHeader } from "./AppShell";
import { Link } from "@tanstack/react-router";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

/* ---------- shared atoms ---------- */

function NewTag() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-info/30 bg-info/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-info">
      New
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

/* ---------- top nav ---------- */

/* ---------- KPI cards ---------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.02)] ${className}`}
    >
      {children}
    </div>
  );
}

function SpendSparkline() {
  const pts = [8, 12, 9, 14, 11, 16, 15, 18, 17, 22, 24, 28];
  const w = 140;
  const h = 44;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const step = w / (pts.length - 1);
  const norm = (v: number) => h - ((v - min) / (max - min)) * h;
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${norm(v)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.15 155)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.68 0.15 155)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path
        d={line}
        fill="none"
        stroke="oklch(0.62 0.16 155)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Donut({ suppliers, metrics }: { suppliers: any[]; metrics: any }) {
  const total = metrics ? metrics.total_count : suppliers.length;
  const approved = metrics ? metrics.approved_count : suppliers.filter((s: any) => s.status === "Approved").length;
  const pending = metrics ? metrics.pending_count : suppliers.filter((s: any) => s.status === "Pending").length;
  const delisted = metrics ? metrics.delisted_count : suppliers.filter((s: any) => s.status === "De-listed").length;

  const approvedPct = total ? Math.round((approved / total) * 100) : 62;
  const pendingPct = total ? Math.round((pending / total) * 100) : 24;
  const delistedPct = total ? Math.max(0, 100 - approvedPct - pendingPct) : 14;

  const r = 26;
  const c = 2 * Math.PI * r;
  const seg = (pct: number) => (pct / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 70 70" className="h-20 w-20 -rotate-90">
        <circle cx="35" cy="35" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="8" />
        <circle
          cx="35"
          cy="35"
          r={r}
          fill="none"
          stroke="oklch(0.68 0.15 155)"
          strokeWidth="8"
          strokeDasharray={`${seg(approvedPct)} ${c}`}
        />
        <circle
          cx="35"
          cy="35"
          r={r}
          fill="none"
          stroke="oklch(0.78 0.16 75)"
          strokeWidth="8"
          strokeDasharray={`${seg(pendingPct)} ${c}`}
          strokeDashoffset={-seg(approvedPct)}
        />
        <circle
          cx="35"
          cy="35"
          r={r}
          fill="none"
          stroke="oklch(0.62 0.2 25)"
          strokeWidth="8"
          strokeDasharray={`${seg(delistedPct)} ${c}`}
          strokeDashoffset={-seg(approvedPct + pendingPct)}
        />
      </svg>
      <div className="space-y-1.5 text-xs">
        <LegendDot color="oklch(0.68 0.15 155)" label="Approved" value={`${approvedPct}%`} />
        <LegendDot color="oklch(0.78 0.16 75)" label="Pending" value={`${pendingPct}%`} />
        <LegendDot color="oklch(0.62 0.2 25)" label="De-listed" value={`${delistedPct}%`} />
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-medium text-foreground">{value}</span>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 34;
  const c = Math.PI * r;
  const pct = value / 100;
  return (
    <div className="relative">
      <svg viewBox="0 0 80 46" className="h-20 w-32">
        <path
          d={`M6,40 A${r},${r} 0 0 1 74,40`}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M6,40 A${r},${r} 0 0 1 74,40`}
          fill="none"
          stroke="oklch(0.55 0.14 258)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-xl font-semibold tracking-tight text-foreground">
          {value}
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
    </div>
  );
}

function RiskGrid() {
  const cells = [
    "bg-success/70",
    "bg-success/60",
    "bg-warning/60",
    "bg-warning/80",
    "bg-success/50",
    "bg-warning/70",
    "bg-warning/80",
    "bg-destructive/70",
    "bg-warning/50",
    "bg-warning/70",
    "bg-destructive/60",
    "bg-destructive/80",
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {cells.map((c, i) => (
        <div key={i} className={`h-4 rounded-sm ${c}`} />
      ))}
    </div>
  );
}

function KpiCards({ suppliers, metrics }: { suppliers: any[]; metrics: any }) {
  const avgScore = metrics
    ? metrics.avg_score
    : (suppliers.length
      ? Math.round(suppliers.reduce((acc, curr) => acc + curr.score, 0) / suppliers.length)
      : 85);

  const totalSpend = metrics ? metrics.total_spend : "$5.3M";
  const totalCount = metrics ? metrics.total_count : suppliers.length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Spend */}
      <Link to="/spend-analytics" className="block transition-all hover:-translate-y-0.5">
        <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-colors">
          <div className="flex items-center justify-between">
            <SectionLabel>Spend Analytics</SectionLabel>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              <TrendingUp className="h-3 w-3" /> +12.4%
            </span>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{totalSpend}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Total annual spend, TTM</div>
          <div className="mt-3">
            <SpendSparkline />
          </div>
        </Card>
      </Link>

      {/* AVL */}
      <Link to="/avl" className="block transition-all hover:-translate-y-0.5">
        <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-colors">
          <div className="flex items-center justify-between">
            <SectionLabel>AVL Module</SectionLabel>
            <span className="text-[11px] text-muted-foreground">{totalCount} suppliers</span>
          </div>
          <div className="mt-3 text-sm font-medium text-foreground">Qualification status</div>
          <div className="mt-3">
            <Donut suppliers={suppliers} metrics={metrics} />
          </div>
        </Card>
      </Link>

      {/* Perf */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionLabel>Supplier 360</SectionLabel>
          <span className="text-[11px] text-muted-foreground">Rolling 90d</span>
        </div>
        <div className="mt-3 text-sm font-medium text-foreground">Avg performance score</div>
        <div className="mt-2 flex items-end justify-center">
          <Gauge value={avgScore} />
        </div>
      </Card>

      {/* Risk */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionLabel>
            Procurement AI
            <NewTag />
          </SectionLabel>
          <Sparkles className="h-3.5 w-3.5 text-info" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-foreground">Medium</span>
          <span className="text-xs text-warning">↑ from Low</span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">Overall portfolio risk</div>
        <div className="mt-4">
          <RiskGrid />
        </div>
      </Card>
    </div>
  );
}

/* ---------- data table ---------- */

type Status = "Approved" | "Pending" | "New" | "De-listed";

const suppliers: Array<{
  name: string;
  code: string;
  status: Status;
  category: string;
  spend: string;
  score: number;
}> = [
  {
    name: "Meridian Steelworks",
    code: "SUP-10241",
    status: "Approved",
    category: "Raw Materials",
    spend: "$1.24M",
    score: 92,
  },
  {
    name: "Voltacore Electronics",
    code: "SUP-10188",
    status: "Approved",
    category: "Components",
    spend: "$864K",
    score: 88,
  },
  {
    name: "Northwind Logistics",
    code: "SUP-10310",
    status: "Pending",
    category: "Logistics",
    spend: "$412K",
    score: 74,
  },
  {
    name: "Kestrel Packaging Co.",
    code: "SUP-10402",
    status: "Approved",
    category: "Packaging",
    spend: "$298K",
    score: 81,
  },
  {
    name: "Halcyon Polymers",
    code: "SUP-10455",
    status: "New",
    category: "Raw Materials",
    spend: "$0",
    score: 0,
  },
  {
    name: "Orion Freight Systems",
    code: "SUP-10122",
    status: "De-listed",
    category: "Logistics",
    spend: "$56K",
    score: 42,
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Approved: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
    Pending: "bg-warning/15 text-warning-foreground/80 ring-1 ring-inset ring-warning/30",
    New: "bg-info/10 text-info ring-1 ring-inset ring-info/20",
    "De-listed": "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  };
  const cls = map[status] || "bg-muted text-muted-foreground ring-1 ring-inset ring-muted/20";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 85
      ? "bg-success"
      : score >= 65
        ? "bg-warning"
        : score > 0
          ? "bg-destructive"
          : "bg-muted-foreground/30";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums">{score || "—"}</span>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none cursor-pointer">
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-semibold text-foreground">{value}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange("All")} className={`cursor-pointer ${value === "All" ? "font-bold" : ""}`}>
          All
        </DropdownMenuItem>
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className={`cursor-pointer ${value === opt ? "font-bold" : ""}`}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SupplierTableProps {
  suppliers: any[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  status: string;
  category: string;
  riskLevel: string;
  searchQuery: string;
  categoriesList: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onRiskLevelChange: (riskLevel: string) => void;
  onSearchChange: (search: string) => void;
}

function SupplierTable({
  suppliers,
  loading,
  totalCount,
  currentPage,
  pageSize,
  status,
  category,
  riskLevel,
  searchQuery,
  categoriesList,
  onPageChange,
  onPageSizeChange,
  onStatusChange,
  onCategoryChange,
  onRiskLevelChange,
  onSearchChange,
}: SupplierTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage + 1 - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={currentPage + 1 === i}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i - 1);
            }}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  const SkeletonRow = () => (
    <tr className="border-b border-border last:border-0 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-24 rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-12 rounded bg-muted ml-auto" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded bg-muted" />
          <div className="h-3 w-6 rounded bg-muted" />
        </div>
      </td>
      <td className="px-2 py-3 text-right">
        <div className="h-7 w-7 rounded bg-muted ml-auto" />
      </td>
    </tr>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search name or code..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        
        <FilterDropdown
          label="Status"
          value={status}
          options={["Approved", "Pending", "New", "De-listed"]}
          onChange={onStatusChange}
        />
        <FilterDropdown
          label="Category"
          value={category}
          options={categoriesList}
          onChange={onCategoryChange}
        />
        <FilterDropdown
          label="Risk Level"
          value={riskLevel}
          options={["Low", "Medium", "High"]}
          onChange={onRiskLevelChange}
        />
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totalCount} suppliers</span>
          <span className="text-border">·</span>
          <button className="font-medium text-foreground hover:underline">Export CSV</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-panel text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Supplier</th>
              <th className="px-4 py-2.5 font-medium">AVL Status</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium text-right">12m Spend</th>
              <th className="px-4 py-2.5 font-medium">Performance</th>
              <th className="px-4 py-2.5 font-medium w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => <SkeletonRow key={idx} />)
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No suppliers found matching the active criteria.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => {
                if (!s) return null;
                return (
                  <tr
                    key={s.code}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-semibold text-foreground">
                          {s.name
                            ? s.name
                                .split(/\s+/)
                                .filter(Boolean)
                                .map((w: any) => w ? w[0] : "")
                                .slice(0, 2)
                                .join("")
                            : ""}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                      {s.spend}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={s.score} />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border px-4 py-4 sm:flex-row bg-surface-panel/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>

          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 0) onPageChange(currentPage - 1);
                  }}
                  className={currentPage === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {renderPaginationItems()}
              
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
                  }}
                  className={currentPage === totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{totalCount > 0 ? currentPage * pageSize + 1 : 0}</span> to{" "}
            <span className="font-medium text-foreground">
              {Math.min(totalCount, (currentPage + 1) * pageSize)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalCount}</span> suppliers
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- right sidebar ---------- */

function TopSupplierItem({
  name,
  category,
  score,
}: {
  name: string;
  category: string;
  score: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-success/10 text-success">
        <TrendingUp className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">{category}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-success">{score}%</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
      </div>
    </div>
  );
}

function AiCard({
  icon: Icon,
  tone,
  title,
  body,
  cta,
}: {
  icon: typeof PackageSearch;
  tone: "info" | "warn";
  title: string;
  body: string;
  cta: string;
}) {
  const toneCls = tone === "warn" ? "text-warning bg-warning/10" : "text-info bg-info/10";
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-info" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-info">
              AI Insight
            </span>
          </div>
          <div className="mt-1 text-sm font-medium leading-snug text-foreground">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          <button className="mt-2 text-xs font-medium text-foreground hover:underline">
            {cta} →
          </button>
        </div>
      </div>
    </div>
  );
}

function RightSidebar({ suppliers, topSuppliers: propTopSuppliers }: { suppliers: any[]; topSuppliers?: any[] }) {
  const topSuppliers = useMemo(() => {
    if (propTopSuppliers && propTopSuppliers.length > 0) {
      return propTopSuppliers;
    }
    return suppliers
      .filter((s: any) => s.score >= 90)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);
  }, [suppliers, propTopSuppliers]);

  return (
    <aside className="space-y-6 border-l border-border bg-surface-panel/60 p-5 lg:p-6">
      {/* Top Performing Suppliers */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Top Performing Suppliers</div>
            <div className="text-xs text-muted-foreground">Suppliers with score ≥ 90%</div>
          </div>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
            {topSuppliers.length}
          </span>
        </div>
        <div className="space-y-2">
          {topSuppliers.map((s) => (
            <TopSupplierItem
              key={s.code}
              name={s.name}
              category={s.category}
              score={s.score}
            />
          ))}
          {topSuppliers.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No top performing suppliers found.
            </div>
          )}
        </div>
      </section>

      {/* AI */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-sm font-semibold text-foreground">AI Recommendations</div>
            <NewTag />
          </div>
          <button className="text-xs text-muted-foreground hover:text-foreground">View all</button>
        </div>
        <div className="space-y-2.5">
          <AiCard
            icon={PackageSearch}
            tone="info"
            title="Reorder opportunity: Steel pipes"
            body="Demand forecast suggests placing a PO within 6 days to avoid a projected 9% price uplift."
            cta="Draft PO"
          />
          <AiCard
            icon={ShieldAlert}
            tone="warn"
            title="Risk alert: Northwind Logistics"
            body="Port congestion in APAC is causing 3–5 day delivery delays across 4 active shipments."
            cta="View shipments"
          />
          <AiCard
            icon={TrendingUp}
            tone="info"
            title="Consolidation: Packaging category"
            body="Merging Kestrel + 2 tail suppliers could unlock ~$46K annual savings."
            cta="Explore scenario"
          />
        </div>
      </section>
    </aside>
  );
}

/* ---------- page ---------- */

export function Dashboard() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [riskLevel, setRiskLevel] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Server-side loaded metadata
  const [totalCount, setTotalCount] = useState(0);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [kpiMetrics, setKpiMetrics] = useState<any>(null);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0); // Reset page on search query change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setCurrentPage(0);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setCurrentPage(0);
  };

  const handleRiskLevelChange = (val: string) => {
    setRiskLevel(val);
    setCurrentPage(0);
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/method/procurex.api.get_all_suppliers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: currentPage * pageSize,
            page_length: pageSize,
            status,
            category,
            risk_level: riskLevel,
            search: debouncedSearch,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.message) {
            const returnedTotalCount = data.message.total_count || 0;
            const currentStart = currentPage * pageSize;
            
            // If current page index is out of bounds due to filters/pageSize change, reset to page 0
            if (currentStart >= returnedTotalCount && returnedTotalCount > 0) {
              setCurrentPage(0);
              return;
            }

            setSuppliers(data.message.suppliers || []);
            setTotalCount(returnedTotalCount);
            if (data.message.categories) {
              setCategoriesList(data.message.categories);
            }
            if (data.message.kpi_metrics) {
              setKpiMetrics(data.message.kpi_metrics);
            }
            if (data.message.top_suppliers) {
              setTopSuppliers(data.message.top_suppliers);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load suppliers:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [currentPage, pageSize, status, category, riskLevel, debouncedSearch]);

  return (
    <AppShell title="Supplier 360" breadcrumb="Supplier 360">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Main */}
        <main className="min-w-0 px-4 py-6 md:px-6 lg:px-8">
          <PageHeader
            title="Supplier Directory & Intelligence"
            description="Monitor qualification, performance and risk across your active supplier base."
            action={
              <Button className="shrink-0 gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Supplier Onboarding</span>
                <span className="sm:hidden">New</span>
              </Button>
            }
          />

          <div className="mt-6">
            <KpiCards suppliers={suppliers} metrics={kpiMetrics} />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Supplier Directory</h2>
              <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                Live
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated <span className="text-foreground">2 min</span> ago
            </div>
          </div>

          <div className="mt-3">
            <SupplierTable
              suppliers={suppliers}
              loading={loading}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              status={status}
              category={category}
              riskLevel={riskLevel}
              searchQuery={searchQuery}
              categoriesList={categoriesList}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              onStatusChange={handleStatusChange}
              onCategoryChange={handleCategoryChange}
              onRiskLevelChange={handleRiskLevelChange}
              onSearchChange={setSearchQuery}
            />
          </div>
        </main>

        {/* Right */}
        <RightSidebar suppliers={suppliers} topSuppliers={topSuppliers} />
      </div>
    </AppShell>
  );
}
