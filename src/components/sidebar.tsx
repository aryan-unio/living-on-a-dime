import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Receipt, RefreshCw,
  Users, Package, Clock, Wallet, BarChart2, Settings, BadgeIndianRupee,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOP = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/quotes", label: "Quotes", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/recurring", label: "Recurring Invoices", icon: RefreshCw },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/payroll", label: "Payroll", icon: BadgeIndianRupee },
  { to: "/items", label: "Items", icon: Package },

] as const;

const BOTTOM = [
  { to: "/timesheet", label: "Timesheet", icon: Clock },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const Item = ({ to, label, Icon }: { to: string; label: string; Icon: React.ComponentType<{ className?: string; size?: number }> }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        title={collapsed ? label : undefined}
        className={cn(
          "relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "bg-[var(--brand-light)] text-white"
            : "text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white",
        )}
      >
        {active && (
          <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--brand)]" />
        )}
        <Icon className="shrink-0" size={18} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col bg-[var(--sidebar-bg)] transition-[width] duration-200"
      style={{ width: collapsed ? 64 : 220 }}
    >
      <div className={cn("flex items-center gap-2 px-4 py-4", collapsed && "justify-center px-0")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
          U
        </div>
        {!collapsed && <span className="text-sm font-semibold text-white">Unio Invoice</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col">
          {TOP.map((i) => <Item key={i.to} to={i.to} label={i.label} Icon={i.icon} />)}
        </div>
        <div className="my-3 mx-4 border-t border-white/10" />
        <div className="flex flex-col">
          {BOTTOM.map((i) => <Item key={i.to} to={i.to} label={i.label} Icon={i.icon} />)}
        </div>
      </nav>

      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t border-white/10 text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white"
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
