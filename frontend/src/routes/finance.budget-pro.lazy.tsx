import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/finance/budget-pro")({
  component: () => {
    useEffect(() => {
      window.location.replace("https://construction-management.quantcloud.in/budget_dashboard");
    }, []);

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Redirecting to Budget Dashboard...</p>
      </div>
    );
  },
});

