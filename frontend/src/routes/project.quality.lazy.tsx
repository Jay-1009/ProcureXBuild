import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { CheckSquare, Percent, FileWarning, HelpCircle, BadgeCheck, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/project/quality")({
  component: () => {
    useEffect(() => {
      document.title = "Quality — ProcureX";
    }, []);

    const ncrs = [
      { id: "NCR-103", project: "Warehouse Sector-B Concrete", defect: "Minor cracking in slab pour", severity: "Medium", status: "Under Review" },
      { id: "NCR-104", project: "ERP Data Migration", defect: "Truncation in supplier contract date field", severity: "High", status: "Resolving" },
      { id: "NCR-105", project: "HVAC Duct Installation", defect: "Misalignment of flange spacing", severity: "Low", status: "Approved / Closed" },
    ];

    return (
      <AppShell title="Quality" breadcrumb="Project / Quality">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <PageHeader 
            title="Quality Assurance & Control" 
            description="Defect rates index, quality audits, compliance checklists, and Non-Conformance Reports (NCR) tracking." 
          />

          {/* Metric Rows */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Pass Rate</span>
                <Percent className="h-4 w-4 text-success" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">99.12%</h3>
              <p className="mt-1 text-xs text-success">Target exceeded (+0.5%)</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Open NCRs</span>
                <FileWarning className="h-4 w-4 text-amber-500" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-amber-500">2 Active</h3>
              <p className="mt-1 text-xs text-muted-foreground">Requires immediate review</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Defect Density</span>
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">0.18 / kLoc</h3>
              <p className="mt-1 text-xs text-muted-foreground">Within standard benchmark bounds</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Audits Completed</span>
                <BadgeCheck className="h-4 w-4 text-info" />
              </div>
              <h3 className="mt-2 text-2xl font-bold text-foreground">14 / 15</h3>
              <p className="mt-1 text-xs text-muted-foreground">Next audit schedule: Tomorrow</p>
            </div>
          </div>

          {/* NCR Table */}
          <div className="mt-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Non-Conformance Reports (NCR)</h3>
              <p className="text-sm text-muted-foreground">Tracking anomalous materials, specs violations, or systemic bugs</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3">NCR ID</th>
                    <th className="px-6 py-3">Scope / Area</th>
                    <th className="px-6 py-3">Reported Defect</th>
                    <th className="px-6 py-3">Severity</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {ncrs.map((n) => (
                    <tr key={n.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{n.id}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{n.project}</td>
                      <td className="px-6 py-4 text-muted-foreground">{n.defect}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          n.severity === "High"
                            ? "bg-destructive/10 text-destructive"
                            : n.severity === "Medium"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-info/10 text-info"
                        }`}>
                          {n.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          n.status === "Approved / Closed"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {n.status}
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
