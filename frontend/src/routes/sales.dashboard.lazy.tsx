import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { BarChart3, TrendingUp, Handshake, Target, ArrowUpRight, Percent } from "lucide-react";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/sales/dashboard")({
  component: () => {
    useEffect(() => {
      document.title = "Sales Dashboard — ProcureX";
    }, []);

    const topDeals = [
      { id: 1, account: "Vertex Global Enterprises", value: "$450k", rep: "Alex Sterling", probability: "85%", status: "Proposal Sent" },
      { id: 2, account: "Horizon Logistics Inc", value: "$280k", rep: "Sophia Vance", probability: "60%", status: "Negotiation" },
      { id: 3, account: "Crestview Holdings", value: "$150k", rep: "Marcus Chen", probability: "95%", status: "Closing" },
      { id: 4, account: "Edison Power Grid", value: "$95k", rep: "Julia Robert", probability: "30%", status: "Qualification" },
    ];

    return (
      <AppShell title="Sales dashboard" breadcrumb="Sales / Sales dashboard">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <PageHeader 
            title="Sales Dashboard" 
            description="Track sales metrics, analyze conversion funnels, evaluate deal velocity, and audit quarterly revenue targets." 
          />

          {/* Metric Tiles */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Quarterly Sales</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">$1.48M</h3>
              <p className="mt-1 text-xs text-success">84.2% of Q3 target ($1.75M)</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Active Funnel Value</span>
                <Target className="h-4 w-4 text-info" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">$2.94M</h3>
              <p className="mt-1 text-xs text-muted-foreground">Across 18 qualified deals</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Win Rate Average</span>
                <Percent className="h-4 w-4 text-success" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-success">28.4%</h3>
              <p className="mt-1 text-xs text-success">+1.8% variance from Q2</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Deals Closed (Month)</span>
                <Handshake className="h-4 w-4 text-info" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">8 Closed</h3>
              <p className="mt-1 text-xs text-muted-foreground">Total Month Value: $382k</p>
            </div>
          </div>

          {/* Table List of Top Deals */}
          <div className="mt-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">High-Priority Accounts in Pipeline</h3>
                <p className="text-sm text-muted-foreground">Top deals currently undergoing closing sequence or proposal cycles</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3">Account Name</th>
                    <th className="px-6 py-3">Deal Value</th>
                    <th className="px-6 py-3">Owner / Rep</th>
                    <th className="px-6 py-3">Win Probability</th>
                    <th className="px-6 py-3 text-right">Deal Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {topDeals.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{d.account}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{d.value}</td>
                      <td className="px-6 py-4 text-muted-foreground">{d.rep}</td>
                      <td className="px-6 py-4 text-muted-foreground">{d.probability}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          d.status === "Closing"
                            ? "bg-success/10 text-success"
                            : d.status === "Proposal Sent"
                              ? "bg-info/10 text-info"
                              : d.status === "Negotiation"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-muted text-muted-foreground"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </AppShell>
    );
  },
});
