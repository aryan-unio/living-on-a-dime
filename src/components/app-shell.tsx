import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { store } from "@/lib/storage";
import { useAuth } from "./data-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (auth.ready) {
      setCollapsed(!!store.getSettings().sidebarCollapsed);
    }
  }, [auth.ready]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user && pathname !== "/auth") {
      navigate({ to: "/auth", replace: true });
    }
  }, [auth.loading, auth.user, pathname, navigate]);

  // Auth page renders itself with no shell
  if (pathname === "/auth") return <>{children}</>;

  if (auth.loading || (!auth.ready && auth.user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      const s = store.getSettings();
      store.setSettings({ ...s, sidebarCollapsed: next });
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] text-foreground">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className="flex min-h-screen flex-col transition-[margin] duration-200"
        style={{ marginLeft: collapsed ? 64 : 220 }}
      >
        <TopHeader />
        <main className="flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
