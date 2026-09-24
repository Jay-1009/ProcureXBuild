import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { FileText, ClipboardList, Send, Award, Play } from "lucide-react";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/sales/tender-pipeline")({
  component: () => {
    useEffect(() => {
      document.title = "Tender Pipeline — ProcureX";
    }, []);

    const columns = [
      {
        title: "Draft / RFP Review",
        count: 2,
        color: "border-t-muted",
        items: [
          { ref: "RFP-2026-92", title: "Smart City Grid Procurement", deadline: "Aug 15, 2026", value: "$1.2M", probability: "45%" },
          { ref: "RFP-2026-95", title: "Corporate IT Fleet Supply", deadline: "Sep 01, 2026", value: "$340k", probability: "60%" },
        ]
      },
      {
        title: "Proposal Submitted",
        count: 1,
        color: "border-t-info",
        items: [
          { ref: "BID-2026-11", title: "Metro Rail Telecom Cabling", deadline: "Submitted Jul 18", value: "$2.8M", probability: "70%" },
        ]
      },
      {
        title: "Under Evaluation",
        count: 2,
        color: "border-t-amber-500",
        items: [
          { ref: "BID-2026-08", title: "State Warehouse Construction", deadline: "Decision by Aug 10", value: "$4.5M", probability: "80%" },
          { ref: "BID-2026-10", title: "Solar Array Supply Contract", deadline: "Decision by Sep 15", value: "$950k", probability: "55%" },
        ]
      },
      {
        title: "Awarded",
        count: 1,
        color: "border-t-success",
        items: [
          { ref: "AWD-2026-02", title: "Enterprise Database Migration", deadline: "Awarded Jun 28", value: "$620k", probability: "100%" },
        ]
      }
    ];

    return (
      <AppShell title="Tender Pipeline" breadcrumb="Sales / Tender Pipeline">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <PageHeader 
            title="Tender Pipeline Board" 
            description="Manage government and enterprise RFPs, track proposal draft cycles, submitted bids, and awarded contracts." 
          />

          {/* Metric Row */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Active RFPs</span>
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">6 RFPs</h3>
              <p className="mt-1 text-xs text-muted-foreground">4 bids actively compiled</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Total Pipeline Value</span>
                <FileText className="h-4 w-4 text-info" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">$10.41M</h3>
              <p className="mt-1 text-xs text-muted-foreground">Weighted value: $6.21M</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Submitted (Q3)</span>
                <Send className="h-4 w-4 text-success" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-success">3 Submissions</h3>
              <p className="mt-1 text-xs text-success">100% compliance rate</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Awarded Contracts</span>
                <Award className="h-4 w-4 text-info" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">$1.85M</h3>
              <p className="mt-1 text-xs text-muted-foreground">3 tenders won in 2026</p>
            </div>
          </div>

          {/* Kanban Board Grid */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {columns.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-foreground">{col.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-semibold">{col.count}</span>
                </div>
                
                <div className={`flex-1 min-h-[400px] rounded-xl border border-border bg-muted/20 p-3 flex flex-col gap-3 border-t-4 ${col.color}`}>
                  {col.items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab">
                      <div className="flex justify-between items-start text-[11px] text-muted-foreground mb-1.5 font-semibold">
                        <span>{item.ref}</span>
                        <span className="text-primary bg-primary/10 px-1 rounded">Win Prob: {item.probability}</span>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground mb-1 leading-snug">{item.title}</h4>
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{item.value}</span>
                        <span>{item.deadline}</span>
                      </div>
                    </div>
                  ))}
                  {col.items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border/40 rounded-lg p-6 text-center text-xs text-muted-foreground">
                      No tenders in this stage
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </AppShell>
    );
  },
});
