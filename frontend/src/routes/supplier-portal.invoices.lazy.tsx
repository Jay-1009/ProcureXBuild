import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Paperclip,
  MessageSquare,
  FileText,
  ExternalLink,
  RefreshCw,
  X,
  Receipt,
  CircleDollarSign,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PayStatus =
  | "Draft"
  | "Unpaid"
  | "Partly Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled"
  | "Return";

type InvoiceItem = {
  itemCode: string;
  itemName: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  netAmount: number;
  taxTemplate?: string;
  purchaseOrder?: string;
};

type TaxRow = {
  description: string;
  amount: number;
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

type Invoice = {
  id: string;
  billNo: string;
  postingDate: string;
  billDate: string;
  dueDate: string;
  status: PayStatus;
  grandTotal: number;
  netTotal: number;
  totalTax: number;
  outstandingAmount: number;
  paidAmount: number;
  currency: string;
  company: string;
  poNo: string;
  isReturn: boolean;
  paymentTerms: string;
  lastModified: string;
  items: InvoiceItem[];
  taxes: TaxRow[];
  attachments: Attachment[];
  comments: Comment[];
};

// ─── API helper ───────────────────────────────────────────────────────────────

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

export const Route = createLazyFileRoute("/supplier-portal/invoices")({
  component: InvoicesPage,
});

// ─── Main Page ────────────────────────────────────────────────────────────────

function InvoicesPage() {
  useEffect(() => {
    document.title = "Invoices — ProcureX";
  }, []);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | PayStatus>("All");
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Fetch from Frappe ──────────────────────────────────────────────────────
  const loadInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await frappePost<Invoice[]>("procurex.api.get_purchase_invoices");
      setInvoices(data ?? []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (statusFilter === "All" || i.status === statusFilter) &&
          (query === "" ||
            i.id.toLowerCase().includes(query.toLowerCase()) ||
            i.poNo.toLowerCase().includes(query.toLowerCase()) ||
            i.billNo.toLowerCase().includes(query.toLowerCase())),
      ),
    [invoices, query, statusFilter],
  );

  const active = activeId ? invoices.find((i) => i.id === activeId) ?? null : null;

  // ── Summary counts for the status bar ─────────────────────────────────────
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;
  const unpaidTotal = invoices
    .filter((i) => i.status === "Unpaid" || i.status === "Partly Paid" || i.status === "Overdue")
    .reduce((s, i) => s + i.outstandingAmount, 0);

  return (
    <AppShell title="Invoices" breadcrumb="Supplier Portal / Invoices">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <PageHeader
          title="Invoices"
          description="Read-only view of purchase invoices raised against your purchase orders. Synced live from ERPNext."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadInvoices(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />

        {/* ── Outstanding / Overdue summary strip ───────────────────────── */}
        {!loading && (overdueCount > 0 || unpaidTotal > 0) && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
            {unpaidTotal > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                <CircleDollarSign className="h-5 w-5 shrink-0 text-warning" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Outstanding Balance
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatCurrency(unpaidTotal, "INR")}
                  </div>
                </div>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Overdue Invoices
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {overdueCount} invoice{overdueCount > 1 ? "s" : ""} past due
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Master / Detail grid ──────────────────────────────────────── */}
        <div
          className={`mt-5 grid grid-cols-1 gap-4 ${active ? "lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]" : ""
            }`}
        >
          {/* ── Left: List panel ────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card">
            {/* Search + filter */}
            <div className="space-y-2 border-b border-border p-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search invoice, PO or bill no…"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                {(
                  ["All", "Unpaid", "Partly Paid", "Overdue", "Paid", "Cancelled"] as const
                ).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 rounded-md px-1 py-1 text-[10px] font-medium transition-colors ${statusFilter === s
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* List — compact when detail is open, full table otherwise */}
            {active ? (
              <ul className="max-h-[640px] overflow-y-auto">
                {loading ? (
                  <ListSkeleton />
                ) : filtered.length === 0 ? (
                  <li className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No invoices match your filters.
                  </li>
                ) : (
                  filtered.map((inv) => (
                    <li key={inv.id}>
                      <button
                        onClick={() => setActiveId(inv.id)}
                        className={`w-full border-b border-border px-3 py-3 text-left transition-colors last:border-0 ${active.id === inv.id ? "bg-muted" : "hover:bg-muted/40"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {inv.id}
                          </span>
                          <PayPill status={inv.status} />
                        </div>
                        {inv.poNo && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            PO: {inv.poNo}
                          </div>
                        )}
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {inv.postingDate || "—"}
                            {inv.dueDate ? ` · Due ${inv.dueDate}` : ""}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(inv.grandTotal, inv.currency)}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              /* Full table when nothing is selected */
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Invoice ID</th>
                    <th className="px-4 py-2.5">Bill No.</th>
                    <th className="px-4 py-2.5">PO Reference</th>
                    <th className="px-4 py-2.5">Posting Date</th>
                    <th className="px-4 py-2.5">Due Date</th>
                    <th className="px-4 py-2.5 text-right">Grand Total</th>
                    <th className="px-4 py-2.5 text-right">Outstanding</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        Loading invoices…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        No invoices match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => setActiveId(inv.id)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="flex items-center gap-1.5">
                            {inv.isReturn && (
                              <span
                                title="Debit Note / Return"
                                className="text-[10px] font-semibold text-destructive"
                              >
                                DR
                              </span>
                            )}
                            {inv.id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inv.billNo || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inv.poNo || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inv.postingDate || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <DueDateCell
                            dueDate={inv.dueDate}
                            status={inv.status}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {formatCurrency(inv.grandTotal, inv.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <OutstandingCell
                            outstanding={inv.outstandingAmount}
                            currency={inv.currency}
                            status={inv.status}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <PayPill status={inv.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Right: Detail panel ──────────────────────────────────────── */}
          {active && (
            <DetailPanel
              invoice={active}
              onClose={() => setActiveId(null)}
            />
          )}
        </div>
      </main>
    </AppShell>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  invoice: inv,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const paidPct =
    inv.grandTotal > 0
      ? Math.min(100, (inv.paidAmount / inv.grandTotal) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{inv.id}</span>
            <a
              href={`/app/purchase-invoice/${inv.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-0.5 text-primary hover:underline"
              title="Open in ERPNext"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <PayPill status={inv.status} />
            {inv.isReturn && (
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/10 text-destructive"
              >
                Debit Note
              </Badge>
            )}
            {inv.poNo && (
              <span className="text-xs text-muted-foreground">
                PO: {inv.poNo}
              </span>
            )}
            {inv.billNo && (
              <span className="text-xs text-muted-foreground">
                · Supplier Ref: {inv.billNo}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close details"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Info cells */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <InfoCell label="Grand Total" value={formatCurrency(inv.grandTotal, inv.currency)} />
        <InfoCell label="Posting Date" value={inv.postingDate || "—"} />
        <InfoCell label="Due Date" value={inv.dueDate || "—"} />
        <InfoCell label="Line Items" value={String(inv.items.length)} />
      </div>

      {/* Payment progress */}
      {inv.grandTotal > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Payment Progress</span>
            <span>{Math.round(paidPct)}% paid</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${paidPct >= 100 ? "bg-success" : paidPct > 0 ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</div>
              <div className="text-xs font-semibold text-foreground">
                {formatCurrency(inv.netTotal, inv.currency)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tax</div>
              <div className="text-xs font-semibold text-foreground">
                {formatCurrency(inv.totalTax, inv.currency)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Outstanding
              </div>
              <div
                className={`text-xs font-semibold ${inv.outstandingAmount > 0 ? "text-warning" : "text-success"
                  }`}
              >
                {formatCurrency(inv.outstandingAmount, inv.currency)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="items" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="items" className="flex-1">
            Items ({inv.items.length})
          </TabsTrigger>
          {inv.taxes.length > 0 && (
            <TabsTrigger value="taxes" className="flex-1">
              Taxes ({inv.taxes.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="activity" className="flex-1">
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            Attachments ({inv.attachments.length})
            {inv.comments.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {inv.comments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Items tab ───────────────────────────────────────────── */}
        <TabsContent value="items" className="mt-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2">UOM</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No line items.
                    </td>
                  </tr>
                ) : (
                  inv.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border last:border-0 align-top"
                    >
                      <td className="px-3 py-2 min-w-[120px]">
                        <div className="font-medium text-foreground">
                          {item.itemName || item.itemCode}
                        </div>
                        {item.itemCode !== item.itemName && item.itemCode && (
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {item.itemCode}
                          </div>
                        )}
                        {item.purchaseOrder && (
                          <div className="text-[10px] text-muted-foreground/70">
                            PO: {item.purchaseOrder}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <DescriptionCell text={item.description} />
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{item.qty}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.uom}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCurrency(item.rate, inv.currency)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(item.amount, inv.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {inv.items.length > 0 && (
                <tfoot>
                  {inv.totalTax > 0 && (
                    <tr className="border-t border-border bg-surface-panel/20">
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-right text-xs text-muted-foreground"
                      >
                        Net Total
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-foreground">
                        {formatCurrency(inv.netTotal, inv.currency)}
                      </td>
                    </tr>
                  )}
                  {inv.totalTax > 0 && (
                    <tr className="border-t border-border bg-surface-panel/20">
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-right text-xs text-muted-foreground"
                      >
                        Total Tax
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-foreground">
                        {formatCurrency(inv.totalTax, inv.currency)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-border bg-surface-panel/40">
                    <td
                      colSpan={5}
                      className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </TabsContent>

        {/* ── Taxes tab (conditional) ─────────────────────────────── */}
        {inv.taxes.length > 0 && (
          <TabsContent value="taxes" className="mt-3">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Tax / Charge</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.taxes.map((t, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 text-foreground">{t.description}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(t.amount, inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface-panel/40">
                    <td className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Tax
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {formatCurrency(inv.totalTax, inv.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>
        )}

        {/* ── Attachments + Comments tab ──────────────────────────── */}
        <TabsContent value="activity" className="mt-3 space-y-6">
          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attachments
            </div>
            {inv.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attachments on this invoice.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {inv.attachments.map((a) => (
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

          <section>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Comments
            </div>
            {inv.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {inv.comments.map((c, i) => (
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
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DescriptionCell({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return (
      <span className="italic font-normal text-muted-foreground/40">No description</span>
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

/** Highlights overdue dates in red */
function DueDateCell({ dueDate, status }: { dueDate: string; status: PayStatus }) {
  if (!dueDate) return <span className="text-muted-foreground">—</span>;
  const isOverdue = status === "Overdue";
  return (
    <span className={isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}>
      {dueDate}
    </span>
  );
}

/** Shows outstanding amount — green zero, amber if partial, red if overdue */
function OutstandingCell({
  outstanding,
  currency,
  status,
}: {
  outstanding: number;
  currency: string;
  status: PayStatus;
}) {
  if (outstanding === 0 || status === "Paid") {
    return <span className="text-success font-medium">—</span>;
  }
  const color = status === "Overdue" ? "text-destructive" : "text-warning";
  return (
    <span className={`font-medium ${color}`}>
      {formatCurrency(outstanding, currency)}
    </span>
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

function PayPill({ status }: { status: PayStatus }) {
  const styleMap: Record<PayStatus, string> = {
    Draft: "border-border bg-muted text-muted-foreground",
    Unpaid: "border-warning/30 bg-warning/10 text-warning",
    "Partly Paid": "border-primary/30 bg-primary/10 text-primary",
    Paid: "border-success/30 bg-success/10 text-success",
    Overdue: "border-destructive/30 bg-destructive/10 text-destructive",
    Cancelled: "border-border bg-muted text-muted-foreground",
    Return: "border-destructive/30 bg-destructive/10 text-destructive",
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
            <div className="h-3 w-36 rounded bg-muted" />
            <div className="h-4 w-14 rounded-full bg-muted" />
          </div>
          <div className="mt-1.5 h-2.5 w-28 rounded bg-muted/60" />
          <div className="mt-1.5 h-2 w-44 rounded bg-muted/40" />
        </li>
      ))}
    </>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "INR"): string {
  if (amount === undefined || amount === null) return "—";
  if (currency === "INR") {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}