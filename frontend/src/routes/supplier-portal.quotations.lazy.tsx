import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Search,
  FileText,
  X,
  Paperclip,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type QuotationStatus = "Draft" | "Pending" | "Accepted" | "Rejected" | "Cancelled";

type QuotationItem = {
  itemCode: string;
  itemName: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
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

type Quotation = {
  id: string;
  rfq: string;
  submittedDate: string;
  validTill: string;
  status: QuotationStatus;
  grandTotal: number;
  currency: string;
  buyer: string;
  items: QuotationItem[];
  attachments: Attachment[];
  comments: Comment[];
};

type DraftLine = {
  itemCode: string;
  qty: number;
  rate: number;
  uom: string;
  description: string;
};

type OpenRFQ = { id: string; label: string };

// ─── API helpers ─────────────────────────────────────────────────────────────

async function frappePost<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/method/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data as { message: T }).message;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createLazyFileRoute("/supplier-portal/quotations")({
  component: QuotationsPage,
});

// ─── Main Page ───────────────────────────────────────────────────────────────

function QuotationsPage() {
  useEffect(() => {
    document.title = "Supplier Quotations — ProcureX";
  }, []);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | QuotationStatus>("All");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openRfqs, setOpenRfqs] = useState<OpenRFQ[]>([]);
  const [rfqRef, setRfqRef] = useState("");
  const [validTill, setValidTill] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([
    { itemCode: "", qty: 1, rate: 0, uom: "Nos", description: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // ── Load quotations ────────────────────────────────────────────────────────
  const loadQuotations = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await frappePost<Quotation[]>("procurex.api.get_supplier_quotations");
      setQuotations(data ?? []);
    } catch (err) {
      console.error("Failed to load quotations:", err);
      if (silent) toast.error("Could not refresh quotations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      quotations.filter(
        (q) =>
          (statusFilter === "All" || q.status === statusFilter) &&
          (query === "" ||
            q.id.toLowerCase().includes(query.toLowerCase()) ||
            q.rfq.toLowerCase().includes(query.toLowerCase())),
      ),
    [quotations, query, statusFilter],
  );

  const active = activeId ? quotations.find((q) => q.id === activeId) ?? null : null;

  // ── Open dialog & fetch open RFQs ──────────────────────────────────────────
  const openCreateDialog = async () => {
    setDialogOpen(true);
    try {
      const rfqs = await frappePost<OpenRFQ[]>("procurex.api.get_open_rfqs_for_supplier");
      setOpenRfqs(rfqs ?? []);
    } catch {
      toast.error("Could not load open RFQs.");
    }
  };

  // ── Draft line helpers ─────────────────────────────────────────────────────
  const addLine = () =>
    setDraftLines((l) => [...l, { itemCode: "", qty: 1, rate: 0, uom: "Nos", description: "" }]);
  const removeLine = (i: number) =>
    setDraftLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<DraftLine>) =>
    setDraftLines((l) => l.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)));

  const draftTotal = draftLines.reduce((s, l) => s + l.qty * l.rate, 0);

  // ── Submit new quotation ───────────────────────────────────────────────────
  const submitQuotation = async () => {
    if (!rfqRef || !validTill) {
      toast.error("RFQ reference and valid-till date are required.");
      return;
    }
    if (draftLines.some((l) => !l.itemCode)) {
      toast.error("All line items must have an item code.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await frappePost<{ name: string; status: string }>(
        "procurex.api.submit_supplier_quotation",
        {
          rfq: rfqRef,
          valid_till: validTill,
          items: draftLines,
        },
      );
      toast.success(`Quotation ${result.name} submitted successfully.`);
      setDialogOpen(false);
      setRfqRef("");
      setValidTill("");
      setDraftLines([{ itemCode: "", qty: 1, rate: 0, uom: "Nos", description: "" }]);
      // Reload to get the new record from ERPNext
      await loadQuotations(true);
    } catch (err) {
      toast.error(`Submission failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    if (!submitting) {
      setDialogOpen(false);
      setRfqRef("");
      setValidTill("");
      setDraftLines([{ itemCode: "", qty: 1, rate: 0, uom: "Nos", description: "" }]);
    }
  };

  return (
    <AppShell title="Supplier Quotation" breadcrumb="Supplier Portal / Quotations">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <PageHeader
          title="Supplier Quotations"
          description="Submit quotations against buyer RFQs. Synced live from ERPNext."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadQuotations(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-1.5 h-4 w-4" /> New Quotation
              </Button>
            </div>
          }
        />

        {/* ── Master / Detail grid ─────────────────────────────────────── */}
        <div
          className={`mt-6 grid grid-cols-1 gap-4 ${active ? "lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" : ""
            }`}
        >
          {/* ── Left: List panel ────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card">
            {/* Search + filter bar */}
            <div className="space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search quotation ID or RFQ..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                {(["All", "Draft", "Pending", "Accepted", "Rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
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

            {/* Compact list (when detail panel is open) */}
            {active ? (
              <ul className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <ListSkeleton />
                ) : filtered.length === 0 ? (
                  <li className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No quotations match your filters.
                  </li>
                ) : (
                  filtered.map((q) => (
                    <li key={q.id}>
                      <button
                        onClick={() => setActiveId(q.id)}
                        className={`w-full border-b border-border px-3 py-3 text-left transition-colors last:border-0 ${active.id === q.id ? "bg-muted" : "hover:bg-muted/40"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{q.id}</span>
                          <StatusPill status={q.status} />
                        </div>
                        {q.rfq && (
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            RFQ:{" "}
                            <Link
                              to="/supplier-portal/rfq"
                              search={{ rfqId: q.rfq }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline font-medium"
                            >
                              {q.rfq}
                            </Link>
                          </div>
                        )}
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Submitted {q.submittedDate || "—"}</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(q.grandTotal, q.currency)}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              /* Full table (no detail panel) */
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Quotation ID</th>
                    <th className="px-4 py-2.5">RFQ Ref</th>
                    <th className="px-4 py-2.5">Buyer</th>
                    <th className="px-4 py-2.5">Submitted</th>
                    <th className="px-4 py-2.5">Valid Till</th>
                    <th className="px-4 py-2.5 text-right">Grand Total</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Loading quotations…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No quotations match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((q) => (
                      <tr
                        key={q.id}
                        onClick={() => setActiveId(q.id)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{q.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {q.rfq ? (
                            <Link
                              to="/supplier-portal/rfq"
                              search={{ rfqId: q.rfq }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline font-medium"
                            >
                              {q.rfq}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{q.buyer || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{q.submittedDate || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{q.validTill || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {formatCurrency(q.grandTotal, q.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={q.status} />
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
              quotation={active}
              onClose={() => setActiveId(null)}
            />
          )}
        </div>
      </main>

      {/* ── Create Quotation Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Supplier Quotation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* RFQ + Valid Till */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>RFQ Reference</Label>
                <Select value={rfqRef} onValueChange={setRfqRef}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select open RFQ…" />
                  </SelectTrigger>
                  <SelectContent>
                    {openRfqs.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No open RFQs found.
                      </div>
                    ) : (
                      openRfqs.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valid Till</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                />
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2">Item Code</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2 w-16">Qty</th>
                    <th className="px-2 py-2 w-20">UOM</th>
                    <th className="px-2 py-2 w-24">Rate (₹)</th>
                    <th className="px-2 py-2 w-24 text-right">Amount</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftLines.map((l, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-2 py-1.5">
                        <Input
                          value={l.itemCode}
                          onChange={(e) => updateLine(i, { itemCode: e.target.value })}
                          placeholder="e.g. PIPE-SCH40"
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={l.description}
                          onChange={(e) => updateLine(i, { description: e.target.value })}
                          placeholder="Optional"
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={l.qty}
                          onChange={(e) => updateLine(i, { qty: +e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={l.uom}
                          onChange={(e) => updateLine(i, { uom: e.target.value })}
                          className="h-8"
                          placeholder="Nos"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={l.rate}
                          onChange={(e) => updateLine(i, { rate: +e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right text-xs font-medium text-foreground">
                        ₹{Math.round(l.qty * l.rate).toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => removeLine(i)}
                          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add line
              </Button>
              <div className="text-sm">
                <span className="text-muted-foreground">Subtotal (excl. tax): </span>
                <span className="font-semibold text-foreground">
                  ₹{Math.round(draftTotal).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitQuotation} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit to ERPNext"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  quotation: q,
  onClose,
}: {
  quotation: Quotation;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {q.id}
            <a
              href={`/app/supplier-quotation/${q.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-0.5 inline-flex items-center gap-0.5 text-primary hover:underline"
              title="Open in ERPNext"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div> */}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <StatusPill status={q.status} />
            {q.rfq && (
              <span className="text-xs text-muted-foreground">
                RFQ:{" "}
                <Link
                  to="/supplier-portal/rfq"
                  search={{ rfqId: q.rfq }}
                  className="text-primary hover:underline font-medium"
                >
                  {q.rfq}
                </Link>
              </span>
            )}
            {q.buyer && (
              <span className="text-xs text-muted-foreground">· Buyer: {q.buyer}</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cells */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <InfoCell label="Submitted" value={q.submittedDate || "—"} />
        <InfoCell label="Valid Till" value={q.validTill || "—"} />
        <InfoCell label="Line Items" value={String(q.items.length)} />
        <InfoCell
          label="Grand Total"
          value={formatCurrency(q.grandTotal, q.currency)}
        />
      </div>

      {/* Tabs: Items / Attachments & Comments */}
      <div className="mt-6">
        <Tabs defaultValue="items">
          <TabsList className="w-full">
            <TabsTrigger value="items" className="flex-1">
              Items ({q.items.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
              Attachments ({q.attachments.length})
              {q.comments.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-0.5">
                  <MessageSquare className="h-3 w-3" />
                  {q.comments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Items tab */}
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
                  {q.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    q.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border last:border-0 align-top"
                      >
                        <td className="px-3 py-2 font-medium text-foreground min-w-[120px]">
                          {item.itemName || item.itemCode}
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
                        <td className="px-3 py-2 text-muted-foreground">{item.uom}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatCurrency(item.rate, q.currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-foreground">
                          {formatCurrency(item.amount || item.qty * item.rate, q.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {q.items.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-border bg-surface-panel/30">
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {formatCurrency(q.grandTotal, q.currency)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </TabsContent>

          {/* Attachments + Comments tab */}
          <TabsContent value="activity" className="mt-3 space-y-6">
            {/* Attachments */}
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Attachments
              </div>
              {q.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments on this quotation.</p>
              ) : (
                <ul className="space-y-1.5">
                  {q.attachments.map((a) => (
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
              {q.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {q.comments.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border bg-surface p-3 text-sm"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span className="font-medium text-foreground">{c.user}</span>
                        <span>· {c.at.slice(0, 10)}</span>
                      </div>
                      <p className="mt-1 text-foreground leading-relaxed">{c.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: QuotationStatus }) {
  const styleMap: Record<QuotationStatus, string> = {
    Draft: "border-border bg-muted text-muted-foreground",
    Pending: "border-warning/30 bg-warning/10 text-warning",
    Accepted: "border-success/30 bg-success/10 text-success",
    Rejected: "border-destructive/30 bg-destructive/10 text-destructive",
    Cancelled: "border-border bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={styleMap[status]}>
      {status}
    </Badge>
  );
}

function ListSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <li key={i} className="border-b border-border px-3 py-3 last:border-0 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-4 w-16 rounded-full bg-muted" />
          </div>
          <div className="mt-1.5 h-2.5 w-48 rounded bg-muted/60" />
          <div className="mt-1.5 h-2 w-40 rounded bg-muted/40" />
        </li>
      ))}
    </>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

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