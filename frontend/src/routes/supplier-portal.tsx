import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/supplier-portal")({
  component: () => <Outlet />,
});