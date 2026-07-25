import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Moon, Plus, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { store } from "@/lib/storage";
import { initials } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/data-provider";
import { toast } from "sonner";

export function TopHeader() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Your Company");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => {
      setCompanyName(store.getCompany().name || "Your Company");
      const t = store.getSettings().theme || "light";
      setTheme(t);
      if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", t === "dark");
    };
    sync();
    window.addEventListener("unio:data-changed", sync);
    return () => window.removeEventListener("unio:data-changed", sync);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    const s = store.getSettings();
    store.setSettings({ ...s, theme: next });
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const inv = store.getInvoices().find((i) => i.number.toLowerCase().includes(q));
    if (inv) { navigate({ to: "/invoices/$id", params: { id: inv.id } }); return; }
    const cust = store.getCustomers().find((c) =>
      c.displayName.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q));
    if (cust) { navigate({ to: "/customers/$id", params: { id: cust.id } }); return; }
    navigate({ to: "/invoices", search: { q: query } as never });
  };

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center gap-4 border-b bg-white px-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">U</div>
        <span className="hidden text-sm font-semibold text-foreground md:inline">Unio Invoice</span>
      </Link>

      <form onSubmit={onSearch} className="relative mx-auto w-full max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search invoices, customers..."
          className="h-9 w-full pl-9"
        />
      </form>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
              <Plus size={16} /> New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate({ to: "/invoices/new" })}>New Invoice</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/quotes/new" })}>New Quote</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/customers/new" })}>New Customer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/expenses/new" })}>New Expense</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/timesheet" })}>Log Time</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Toggle theme" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifications">
          <Bell size={18} />
        </Button>
        <UserMenu companyName={companyName} />
      </div>
    </header>
  );
}

function UserMenu({ companyName }: { companyName: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white" aria-label="Account">
          {initials(companyName)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{auth.user?.email ?? "Signed out"}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}><LogOut size={14} className="mr-2" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
