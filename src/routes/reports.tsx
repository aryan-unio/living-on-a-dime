import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Unio Invoice" }] }),
  component: () => <Outlet />,
});
