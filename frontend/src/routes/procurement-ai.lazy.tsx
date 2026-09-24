import { createLazyFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/procurex/AppShell";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/procurement-ai")({
  component: () => {
    useEffect(() => {
      document.title = "Procurement AI — ProcureX";
    }, []);
    return (
      <AppShell title="Procurement AI" breadcrumb="Procurement AI">
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
          <PageHeader title="Procurement AI" description="AI-driven reorder signals, risk detection and category consolidation recommendations." />
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-info" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Procurement AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">AI insights workspace coming soon.</p>
          </div>
        </main>
      </AppShell>
    );
  },
});