import type {
  Company,
  Customer,
  Expense,
  Invoice,
  Item,
  Project,
  Quote,
  Settings,
  Employee,
  PayrollPayment,
} from "./types";
import { supabase } from "@/integrations/supabase/client";

// ---- In-memory cache (mirrors Supabase, kept sync for existing components) ----

interface Cache {
  hydrated: boolean;
  userId: string | null;
  company: Company | null;
  customers: Customer[];
  invoices: Invoice[];
  quotes: Quote[];
  expenses: Expense[];
  items: Item[];
  projects: Project[];
  settings: Settings;
}

const cache: Cache = {
  hydrated: false,
  userId: null,
  company: null,
  customers: [],
  invoices: [],
  quotes: [],
  expenses: [],
  items: [],
  projects: [],
  settings: { theme: "light", reminderRules: {} },
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("unio:data-changed"));
}

const defaultCompany: Company = {
  name: "Your Company",
  logo: "",
  tagline: "",
  email: "",
  phone: "",
  gst: "",
  pan: "",
  street: "",
  city: "",
  state: "Maharashtra",
  pin: "",
  country: "India",
  currency: "INR",
  fiscalYearStart: "04-01",
  timezone: "Asia/Kolkata",
  upiId: "",
};

export function isHydrated() {
  return cache.hydrated;
}

export function getCacheUserId() {
  return cache.userId;
}

export function resetCache() {
  cache.hydrated = false;
  cache.userId = null;
  cache.company = null;
  cache.customers = [];
  cache.invoices = [];
  cache.quotes = [];
  cache.expenses = [];
  cache.items = [];
  cache.projects = [];
  cache.settings = { theme: "light", reminderRules: {} };
  emit();
}

/** Load everything for the current user into the cache. */
export async function hydrateFromSupabase(userId: string): Promise<void> {
  cache.userId = userId;

  const [companyRes, customersRes, invoicesRes, quotesRes, expensesRes, itemsRes, projectsRes, settingsRes] =
    await Promise.all([
      supabase.from("companies").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("customers").select("data").eq("user_id", userId),
      supabase.from("invoices").select("data").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("quotes").select("data").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("expenses").select("data").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("items").select("data").eq("user_id", userId),
      supabase.from("projects").select("data").eq("user_id", userId),
      supabase.from("settings").select("data").eq("user_id", userId).maybeSingle(),
    ]);

  cache.company = (companyRes.data?.data as unknown as Company) ?? null;
  cache.customers = (customersRes.data ?? []).map((r) => r.data as unknown as Customer);
  cache.invoices = (invoicesRes.data ?? []).map((r) => r.data as unknown as Invoice);
  cache.quotes = (quotesRes.data ?? []).map((r) => r.data as unknown as Quote);
  cache.expenses = (expensesRes.data ?? []).map((r) => r.data as unknown as Expense);
  cache.items = (itemsRes.data ?? []).map((r) => r.data as unknown as Item);
  cache.projects = (projectsRes.data ?? []).map((r) => r.data as unknown as Project);
  cache.settings = (settingsRes.data?.data as unknown as Settings) ?? { theme: "light", reminderRules: {} };

  cache.hydrated = true;
  emit();
}

/** If this user has no company row yet, seed all starter data. */
export async function seedIfEmpty(userId: string): Promise<void> {
  if (cache.company) return;
  const { buildSeed } = await import("./seed");
  const seed = buildSeed();

  await Promise.all([
    supabase.from("companies").insert({ user_id: userId, data: toJson(seed.company) }),
    seed.customers.length
      ? supabase.from("customers").insert(seed.customers.map((c) => ({ id: c.id, user_id: userId, data: toJson(c) })))
      : Promise.resolve(),
    seed.invoices.length
      ? supabase.from("invoices").insert(seed.invoices.map((i) => ({ id: i.id, user_id: userId, data: toJson(i) })))
      : Promise.resolve(),
    seed.quotes.length
      ? supabase.from("quotes").insert(seed.quotes.map((q) => ({ id: q.id, user_id: userId, data: toJson(q) })))
      : Promise.resolve(),
    seed.expenses.length
      ? supabase.from("expenses").insert(seed.expenses.map((e) => ({ id: e.id, user_id: userId, data: toJson(e) })))
      : Promise.resolve(),
    seed.items.length
      ? supabase.from("items").insert(seed.items.map((it) => ({ id: it.id, user_id: userId, data: toJson(it) })))
      : Promise.resolve(),
  ]);

  await hydrateFromSupabase(userId);
}

// ---- Sync API used by components (unchanged signatures) ----

function toJson<T>(v: T): any { return v as unknown as any; }

function requireUser(): string {
  if (!cache.userId) throw new Error("Not signed in");
  return cache.userId;
}

function fireAndForget(p: PromiseLike<unknown>) {
  Promise.resolve(p).catch((e: unknown) => {
    console.error("[storage] supabase write failed", e);
  });
}

export const store = {
  isReady: () => cache.hydrated,

  getCompany: (): Company => cache.company ?? defaultCompany,
  setCompany: (c: Company) => {
    cache.company = c;
    emit();
    fireAndForget(
      supabase.from("companies").upsert(
        { user_id: requireUser(), data: toJson(c), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      ),
    );
  },

  getCustomers: () => cache.customers,
  setCustomers: (v: Customer[]) => {
    cache.customers = v;
    emit();
  },
  upsertCustomer: (c: Customer) => {
    const all = cache.customers.slice();
    const idx = all.findIndex((x) => x.id === c.id);
    if (idx >= 0) all[idx] = c;
    else all.unshift(c);
    cache.customers = all;
    emit();
    fireAndForget(supabase.from("customers").upsert({ id: c.id, user_id: requireUser(), data: toJson(c) }));
  },
  deleteCustomer: (id: string) => {
    cache.customers = cache.customers.filter((c) => c.id !== id);
    emit();
    fireAndForget(supabase.from("customers").delete().eq("id", id));
  },

  getInvoices: () => cache.invoices,
  setInvoices: (v: Invoice[]) => {
    cache.invoices = v;
    emit();
  },
  upsertInvoice: (inv: Invoice) => {
    const all = cache.invoices.slice();
    const idx = all.findIndex((x) => x.id === inv.id);
    if (idx >= 0) all[idx] = inv;
    else all.unshift(inv);
    cache.invoices = all;
    emit();
    fireAndForget(supabase.from("invoices").upsert({ id: inv.id, user_id: requireUser(), data: toJson(inv) }));
  },
  deleteInvoice: (id: string) => {
    cache.invoices = cache.invoices.filter((i) => i.id !== id);
    emit();
    fireAndForget(supabase.from("invoices").delete().eq("id", id));
  },

  getQuotes: () => cache.quotes,
  setQuotes: (v: Quote[]) => {
    cache.quotes = v;
    emit();
  },
  upsertQuote: (q: Quote) => {
    const all = cache.quotes.slice();
    const idx = all.findIndex((x) => x.id === q.id);
    if (idx >= 0) all[idx] = q;
    else all.unshift(q);
    cache.quotes = all;
    emit();
    fireAndForget(supabase.from("quotes").upsert({ id: q.id, user_id: requireUser(), data: toJson(q) }));
  },
  deleteQuote: (id: string) => {
    cache.quotes = cache.quotes.filter((q) => q.id !== id);
    emit();
    fireAndForget(supabase.from("quotes").delete().eq("id", id));
  },

  getExpenses: () => cache.expenses,
  setExpenses: (v: Expense[]) => {
    cache.expenses = v;
    emit();
  },
  upsertExpense: (e: Expense) => {
    const all = cache.expenses.slice();
    const idx = all.findIndex((x) => x.id === e.id);
    if (idx >= 0) all[idx] = e;
    else all.unshift(e);
    cache.expenses = all;
    emit();
    fireAndForget(supabase.from("expenses").upsert({ id: e.id, user_id: requireUser(), data: toJson(e) }));
  },
  deleteExpense: (id: string) => {
    cache.expenses = cache.expenses.filter((e) => e.id !== id);
    emit();
    fireAndForget(supabase.from("expenses").delete().eq("id", id));
  },

  getItems: () => cache.items,
  setItems: (v: Item[]) => {
    cache.items = v;
    emit();
  },
  upsertItem: (i: Item) => {
    const all = cache.items.slice();
    const idx = all.findIndex((x) => x.id === i.id);
    if (idx >= 0) all[idx] = i;
    else all.unshift(i);
    cache.items = all;
    emit();
    fireAndForget(supabase.from("items").upsert({ id: i.id, user_id: requireUser(), data: toJson(i) }));
  },
  deleteItem: (id: string) => {
    cache.items = cache.items.filter((i) => i.id !== id);
    emit();
    fireAndForget(supabase.from("items").delete().eq("id", id));
  },

  getProjects: () => cache.projects,
  setProjects: (v: Project[]) => {
    cache.projects = v;
    emit();
  },

  // ---- Payroll (persisted inside the settings row) ----
  getEmployees: (): Employee[] => cache.settings.employees ?? [],
  getPayrollPayments: (): PayrollPayment[] => cache.settings.payrollPayments ?? [],
  savePayroll: (employees: Employee[], payments: PayrollPayment[]) => {
    const next: Settings = { ...cache.settings, employees, payrollPayments: payments };
    cache.settings = next;
    emit();
    fireAndForget(
      supabase.from("settings").upsert(
        { user_id: requireUser(), data: toJson(next), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      ),
    );
  },

  getSettings: (): Settings => cache.settings,
  setSettings: (s: Settings) => {
    cache.settings = s;
    emit();
    fireAndForget(
      supabase.from("settings").upsert(
        { user_id: requireUser(), data: toJson(s), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      ),
    );
  },
};

// Legacy no-op — root layout used to call this on mount.
export function ensureSeed(): void {
  /* Handled by DataProvider now. */
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function nextInvoiceNumber(): string {
  const all = store.getInvoices();
  const nums = all
    .map((i) => parseInt(i.number.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

export function nextQuoteNumber(): string {
  const all = store.getQuotes();
  const nums = all
    .map((q) => parseInt(q.number.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `QTE-${String(next).padStart(4, "0")}`;
}
