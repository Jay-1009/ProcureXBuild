import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, X } from "lucide-react";

type RFQ = {
  id: string;
  issueDate: string;
  requiredBy: string;
  summary: string;
  buyer: string;
  status: "Open" | "Closed";
  items: { part: string; qty: number; uom: string; description?: string }[];
};

export const Route = createLazyFileRoute("/supplier-portal/rfq")({
  component: RfqPage,
});

function RfqPage() {
  const search = useSearch({ strict: false }) as { rfqId?: string };
  const rfqIdFromSearch = search.rfqId;

  useEffect(() => {
    document.title = "Request for Quotation — ProcureX";
  }, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Open" | "Closed">("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rfqIdFromSearch) {
      setActiveId(rfqIdFromSearch);
    }
  }, [rfqIdFromSearch]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/method/procurex.api.get_rfqs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.message) {
            setRfqs(data.message);
          }
        }
      } catch (err) {
        console.error("Failed to load RFQs:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      rfqs.filter(
        (r) =>
          (status === "All" || r.status === status) &&
          (query === "" ||
            r.id.toLowerCase().includes(query.toLowerCase()) ||
            r.summary.toLowerCase().includes(query.toLowerCase())),
      ),
    [rfqs, query, status],
  );
  const active = activeId ? rfqs.find((r) => r.id === activeId) ?? null : null;

  return (
    <AppShell title="Request for Quotation" breadcrumb="Supplier Portal / RFQ">
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <PageHeader
          title="Request for Quotation"
          description="Read-only view of RFQs sent to you by the buyer."
        />

        <div
          className={`mt-6 grid grid-cols-1 gap-4 ${
            active ? "lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" : ""
          }`}
        >
          <div className="rounded-xl border border-border bg-card">
            <div className="space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search RFQ ID or items..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                {(["All", "Open", "Closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      status === s
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {active ? (
              <ul className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <li className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</li>
                ) : (
                  rows.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setActiveId(r.id)}
                        className={`w-full border-b border-border px-3 py-3 text-left transition-colors last:border-0 ${
                          active.id === r.id ? "bg-muted" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-foreground">{r.id}</div>
                          <StatusPill status={r.status} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{r.summary}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Issued {r.issueDate} · Required {r.requiredBy}
                        </div>
                      </button>
                    </li>
                  ))
                )}
                {!loading && rows.length === 0 && (
                  <li className="px-4 py-12 text-center text-sm text-muted-foreground">No RFQs match.</li>
                )}
              </ul>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">RFQ ID</th>
                    <th className="px-4 py-2.5">Buyer</th>
                    <th className="px-4 py-2.5">Issue Date</th>
                    <th className="px-4 py-2.5">Required By</th>
                    <th className="px-4 py-2.5">Items Requested</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setActiveId(r.id)}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{r.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.buyer}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.issueDate}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.requiredBy}</td>
                        <td className="px-4 py-3 text-foreground">{r.summary}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={r.status} />
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No RFQs match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {active && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> {active.id}
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-foreground">{active.summary}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusPill status={active.status} />
                    <span>Buyer: {active.buyer}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveId(null)}
                  aria-label="Close details"
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                <InfoCell label="Issue Date" value={active.issueDate} />
                <InfoCell label="Required By" value={active.requiredBy} />
                <InfoCell label="Line Items" value={String(active.items.length)} />
              </div>

              <div className="mt-6">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Requested Items
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-panel/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">Part / Item</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2">UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.items.map((i) => (
                        <tr key={i.part} className="border-b border-border last:border-0 align-top">
                          <td className="px-3 py-2 font-medium text-foreground min-w-[120px]">{i.part}</td>
                          <td className="px-3 py-2">
                            <DescriptionCell text={i.description} />
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">{i.qty}</td>
                          <td className="px-3 py-2 text-muted-foreground">{i.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function DescriptionCell({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) {
    return <span className="text-muted-foreground/40 font-normal italic">No description</span>;
  }

  const limit = 60;
  const isLong = text.length > limit;

  if (!isLong) {
    return <span className="text-muted-foreground font-normal">{text}</span>;
  }

  return (
    <div className="max-w-[280px]">
      <span className="text-muted-foreground font-normal break-words leading-relaxed">
        {expanded ? text : `${text.slice(0, limit)}...`}
      </span>
      <button
        onClick={() => setExpanded(!expanded)}
        className="ml-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors inline-block whitespace-nowrap focus:outline-none"
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

function StatusPill({ status }: { status: RFQ["status"] }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "Open"
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground"
      }
    >
      {status}
    </Badge>
  );
}