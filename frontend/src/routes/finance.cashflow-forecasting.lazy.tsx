import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { TrendingUp, ArrowDown, ArrowUp, Calendar, AlertCircle } from "lucide-react";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/finance/cashflow-forecasting")({
  component: () => {
    useEffect(() => {
      document.title = "Cashflow Forecasting — ProcureX";
    }, []);

    const forecasts = [
      { month: "August 2026", inflow: "$450k", outflow: "$380k", balance: "+$70k", confidence: "98% (High)" },
      { month: "September 2026", inflow: "$510k", outflow: "$400k", balance: "+$110k", confidence: "92% (High)" },
      { month: "October 2026", inflow: "$380k", outflow: "$420k", balance: "-$40k", confidence: "85% (Medium)" },
      { month: "November 2026", inflow: "$600k", outflow: "$390k", balance: "+$210k", confidence: "74% (Medium)" },
    ];

    return (
      <AppShell title="cashflow forecasting" breadcrumb="Finance / cashflow forecasting">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <PageHeader 
            title="Cashflow Forecasting" 
            description="Predict future inflows and outflows of liquidity to evaluate runway, payment risks, and working capital needs." 
          />

          {/* KPI Panel */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Avg. Monthly Inflow</span>
                <ArrowUp className="h-4 w-4 text-success" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">$485k</h3>
              <p className="mt-1 text-xs text-success">+4.2% month-on-month trend</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Avg. Monthly Outflow</span>
                <ArrowDown className="h-4 w-4 text-destructive" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">$397k</h3>
              <p className="mt-1 text-xs text-muted-foreground">Within forecasted target limits</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Net Cash Delta</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">+$88k / mo</h3>
              <p className="mt-1 text-xs text-success">Accruing reserves</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Liquidity Runway</span>
                <Calendar className="h-4 w-4 text-info" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">18.4 Months</h3>
              <p className="mt-1 text-xs text-muted-foreground">Extremely stable cash position</p>
            </div>
          </div>

          {/* Forecasting List Table */}
          <div className="mt-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Next-Quarter Cash Projections</h3>
              <p className="text-sm text-muted-foreground">Aggregated receivables modeling vs planned project milestones</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3">Forecast Period</th>
                    <th className="px-6 py-3">Expected Inflow</th>
                    <th className="px-6 py-3">Scheduled Outflow</th>
                    <th className="px-6 py-3">Net Projection</th>
                    <th className="px-6 py-3 text-right">Confidence Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {forecasts.map((f, i) => (
                    <tr key={i} className="hover:bg-muted/15 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{f.month}</td>
                      <td className="px-6 py-4 text-success font-medium">{f.inflow}</td>
                      <td className="px-6 py-4 text-destructive font-medium">{f.outflow}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-0.5 font-semibold ${
                          f.balance.startsWith("+") ? "text-success" : "text-destructive"
                        }`}>
                          {f.balance}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground font-medium">{f.confidence}</td>
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
