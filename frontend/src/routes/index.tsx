import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dashboard } from "@/components/procurex/Dashboard";
import { getSession, getRole } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getSession()) {
      navigate({ to: "/auth", replace: true });
    } else {
      const role = getRole();
      if (role === "Supplier") {
        navigate({ to: "/supplier-portal", replace: true });
      } else {
        setReady(true);
      }
    }
  }, [navigate]);
  if (!ready) return <div className="min-h-screen bg-background" />;
  return <Dashboard />;
}
