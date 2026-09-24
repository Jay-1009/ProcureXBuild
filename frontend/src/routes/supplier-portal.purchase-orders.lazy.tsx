import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Paperclip,
  MessageSquare,
  FileText,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  Package,
  CircleDollarSign,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type POStatus =
  | "Draft"
  | "To Receive"
  | "To Bill"
  | "Completed"
  | "On Hold"
  | "Cancelled";

type POItem = {
  itemCode: string;
  itemName: string;
  description?: string;
  qty: number;
  receivedQty: number;
  billedQty: number;
  uom: string;
  rate: number;
  amount: number;
  deliveryDate?: string;
  warehouse?: string;
};

type Attachment = {
  name: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
};

type Comment = {
  user: string;
  text: string;
  at: string;
};

type PO = {
  id: string;
  supplier: string;
  orderDate: string;
  requiredBy: string;
  status: POStatus;
  lastModified: string;
  grandTotal: number;
  currency: string;
  company: string;
  perReceived: number;
  perBilled: number;
  items: POItem[];
  attachments: Attachment[];
  comments: Comment[];
};

// ─── API helper (same pattern as RFQ / Quotations pages) ─────────────────────

async function frappePost<T>(method: string): Promise<T> {
  const res = await fetch(`/api/method/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data as { message: T }).message;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createLazyFileRoute("/supplier-portal/purchase-orders")({
  component: PurchaseOrdersPage,
});

// ─── Main Page ────────────────────────────────────────────────────────────────

function PurchaseOrdersPage() {
  useEffect(() => {
    document.title = "Purchase Orders — ProcureX";
  }, []);

  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | POStatus>("All");
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Fetch from Frappe ──────────────────────────────────────────────────────
  const loadPOs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await frappePost<PO[]>("procurex.api.get_purchase_orders");
      const list = data ?? [];
      setPos(list);
    } catch (err) {
      console.error("Failed to load purchase orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      pos.filter(
        (p) =>
          (statusFilter === "All" || p.status === statusFilter) &&
          (query === "" ||
            p.id.toLowerCase().includes(query.toLowerCase()) ||
            p.company.toLowerCase().includes(query.toLowerCase())),
      ),
    [pos, query, statusFilter],
  );

  const active = activeId ? pos.find((p) => p.id === activeId) ?? null : null;

  // Reset activeId when filter changes wipe out current selection
  useEffect(() => {
    if (activeId && !filtered.find((p) => p.id === activeId)) {
      setActiveId(null);
    }
  }, [filtered, activeId]);

  return (
    <AppShell title="Purchase Orders" breadcrumb="Supplier Portal / Purchase Orders">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <PageHeader
          title="Purchase Orders"
          description="Read-only view of purchase orders issued to you by the buyer. Synced live from ERPNext."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPOs(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />

        <div
          className={`mt-6 grid grid-cols-1 gap-4 ${
            active ? "lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" : ""
          }`}
        >

          {/* ── Left: List/Table panel ───────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card">
            {/* Search + status filter */}
            <div className="space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search PO ID or buyer…"
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                {(
                  ["All", "To Receive", "To Bill", "Completed", "On Hold", "Cancelled"] as const
                ).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors ${statusFilter === s
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {s === "All" ? "All" : s}
                  </button>
                ))}
              </div>
            </div>

            {active ? (
              /* List view when a PO is active */
              <ul className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <ListSkeleton />
                ) : filtered.length === 0 ? (
                  <li className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No purchase orders match your filters.
                  </li>
                ) : (
                  filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setActiveId(p.id)}
                        className={`w-full border-b border-border px-3 py-3 text-left transition-colors last:border-0 ${active?.id === p.id ? "bg-muted" : "hover:bg-muted/40"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {p.id}
                          </span>
                          <StatusPill status={p.status} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.company || p.supplier}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Ordered {p.orderDate || "—"}</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(p.grandTotal, p.currency)}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              /* Full table view when no PO is active */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2.5">PO ID</th>
                      <th className="px-4 py-2.5">Buyer</th>
                      <th className="px-4 py-2.5">Order Date</th>
                      <th className="px-4 py-2.5">Required By</th>
                      <th className="px-4 py-2.5 text-right">Grand Total</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span>Loading purchase orders...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          No purchase orders match your filters.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setActiveId(p.id)}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{p.id}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.company || p.supplier}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.orderDate || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.requiredBy || "—"}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">
                            {formatCurrency(p.grandTotal, p.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={p.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Right: Detail panel ──────────────────────────────────────── */}
          {active && (
            <div className="rounded-xl border border-border bg-card p-5">
              {loading ? (
                <DetailSkeleton />
              ) : (
                <DetailPanel po={active} onClose={() => setActiveId(null)} />
              )}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ po, onClose }: { po: PO; onClose: () => void }) {
  const totalItems = po.items.length;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {po.id}
            <a
              href={`/app/purchase-order/${po.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
              title="Open in ERPNext"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div> */}
          <div className="mt-0.5 text-lg font-semibold text-foreground">
            {po.company || po.supplier}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusPill status={po.status} />
            {po.lastModified && (
              <span>Last updated {po.lastModified.slice(0, 10)}</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary info cells */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <InfoCell label="Grand Total" value={formatCurrency(po.grandTotal, po.currency)} />
        <InfoCell label="Order Date" value={po.orderDate || "—"} />
        <InfoCell label="Required By" value={po.requiredBy || "—"} />
        <InfoCell label="Line Items" value={String(totalItems)} />
      </div>

      {/* Fulfilment progress bars */}
      {(po.perReceived > 0 || po.perBilled > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ProgressCell
            label="Received"
            pct={po.perReceived}
            icon={<Package className="h-3 w-3" />}
            color="text-success"
            barColor="bg-success"
          />
          <ProgressCell
            label="Billed"
            pct={po.perBilled}
            icon={<CircleDollarSign className="h-3 w-3" />}
            color="text-primary"
            barColor="bg-primary"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="lines" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="lines" className="flex-1">
            Items ({totalItems})
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            Attachments ({po.attachments.length})
            {po.comments.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {po.comments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Items tab ───────────────────────────────────────────────── */}
        <TabsContent value="lines" className="mt-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Recv'd</th>
                  <th className="px-3 py-2">UOM</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {po.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No line items.
                    </td>
                  </tr>
                ) : (
                  po.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border last:border-0 align-top"
                    >
                      <td className="px-3 py-2 min-w-[120px]">
                        <div className="font-medium text-foreground">
                          {item.itemName || item.itemCode}
                        </div>
                        {item.itemCode !== item.itemName && (
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {item.itemCode}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <DescriptionCell text={item.description} />
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{item.qty}</td>
                      <td className="px-3 py-2 text-right">
                        <ReceivedQtyCell qty={item.qty} receivedQty={item.receivedQty} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{item.uom}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCurrency(item.rate, "INR")}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(item.amount || item.qty * item.rate, "INR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {po.items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-surface-panel/30">
                    <td
                      colSpan={6}
                      className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {formatCurrency(po.grandTotal, po.currency)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </TabsContent>

        {/* ── Attachments + Comments tab ──────────────────────────────── */}
        <TabsContent value="activity" className="mt-3 space-y-6">
          {/* Attachments */}
          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attachments
            </div>
            {po.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attachments on this purchase order.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {po.attachments.map((a) => (
                  <li
                    key={a.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{a.fileName}</span>
                    {a.fileUrl && (
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-primary hover:text-primary/80"
                        title="Download"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {a.createdAt && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {a.createdAt.slice(0, 10)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Comments */}
          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Comments
            </div>
            {po.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {po.comments.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span className="font-medium text-foreground">{c.user}</span>
                      <span>· {c.at.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 leading-relaxed text-foreground">{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DescriptionCell({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return (
      <span className="italic font-normal text-muted-foreground/40">
        No description
      </span>
    );
  }

  const LIMIT = 60;
  const isLong = text.length > LIMIT;

  if (!isLong) {
    return <span className="font-normal text-muted-foreground">{text}</span>;
  }

  return (
    <div className="max-w-[260px]">
      <span className="break-words leading-relaxed font-normal text-muted-foreground">
        {expanded ? text : `${text.slice(0, LIMIT)}…`}
      </span>
      <button
        onClick={() => setExpanded(!expanded)}
        className="ml-1.5 inline-block whitespace-nowrap text-[11px] font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

/** Shows receivedQty in green if fully received, amber if partial, muted if zero */
function ReceivedQtyCell({ qty, receivedQty }: { qty: number; receivedQty: number }) {
  if (receivedQty === 0) {
    return <span className="text-muted-foreground">0</span>;
  }
  const full = receivedQty >= qty;
  return (
    <span className={full ? "text-success font-medium" : "text-warning font-medium"}>
      {receivedQty}
    </span>
  );
}

function ProgressCell({
  label,
  pct,
  icon,
  color,
  barColor,
}: {
  label: string;
  pct: number;
  icon: React.ReactNode;
  color: string;
  barColor: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className={`text-sm font-semibold ${color}`}>{Math.round(clamped)}%</span>
      </div>
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

function StatusPill({ status }: { status: POStatus }) {
  const styleMap: Record<POStatus, string> = {
    Draft: "border-border bg-muted text-muted-foreground",
    "To Receive": "border-primary/30 bg-primary/10 text-primary",
    "To Bill": "border-warning/30 bg-warning/10 text-warning",
    Completed: "border-success/30 bg-success/10 text-success",
    "On Hold": "border-warning/30 bg-warning/10 text-warning",
    Cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  return (
    <Badge variant="outline" className={styleMap[status]}>
      {status}
    </Badge>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <li key={i} className="border-b border-border px-3 py-3 last:border-0 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-4 w-16 rounded-full bg-muted" />
          </div>
          <div className="mt-1.5 h-2.5 w-40 rounded bg-muted/60" />
          <div className="mt-1.5 h-2 w-32 rounded bg-muted/40" />
        </li>
      ))}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="h-6 w-56 rounded bg-muted" />
      <div className="mt-5 grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-muted/60" />
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "INR"): string {
  if (!amount && amount !== 0) return "—";
  if (currency === "INR") {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}