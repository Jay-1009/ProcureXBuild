import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/procurex/AppShell";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  ChevronRight,
  Crosshair,
  GitBranch,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Route as RouteIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/project/planning")({
  component: ProjectPlanningPage,
});

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ProjectOption = {
  name: string;
  label: string;
  status?: string;
  expected_start_date?: string | null;
  expected_end_date?: string | null;
  percent_complete?: number;
};

type PlanningTask = {
  task_id: string;
  subject: string;
  parent_task: string | null;
  indent: number;
  is_group: number;
  is_milestone: number;
  status: string;
  display_status: string;
  progress: number;
  exp_start_date: string | null;
  exp_end_date: string | null;
  act_start_date: string | null;
  act_end_date: string | null;
  duration: number;
  contractor: string | null;
  total_quantity: number | null;
  total_achieved: number | null;
  uom: string | null;
  es: number | null;
  ef: number | null;
  ls: number | null;
  lf: number | null;
  slack: number | null;
  is_critical: number;
};

type Dependency = { from: string; to: string };

type PlanningPayload = {
  project: {
    name: string;
    project_name: string;
    expected_start_date: string | null;
    expected_end_date: string | null;
    percent_complete: number;
    status: string;
  };
  tasks: PlanningTask[];
  dependencies: Dependency[];
  status_colors: Record<string, string>;
};

type Zoom = "Day" | "Week" | "Month";
type EditableField = "exp_start_date" | "exp_end_date";

/* ─── Left-panel column definitions ─────────────────────────────────────── */

type ColDef = {
  key: string;
  label: string;
  width: number;
  editable?: boolean;
  align?: "left" | "right" | "center";
};

// Subject column is rendered separately (always-visible fixed portion).
// These are the scrollable columns that appear to its right.
const SCROLL_COLS: ColDef[] = [
  { key: "status",           label: "Status",      width: 82                },
  { key: "exp_start_date",   label: "Exp. Start",  width: 90, editable: true, align: "center" },
  { key: "exp_end_date",     label: "Exp. End",    width: 90, editable: true, align: "center" },
  { key: "act_start_date",   label: "Act. Start",  width: 82, align: "center" },
  { key: "act_end_date",     label: "Act. End",    width: 82, align: "center" },
  { key: "duration",         label: "Dur",         width: 46, align: "right"  },
  { key: "progress",         label: "%",           width: 46, align: "right"  },
  { key: "contractor",       label: "Contractor",  width: 110               },
  { key: "total_quantity",   label: "Qty",         width: 58, align: "right"  },
  { key: "total_achieved",   label: "Done",        width: 58, align: "right"  },
  { key: "pending_quantity", label: "Pending",     width: 62, align: "right"  },
  { key: "uom",              label: "UOM",         width: 52                },
];

const SUBJECT_W    = 200; // fixed subject column width
const SCROLL_TOTAL = SCROLL_COLS.reduce((s, c) => s + c.width, 0);
const LEFT_PANEL_W = 400; // outer left-panel pixel width in the grid
const SCROLL_PANEL_W = LEFT_PANEL_W - SUBJECT_W; // visible scrollable area

/* ─── API helpers ────────────────────────────────────────────────────────── */

const API = "quantbit_construction_management.project_planning.api";

async function frappeCall<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/method/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
    },
    credentials: "include",
    body: JSON.stringify(args || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.message as T;
}

/* ─── Date helpers ───────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000;

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime()) ? null : dt;
}
function dayStart(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((dayStart(a).getTime() - dayStart(b).getTime()) / DAY_MS);
}
function toApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day} 00:00:00`;
}
/** Full date display: 25 Sep 2026 */
function fmt(d?: string | null, withTime = false): string {
  const dt = parseDate(d);
  if (!dt) return "—";
  const s = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return withTime ? `${s}, ${dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : s;
}
/** Compact date: 25 Sep */
function fmtShort(d?: string | null): string {
  const dt = parseDate(d);
  if (!dt) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
/** Convert to YYYY-MM-DD for <input type="date"> */
function toInputDate(d?: string | null): string {
  const dt = parseDate(d);
  return dt ? dt.toISOString().split("T")[0] : "";
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const PX_PER_DAY: Record<Zoom, number> = { Day: 40, Week: 16, Month: 5 };
const ROW_H = 36;
const BAR_H = 20;

const LEGEND: [string, string][] = [
  ["Not Started", "#94a3b8"],
  ["In Progress",  "#3b82f6"],
  ["Completed",    "#22c55e"],
  ["Delayed",      "#f97316"],
  ["Critical Path","#dc2626"],
];

const STATUS_PILL: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-100  text-blue-700",
  "Completed":   "bg-green-100 text-green-700",
  "Delayed":     "bg-orange-100 text-orange-700",
  "Cancelled":   "bg-red-100   text-red-600",
};

/* ─── Page ───────────────────────────────────────────────────────────────── */

function ProjectPlanningPage() {
  useEffect(() => { document.title = "Project Planning — CPM & Gantt"; }, []);

  const [projects, setProjects]         = useState<ProjectOption[]>([]);
  const [selected, setSelected]         = useState<string>("");
  const [payload, setPayload]           = useState<PlanningPayload | null>(null);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [zoom, setZoom]                 = useState<Zoom>("Week");
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingCell, setEditingCell]   = useState<{ taskId: string; field: EditableField } | null>(null);

  /* Refs for scroll sync -------------------------------------------------- */
  const timelineRef     = useRef<HTMLDivElement>(null); // right-body (gantt)
  const rightHdrRef     = useRef<HTMLDivElement>(null); // right-header
  const leftSubjectRef  = useRef<HTMLDivElement>(null); // left fixed-subject body
  const leftScrollRef   = useRef<HTMLDivElement>(null); // left scrollable-columns body
  const leftScrollHdrRef = useRef<HTMLDivElement>(null); // left scrollable-columns header

  /* Load projects --------------------------------------------------------- */
  useEffect(() => {
    frappeCall<ProjectOption[]>(`${API}.get_planning_projects`)
      .then((rows) => {
        setProjects(rows || []);
        if (rows?.length && !selected) setSelected(rows[0].name);
      })
      .catch(() => toast.error("Failed to load projects"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlanning = useCallback((project: string) => {
    if (!project) return;
    setLoading(true);
    frappeCall<PlanningPayload>(`${API}.get_project_planning_data`, { project })
      .then((res) => setPayload(res))
      .catch(() => toast.error("Failed to load planning data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (selected) loadPlanning(selected); }, [selected, loadPlanning]);

  /* Visible tasks (respecting collapsed groups) --------------------------- */
  const visibleTasks = useMemo(() => {
    if (!payload) return [] as PlanningTask[];
    const out: PlanningTask[] = [];
    let hideUntil: number | null = null;
    for (const t of payload.tasks) {
      if (hideUntil !== null) {
        if (t.indent > hideUntil) continue;
        hideUntil = null;
      }
      out.push(t);
      if (t.is_group && collapsed.has(t.task_id)) hideUntil = t.indent;
    }
    return out;
  }, [payload, collapsed]);

  const rowIndex = useMemo(() => {
    const m: Record<string, number> = {};
    visibleTasks.forEach((t, i) => (m[t.task_id] = i));
    return m;
  }, [visibleTasks]);

  /* Timeline bounds ------------------------------------------------------- */
  const bounds = useMemo(() => {
    const today = new Date();
    if (!payload) return { start: dayStart(today), end: dayStart(addDays(today, 30)), totalDays: 30 };
    let min = parseDate(payload.project.expected_start_date);
    let max = parseDate(payload.project.expected_end_date);
    for (const t of payload.tasks) {
      const s = parseDate(t.exp_start_date), e = parseDate(t.exp_end_date);
      if (s && (!min || s < min)) min = s;
      if (e && (!max || e > max)) max = e;
    }
    if (!min) min = today;
    if (!max) max = addDays(today, 30);
    const start = dayStart(addDays(min, -3));
    const end   = dayStart(addDays(max, 7));
    return { start, end, totalDays: Math.max(dayDiff(end, start), 1) };
  }, [payload]);

  const pxPerDay    = PX_PER_DAY[zoom];
  const chartWidth  = bounds.totalDays * pxPerDay;
  const chartHeight = visibleTasks.length * ROW_H;

  const xOf = useCallback(
    (d: Date) => dayDiff(d, bounds.start) * pxPerDay,
    [bounds.start, pxPerDay]
  );

  /* ── Scroll sync ─────────────────────────────────────────────────────── */
  /*
   * Three vertical scroll containers that must stay in sync:
   *   leftSubjectRef  – fixed subject column body
   *   leftScrollRef   – scrollable columns body
   *   timelineRef     – gantt chart body
   *
   * One horizontal sync pair:
   *   leftScrollRef ↔ leftScrollHdrRef  (left-panel column headers)
   *   timelineRef   ↔ rightHdrRef       (gantt timeline headers)
   */
  const syncingRef = useRef(false); // prevent scroll-sync re-entry

  const syncVertical = (scrollTop: number, except?: HTMLDivElement) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    for (const el of [leftSubjectRef.current, leftScrollRef.current, timelineRef.current]) {
      if (el && el !== except) el.scrollTop = scrollTop;
    }
    syncingRef.current = false;
  };

  const onSubjectScroll = () => {
    const el = leftSubjectRef.current;
    if (!el) return;
    syncVertical(el.scrollTop, el);
  };
  const onScrollColsScroll = () => {
    const el = leftScrollRef.current;
    if (!el) return;
    syncVertical(el.scrollTop, el);
    if (leftScrollHdrRef.current) leftScrollHdrRef.current.scrollLeft = el.scrollLeft;
  };
  const onTimelineScroll = () => {
    const el = timelineRef.current;
    if (!el) return;
    syncVertical(el.scrollTop, el);
    if (rightHdrRef.current) rightHdrRef.current.scrollLeft = el.scrollLeft;
  };

  const scrollToToday = () => {
    if (!timelineRef.current) return;
    const x = xOf(dayStart(new Date()));
    timelineRef.current.scrollTo({ left: Math.max(0, x - 200), behavior: "smooth" });
  };

  /* ── Collapse / expand ───────────────────────────────────────────────── */
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll   = () => setCollapsed(new Set());
  const collapseAll = () =>
    payload && setCollapsed(new Set(payload.tasks.filter((t) => t.is_group).map((t) => t.task_id)));

  /* ── Bar colour ──────────────────────────────────────────────────────── */
  const colorOf = useCallback(
    (t: PlanningTask) => {
      const c = payload?.status_colors || {};
      if (t.is_critical && !t.is_group) return c["Critical Path"] || "#dc2626";
      return c[t.display_status] || c[t.status] || "#94a3b8";
    },
    [payload]
  );

  /* ── Persist schedule ────────────────────────────────────────────────── */
  const persistSchedule = useCallback(
    (taskId: string, start: Date, end: Date) => {
      setSaving(true);
      frappeCall<PlanningPayload>(`${API}.update_task_schedule`, {
        task: taskId, exp_start_date: toApiDate(start), exp_end_date: toApiDate(end),
      })
        .then((res) => { setPayload(res); toast.success("Schedule updated · CPM recalculated"); })
        .catch(() => { toast.error("Update failed"); if (selected) loadPlanning(selected); })
        .finally(() => setSaving(false));
    },
    [selected, loadPlanning]
  );

  const mutateDependency = useCallback(
    (task: string, dependsOn: string, action: "add" | "remove") => {
      setSaving(true);
      frappeCall<PlanningPayload>(`${API}.update_task_dependency`, { task, depends_on: dependsOn, action })
        .then((res) => { setPayload(res); toast.success(action === "add" ? "Dependency created" : "Dependency removed"); })
        .catch((e) => toast.error(String(e).includes("circular") ? "Circular dependency blocked" : "Dependency update failed"))
        .finally(() => setSaving(false));
    }, []
  );

  /* ── Inline date edit ────────────────────────────────────────────────── */
  const saveInlineDate = useCallback(
    (taskId: string, field: EditableField, value: string) => {
      setEditingCell(null);
      if (!value) return;
      const task = payload?.tasks.find((t) => t.task_id === taskId);
      if (!task) return;
      const newDate = new Date(value);
      if (isNaN(newDate.getTime())) return;
      const start = field === "exp_start_date" ? newDate : (parseDate(task.exp_start_date) || newDate);
      const end   = field === "exp_end_date"   ? newDate : (parseDate(task.exp_end_date)   || newDate);
      persistSchedule(taskId, start, end);
    },
    [payload, persistSchedule]
  );

  /* ── Bar drag / resize ───────────────────────────────────────────────── */
  const dragState = useRef<{
    id: string; mode: "move" | "resize-left" | "resize-right";
    startX: number; origLeft: number; origWidth: number;
    el: HTMLElement; moved: boolean;
  } | null>(null);

  const startBarDrag = (e: React.PointerEvent, t: PlanningTask, mode: "move" | "resize-left" | "resize-right") => {
    if (t.is_group) return;
    e.preventDefault(); e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).closest(".qcm-bar") as HTMLElement;
    if (!el) return;
    dragState.current = { id: t.task_id, mode, startX: e.clientX, origLeft: parseFloat(el.style.left), origWidth: parseFloat(el.style.width), el, moved: false };
    window.addEventListener("pointermove", onBarMove);
    window.addEventListener("pointerup", onBarUp);
  };
  const onBarMove = (e: PointerEvent) => {
    const ds = dragState.current; if (!ds) return;
    const dx = e.clientX - ds.startX;
    if (Math.abs(dx) > 3) ds.moved = true;
    const snap = Math.round(dx / pxPerDay) * pxPerDay;
    if (ds.mode === "move") {
      ds.el.style.left = ds.origLeft + snap + "px";
    } else if (ds.mode === "resize-right") {
      ds.el.style.width = Math.max(pxPerDay, ds.origWidth + snap) + "px";
    } else {
      const w = Math.max(pxPerDay, ds.origWidth - snap);
      ds.el.style.left  = ds.origLeft + (ds.origWidth - w) + "px";
      ds.el.style.width = w + "px";
    }
  };
  const onBarUp = () => {
    const ds = dragState.current;
    window.removeEventListener("pointermove", onBarMove);
    window.removeEventListener("pointerup", onBarUp);
    dragState.current = null;
    if (!ds || !ds.moved) return;
    const startDays = Math.round(parseFloat(ds.el.style.left) / pxPerDay);
    const durDays   = Math.max(Math.round(parseFloat(ds.el.style.width) / pxPerDay) - 1, 0);
    persistSchedule(ds.id, addDays(bounds.start, startDays), addDays(bounds.start, startDays + durDays));
  };

  /* ── Dependency drag ─────────────────────────────────────────────────── */
  const [linkGhost, setLinkGhost] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const linkState = useRef<{ from: string } | null>(null);

  const startLink = (e: React.PointerEvent, t: PlanningTask) => {
    e.preventDefault(); e.stopPropagation();
    const container = timelineRef.current?.querySelector(".qcm-bars") as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const s = parseDate(t.exp_end_date); if (!s) return;
    const x1 = xOf(s) + pxPerDay, y1 = rowIndex[t.task_id] * ROW_H + ROW_H / 2;
    linkState.current = { from: t.task_id };
    setLinkGhost({ x1, y1, x2: x1, y2: y1 });
    const move = (ev: PointerEvent) => setLinkGhost({ x1, y1, x2: ev.clientX - rect.left, y2: ev.clientY - rect.top });
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLinkGhost(null);
      const bar = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".qcm-bar") as HTMLElement | null;
      const toId = bar?.getAttribute("data-task");
      const from = linkState.current?.from;
      linkState.current = null;
      if (toId && from && toId !== from) mutateDependency(toId, from, "add");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ── Timeline header cells ───────────────────────────────────────────── */
  const monthGroups = useMemo(() => {
    const out: { label: string; short: string; year: number; days: number }[] = [];
    let cursor = new Date(bounds.start);
    while (cursor < bounds.end) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const monthEnd = new Date(y, m + 1, 1);
      const end = monthEnd < bounds.end ? monthEnd : bounds.end;
      out.push({ label: cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), short: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), year: y, days: dayDiff(end, cursor) });
      cursor = monthEnd;
    }
    return out;
  }, [bounds.start, bounds.end]);

  const todayX = xOf(dayStart(new Date()));

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <AppShell title="Project Planning" breadcrumb="Project / Planning">
      <main className="mx-auto max-w-screen-2xl px-4 py-5 md:px-6">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <RouteIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Project Planning</h1>
              <p className="text-xs text-muted-foreground">Critical Path Method &amp; interactive Gantt</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9 w-[260px] text-xs font-medium">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-lg border border-border">
              {(["Day", "Week", "Month"] as Zoom[]).map((z) => (
                <button key={z} onClick={() => setZoom(z)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${zoom === z ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  {z}
                </button>
              ))}
            </div>
            <ToolbarBtn icon={Maximize2} label="Expand"      onClick={expandAll} />
            <ToolbarBtn icon={Minimize2} label="Collapse"    onClick={collapseAll} />
            <ToolbarBtn icon={Crosshair} label="Today"       onClick={scrollToToday} />
            <ToolbarBtn icon={RefreshCw} label="Recalculate" onClick={() => selected && loadPlanning(selected)} />
          </div>
        </div>

        {/* Project summary */}
        {payload && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <SummaryStat icon={Calendar}   label="Start"    value={fmt(payload.project.expected_start_date)} />
              <SummaryStat icon={Calendar}   label="End"      value={fmt(payload.project.expected_end_date)} />
              <SummaryStat icon={GitBranch}  label="Tasks"    value={`${payload.tasks.length} · ${payload.dependencies.length} links`} />
              <SummaryStat icon={RouteIcon}  label="Critical" value={`${payload.tasks.filter((t) => t.is_critical && !t.is_group).length} tasks`} />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Progress</span>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, payload.project.percent_complete || 0)}%` }} />
                </div>
                <span className="font-bold text-foreground">{Math.round(payload.project.percent_complete || 0)}%</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {LEGEND.map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <i className="h-3 w-3 rounded-sm" style={{ background: color }} />{label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <i className="h-2.5 w-2.5 rotate-45 bg-purple-500" />Milestone
              </span>
            </div>
          </div>
        )}

        {/* ── Gantt container ── */}
        <div className="relative mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {(loading || saving) && (
            <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-foreground/80 px-3 py-1 text-xs font-medium text-background backdrop-blur">
              <Loader2 className="h-3 w-3 animate-spin" />{loading ? "Loading…" : "Saving…"}
            </div>
          )}

          {!payload || visibleTasks.length === 0 ? (
            <div className="grid h-[420px] place-items-center text-sm text-muted-foreground">
              {loading ? "Loading planning data…" : "No tasks found for this project."}
            </div>
          ) : (
            /*
             * Layout: 3-column CSS Grid
             *   col-1 [SUBJECT_W]     – always-visible subject column
             *   col-2 [SCROLL_PANEL_W]– horizontally-scrollable data columns
             *   col-3 [1fr]           – Gantt timeline
             *
             * Row heights fixed via gridTemplateRows so the body rows always
             * fill the remaining height and content aligns from the top.
             */
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${SUBJECT_W}px ${SCROLL_PANEL_W}px 1fr`,
                gridTemplateRows:    `${ROW_H}px 1fr`,   // ← header row fixed, body row fills
                height: "calc(100vh - 310px)",
                minHeight: 420,
              }}
            >
              {/* ══ ROW 1: HEADERS ══════════════════════════════════════ */}

              {/* col-1 header: subject label */}
              <div className="flex items-center border-b border-r border-border bg-muted/40 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                TASK / SUBJECT
              </div>

              {/* col-2 header: scrollable column labels (hidden scrollbar, synced with body) */}
              <div className="border-b border-r border-border bg-muted/40 overflow-hidden">
                <div
                  ref={leftScrollHdrRef}
                  style={{ overflowX: "scroll", overflowY: "hidden", height: ROW_H + 20, scrollbarWidth: "none" }}
                >
                  <div className="flex" style={{ width: SCROLL_TOTAL, height: ROW_H }}>
                    {SCROLL_COLS.map((col) => (
                      <div
                        key={col.key}
                        className={`flex shrink-0 items-center border-r border-border/40 px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}
                        style={{ width: col.width, minWidth: col.width }}
                      >
                        {col.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* col-3 header: timeline scale */}
              <div ref={rightHdrRef} className="overflow-hidden border-b border-border bg-muted/40">
                <div style={{ width: chartWidth }}>
                  <TimelineHeader zoom={zoom} bounds={bounds} pxPerDay={pxPerDay} monthGroups={monthGroups} />
                </div>
              </div>

              {/* ══ ROW 2: BODY ═════════════════════════════════════════ */}

              {/* col-1 body: subject column (vertical scroll only) */}
              <div
                ref={leftSubjectRef}
                onScroll={onSubjectScroll}
                className="overflow-y-auto overflow-x-hidden border-r border-border"
                style={{ scrollbarWidth: "none" }}
              >
                {visibleTasks.map((t) => (
                  <SubjectCell
                    key={t.task_id}
                    task={t}
                    selected={selectedTask === t.task_id}
                    collapsed={collapsed.has(t.task_id)}
                    color={colorOf(t)}
                    onToggle={() => toggleCollapse(t.task_id)}
                    onSelect={() => setSelectedTask(t.task_id)}
                  />
                ))}
              </div>

              {/* col-2 body: scrollable data columns */}
              <div
                ref={leftScrollRef}
                onScroll={onScrollColsScroll}
                className="overflow-auto border-r border-border"
                style={{ scrollbarWidth: "thin" }}
              >
                <div style={{ width: SCROLL_TOTAL }}>
                  {visibleTasks.map((t) => (
                    <DataRow
                      key={t.task_id}
                      task={t}
                      selected={selectedTask === t.task_id}
                      onSelect={() => setSelectedTask(t.task_id)}
                      editingCell={editingCell}
                      onStartEdit={(tid, field) => setEditingCell({ taskId: tid, field: field as EditableField })}
                      onSaveEdit={saveInlineDate}
                      onCancelEdit={() => setEditingCell(null)}
                    />
                  ))}
                </div>
              </div>

              {/* col-3 body: Gantt chart */}
              <div
                ref={timelineRef}
                onScroll={onTimelineScroll}
                className="overflow-auto"
                style={{ scrollbarWidth: "thin" }}
              >
                <div className="qcm-bars relative" style={{ width: chartWidth, height: chartHeight }}>
                  <GridLines totalDays={bounds.totalDays} pxPerDay={pxPerDay} start={bounds.start} zoom={zoom} height={chartHeight} />

                  {/* row stripes */}
                  {visibleTasks.map((_, i) => (
                    <div key={i} className={`absolute left-0 right-0 ${i % 2 ? "bg-muted/20" : ""}`}
                      style={{ top: i * ROW_H, height: ROW_H, width: chartWidth }} />
                  ))}

                  {/* today marker */}
                  {todayX >= 0 && todayX <= chartWidth && (
                    <div className="absolute top-0 z-20 w-px bg-red-500/70" style={{ left: todayX, height: chartHeight }}>
                      <span className="absolute left-1 top-0 rounded bg-red-500 px-1 text-[9px] font-bold text-white">Today</span>
                    </div>
                  )}

                  <DependencyLayer payload={payload} rowIndex={rowIndex} xOf={xOf} pxPerDay={pxPerDay} width={chartWidth} height={chartHeight} onRemove={(from, to) => mutateDependency(to, from, "remove")} />

                  {linkGhost && (
                    <svg className="pointer-events-none absolute inset-0 z-30" width={chartWidth} height={chartHeight}>
                      <line x1={linkGhost.x1} y1={linkGhost.y1} x2={linkGhost.x2} y2={linkGhost.y2} stroke="#2563eb" strokeWidth={2} strokeDasharray="4 3" />
                    </svg>
                  )}

                  {visibleTasks.map((t, i) => (
                    <Bar
                      key={t.task_id}
                      task={t}
                      top={i * ROW_H}
                      left={t.exp_start_date ? xOf(parseDate(t.exp_start_date)!) : 0}
                      width={
                        t.exp_start_date && t.exp_end_date
                          ? Math.max((dayDiff(parseDate(t.exp_end_date)!, parseDate(t.exp_start_date)!) + 1) * pxPerDay, pxPerDay)
                          : pxPerDay
                      }
                      color={colorOf(t)}
                      selected={selectedTask === t.task_id}
                      onSelect={() => setSelectedTask(t.task_id)}
                      onStartDrag={startBarDrag}
                      onStartLink={startLink}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Click Exp. Start / Exp. End to edit dates · drag a bar to reschedule · drag edges to resize · drag ● onto another task to link · double-click a connector to remove
        </p>
      </main>
    </AppShell>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ToolbarBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

/* ── Subject cell (fixed left column) ───────────────────────────────────── */

function SubjectCell({
  task, selected, collapsed, color, onToggle, onSelect,
}: {
  task: PlanningTask; selected: boolean; collapsed: boolean;
  color: string; onToggle: () => void; onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer items-center border-b border-border/50 transition-colors hover:bg-muted/30 ${selected ? "bg-primary/8" : ""}`}
      style={{ height: ROW_H }}
      title={task.subject}
    >
      {/* indent */}
      <div
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden"
        style={{ paddingLeft: 6 + task.indent * 14 }}
      >
        {task.is_group ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="mr-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-90"}`} />
          </button>
        ) : (
          <span className="mr-0.5 h-4 w-4 shrink-0" />
        )}
        <span className="mr-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className={`truncate text-[11px] leading-none ${task.is_group ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
          {task.subject}
        </span>
        {task.is_critical && !task.is_group && (
          <span className="ml-1 shrink-0 rounded bg-red-100 px-1 py-px text-[9px] font-bold text-red-700">CP</span>
        )}
      </div>
    </div>
  );
}

/* ── Inline date input ───────────────────────────────────────────────────── */

function DateInput({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <input
      ref={ref}
      type="date"
      defaultValue={value}
      onBlur={(e) => onSave(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSave((e.target as HTMLInputElement).value);
        if (e.key === "Escape") onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-6 w-full rounded border border-primary/60 bg-primary/5 px-1 text-[11px] text-foreground outline-none focus:border-primary"
    />
  );
}

/* ── Data row (scrollable columns) ──────────────────────────────────────── */

function DataRow({
  task, selected, onSelect, editingCell, onStartEdit, onSaveEdit, onCancelEdit,
}: {
  task: PlanningTask; selected: boolean; onSelect: () => void;
  editingCell: { taskId: string; field: string } | null;
  onStartEdit: (tid: string, field: string) => void;
  onSaveEdit: (tid: string, field: EditableField, val: string) => void;
  onCancelEdit: () => void;
}) {
  const pending =
    task.total_quantity != null && task.total_achieved != null
      ? task.total_quantity - task.total_achieved : null;

  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer items-stretch border-b border-border/50 text-[11px] transition-colors hover:bg-muted/30 ${selected ? "bg-primary/8" : ""}`}
      style={{ height: ROW_H, width: SCROLL_TOTAL }}
    >
      {SCROLL_COLS.map((col) => {
        const isEditing = col.editable && editingCell?.taskId === task.task_id && editingCell?.field === col.key;
        const cellCls = `flex shrink-0 items-center border-r border-border/40 overflow-hidden px-1.5 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`;

        /* ── Editable date cells ── */
        if (col.editable && (col.key === "exp_start_date" || col.key === "exp_end_date")) {
          const rawDate = task[col.key as keyof PlanningTask] as string | null;
          return (
            <div key={col.key} className={cellCls} style={{ width: col.width, minWidth: col.width, height: ROW_H }}>
              {isEditing ? (
                <DateInput
                  value={toInputDate(rawDate)}
                  onSave={(v) => onSaveEdit(task.task_id, col.key as EditableField, v)}
                  onCancel={onCancelEdit}
                />
              ) : (
                <span
                  onClick={(e) => { e.stopPropagation(); onStartEdit(task.task_id, col.key); }}
                  title="Click to edit"
                  className="cursor-pointer rounded px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                >
                  {rawDate ? fmtShort(rawDate) : <span className="opacity-25">—</span>}
                </span>
              )}
            </div>
          );
        }

        /* ── All other cells ── */
        let content: React.ReactNode;
        switch (col.key) {
          case "status":
            content = (
              <span className={`rounded px-1.5 py-px text-[10px] font-semibold leading-none ${STATUS_PILL[task.display_status] ?? "bg-slate-100 text-slate-600"}`}>
                {task.display_status}
              </span>
            );
            break;
          case "act_start_date":
          case "act_end_date": {
            const v = task[col.key as keyof PlanningTask] as string | null;
            content = <span className="text-muted-foreground">{v ? fmtShort(v) : "—"}</span>;
            break;
          }
          case "duration":
            content = <span className="text-muted-foreground">{task.duration}d</span>;
            break;
          case "progress":
            content = <span className="font-semibold text-foreground">{Math.round(task.progress)}%</span>;
            break;
          case "contractor":
            content = <span className="truncate text-muted-foreground" title={task.contractor ?? ""}>{task.contractor || "—"}</span>;
            break;
          case "total_quantity":
            content = <span className="text-muted-foreground">{task.total_quantity ?? "—"}</span>;
            break;
          case "total_achieved":
            content = <span className="text-muted-foreground">{task.total_achieved ?? "—"}</span>;
            break;
          case "pending_quantity":
            content = (
              <span className={pending != null && pending > 0 ? "font-semibold text-orange-600" : "text-muted-foreground"}>
                {pending != null ? (Number.isInteger(pending) ? pending : pending.toFixed(2)) : "—"}
              </span>
            );
            break;
          case "uom":
            content = <span className="text-muted-foreground">{task.uom || "—"}</span>;
            break;
          default:
            content = <span className="text-muted-foreground">—</span>;
        }

        return (
          <div key={col.key} className={cellCls} style={{ width: col.width, minWidth: col.width, height: ROW_H }}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/* ── Timeline header ─────────────────────────────────────────────────────── */

function TimelineHeader({ zoom, bounds, pxPerDay, monthGroups }: {
  zoom: Zoom; bounds: { start: Date; end: Date; totalDays: number };
  pxPerDay: number; monthGroups: { label: string; short: string; year: number; days: number }[];
}) {
  const topH = 18, bottomH = ROW_H - topH;
  let top: React.ReactNode, bottom: React.ReactNode;

  if (zoom === "Day") {
    top = monthGroups.map((m, i) => (
      <div key={i} className="shrink-0 border-r border-border/60 px-2 text-[10px] font-bold text-muted-foreground" style={{ width: m.days * pxPerDay, height: topH, lineHeight: `${topH}px` }}>{m.label}</div>
    ));
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < bounds.totalDays; i++) {
      const d = addDays(bounds.start, i), we = d.getDay() === 0 || d.getDay() === 6;
      cells.push(<div key={i} className={`shrink-0 border-r border-border/40 text-center text-[10px] ${we ? "bg-muted/40 text-muted-foreground/60" : "text-muted-foreground"}`} style={{ width: pxPerDay, height: bottomH, lineHeight: `${bottomH}px` }}>{d.getDate()}</div>);
    }
    bottom = cells;
  } else if (zoom === "Week") {
    top = monthGroups.map((m, i) => (
      <div key={i} className="shrink-0 border-r border-border/60 px-2 text-[10px] font-bold text-muted-foreground" style={{ width: m.days * pxPerDay, height: topH, lineHeight: `${topH}px` }}>{m.label}</div>
    ));
    const cells: React.ReactNode[] = [];
    let cursor = new Date(bounds.start);
    while (cursor < bounds.end) {
      cells.push(<div key={cursor.getTime()} className="shrink-0 border-r border-border/40 text-center text-[10px] text-muted-foreground" style={{ width: pxPerDay * 7, height: bottomH, lineHeight: `${bottomH}px` }}>{cursor.getDate()}/{cursor.getMonth() + 1}</div>);
      cursor = addDays(cursor, 7);
    }
    bottom = cells;
  } else {
    const years: Record<number, number> = {};
    monthGroups.forEach((m) => (years[m.year] = (years[m.year] || 0) + m.days));
    top = Object.entries(years).map(([y, days]) => (
      <div key={y} className="shrink-0 border-r border-border/60 px-2 text-[10px] font-bold text-muted-foreground" style={{ width: days * pxPerDay, height: topH, lineHeight: `${topH}px` }}>{y}</div>
    ));
    bottom = monthGroups.map((m, i) => (
      <div key={i} className="shrink-0 border-r border-border/40 text-center text-[10px] text-muted-foreground" style={{ width: m.days * pxPerDay, height: bottomH, lineHeight: `${bottomH}px` }}>{m.short}</div>
    ));
  }

  return (
    <div>
      <div className="flex" style={{ height: topH }}>{top}</div>
      <div className="flex border-t border-border/40" style={{ height: bottomH }}>{bottom}</div>
    </div>
  );
}

/* ── Grid lines ──────────────────────────────────────────────────────────── */

function GridLines({ totalDays, pxPerDay, start, zoom, height }: {
  totalDays: number; pxPerDay: number; start: Date; zoom: Zoom; height: number;
}) {
  const lines: React.ReactNode[] = [];
  const step = zoom === "Day" ? 1 : zoom === "Week" ? 7 : 30;
  for (let i = 0; i <= totalDays; i += step) {
    const d = addDays(start, i), we = zoom === "Day" && (d.getDay() === 0 || d.getDay() === 6);
    lines.push(
      <div key={i} className={`absolute top-0 ${we ? "bg-muted/30" : ""}`}
        style={{ left: i * pxPerDay, width: we ? pxPerDay : 1, height, borderLeft: "1px solid var(--border, #e5e7eb)" }} />
    );
  }
  return <>{lines}</>;
}

/* ── Gantt bar ───────────────────────────────────────────────────────────── */

function Bar({ task, top, left, width, color, selected, onSelect, onStartDrag, onStartLink }: {
  task: PlanningTask; top: number; left: number; width: number; color: string;
  selected: boolean; onSelect: () => void;
  onStartDrag: (e: React.PointerEvent, t: PlanningTask, mode: "move" | "resize-left" | "resize-right") => void;
  onStartLink: (e: React.PointerEvent, t: PlanningTask) => void;
}) {
  const y = top + (ROW_H - BAR_H) / 2;

  if (task.is_milestone) {
    return (
      <div data-task={task.task_id} className="qcm-bar absolute z-10 rotate-45 cursor-pointer rounded-sm shadow"
        style={{ left, top: top + ROW_H / 2 - 7, width: 14, height: 14, background: color }}
        title={`${task.subject}\n${fmt(task.exp_start_date, true)}`} onClick={onSelect} />
    );
  }

  if (task.is_group) {
    return (
      <div data-task={task.task_id} className="qcm-bar absolute z-10" style={{ left, top: top + ROW_H / 2 - 3, width, height: 7 }} title={task.subject} onClick={onSelect}>
        <div className="h-full w-full rounded" style={{ background: color, opacity: 0.55 }} />
        <div className="absolute -left-0.5 -top-0.5 h-2.5 w-1 rounded-sm" style={{ background: color }} />
        <div className="absolute -right-0.5 -top-0.5 h-2.5 w-1 rounded-sm" style={{ background: color }} />
      </div>
    );
  }

  const prog = Math.max(0, Math.min(100, task.progress || 0));
  return (
    <div
      data-task={task.task_id}
      onPointerDown={(e) => onStartDrag(e, task, "move")}
      onClick={onSelect}
      className={`qcm-bar group absolute z-10 flex cursor-grab items-center overflow-visible rounded shadow-sm ring-offset-1 transition-shadow active:cursor-grabbing ${selected ? "ring-2 ring-primary" : ""} ${task.is_critical ? "ring-1 ring-red-500" : ""}`}
      style={{ left, top: y, width, height: BAR_H, background: color }}
      title={`${task.subject}\n${fmt(task.exp_start_date, true)} → ${fmt(task.exp_end_date, true)}\nProgress ${Math.round(prog)}%${task.is_critical ? "\n★ Critical Path" : ""}`}
    >
      <div className="absolute left-0 top-0 h-full rounded-l bg-black/25" style={{ width: `${prog}%` }} />
      <span className="relative z-10 truncate px-2 text-[11px] font-semibold text-white drop-shadow-sm">{task.subject}</span>
      <div onPointerDown={(e) => onStartDrag(e, task, "resize-left")} className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize rounded-l opacity-0 group-hover:opacity-100 group-hover:bg-white/40" />
      <div onPointerDown={(e) => onStartDrag(e, task, "resize-right")} className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize rounded-r opacity-0 group-hover:opacity-100 group-hover:bg-white/40" />
      <div onPointerDown={(e) => onStartLink(e, task)} title="Drag to create dependency" className="absolute -right-2.5 top-1/2 z-20 h-3.5 w-3.5 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-slate-700 opacity-0 shadow group-hover:opacity-100" />
    </div>
  );
}

/* ── Dependency layer ────────────────────────────────────────────────────── */

function DependencyLayer({ payload, rowIndex, xOf, pxPerDay, width, height, onRemove }: {
  payload: PlanningPayload; rowIndex: Record<string, number>;
  xOf: (d: Date) => number; pxPerDay: number; width: number; height: number;
  onRemove: (from: string, to: string) => void;
}) {
  const byId = useMemo(() => {
    const m: Record<string, PlanningTask> = {};
    payload.tasks.forEach((t) => (m[t.task_id] = t));
    return m;
  }, [payload]);

  const paths: React.ReactNode[] = [];
  payload.dependencies.forEach((dep, idx) => {
    const from = byId[dep.from], to = byId[dep.to];
    if (!from || !to) return;
    if (!(dep.from in rowIndex) || !(dep.to in rowIndex)) return;
    const fe = parseDate(from.exp_end_date), ts = parseDate(to.exp_start_date);
    if (!fe || !ts) return;
    const x1 = xOf(fe) + pxPerDay, y1 = rowIndex[dep.from] * ROW_H + ROW_H / 2;
    const x2 = xOf(ts),            y2 = rowIndex[dep.to]   * ROW_H + ROW_H / 2;
    const crit = !!from.is_critical && !!to.is_critical;
    const d = `M ${x1} ${y1} H ${x1 + 12} V ${y2} H ${x2}`;
    paths.push(
      <path key={idx} d={d} fill="none" stroke={crit ? "#dc2626" : "#64748b"} strokeWidth={crit ? 2 : 1.5}
        markerEnd={`url(#${crit ? "arrow-c" : "arrow"})`} className="pointer-events-auto cursor-pointer"
        onDoubleClick={() => onRemove(dep.from, dep.to)}>
        <title>Double-click to remove dependency</title>
      </path>
    );
  });

  return (
    <svg className="pointer-events-none absolute inset-0 z-[5]" width={width} height={height}>
      <defs>
        <marker id="arrow"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#64748b" /></marker>
        <marker id="arrow-c" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" /></marker>
      </defs>
      {paths}
    </svg>
  );
}
