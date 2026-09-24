import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { ShieldAlert, Heart, ClipboardCheck, AlertOctagon, Plus, Check } from "lucide-react";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/project/hse")({
  component: () => {
    useEffect(() => {
      document.title = "HSE — ProcureX";
    }, []);

    const alerts = [
      { id: 1, type: "Warning", msg: "PPE compliance check scheduled for Sector-B scaffolding crews.", date: "Today, 2:00 PM" },
      { id: 2, type: "Info", msg: "Safety training logs updated for all sub-contractors on-site.", date: "Yesterday" },
      { id: 3, type: "Urgent", msg: "Annual Environment Impact clearance documents expiring in 12 days.", date: "Jul 21, 2026" },
    ];

    return (
      <AppShell title="HSE" breadcrumb="Project / HSE">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <PageHeader 
            title="HSE Management" 
            description="Health, Safety, and Environmental compliance logs, incident trackers, and regulatory checkpoint audits." 
          />

          {/* Metric cards */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Safe Work Days</span>
                <Heart className="h-4 w-4 text-destructive fill-destructive" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">342 Days</h3>
              <p className="mt-1 text-xs text-success">Since last recordable incident</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Pending Audits</span>
                <ClipboardCheck className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">1 Pending</h3>
              <p className="mt-1 text-xs text-muted-foreground">Monthly Site Inspection: Sector C</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Audit Score</span>
                <ClipboardCheck className="h-4 w-4 text-success" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-success">98.2%</h3>
              <p className="mt-1 text-xs text-muted-foreground">Compliant rating in last Q3 review</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Open Incidents</span>
                <AlertOctagon className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">0 Active</h3>
              <p className="mt-1 text-xs text-success">All clear</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* HSE Logs / Notices */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">HSE Board Notifications</h3>
                  <p className="text-sm text-muted-foreground">Safety directives and regulatory actions</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/95 transition-colors">
                  <Plus className="h-3 w-3" /> New Directive
                </button>
              </div>

              <div className="space-y-4">
                {alerts.map((a) => (
                  <div key={a.id} className="flex gap-3 items-start border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase mt-0.5 ${
                      a.type === "Urgent"
                        ? "bg-destructive/10 text-destructive"
                        : a.type === "Warning"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-info/10 text-info"
                    }`}>
                      {a.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.msg}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Daily Safety Checklist</h3>
              <p className="text-sm text-muted-foreground mb-6">Pre-start execution validation</p>

              <div className="space-y-3.5">
                {[
                  "Mandatory PPE checks completed",
                  "Scaffolding certificates validated",
                  "Fire exit ways cleared and marked",
                  "Hazard communications broadcasted",
                  "Environmental spill kits verified",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-0.5 grid h-4 w-4 place-items-center rounded bg-success/15 border border-success text-success shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  },
});
