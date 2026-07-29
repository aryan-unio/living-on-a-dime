import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { store } from "./storage";

export function formatMoney(amount: number | undefined | null, currency?: string): string {
  const v = typeof amount === "number" && isFinite(amount) ? amount : 0;
  let curr = currency;
  if (!curr) {
    try { curr = store.getCompany().currency; } catch { curr = "INR"; }
  }
  curr = curr || "INR";

  if (curr === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 2,
    }).format(v);
  }
  if (curr === "EUR") {
    return new Intl.NumberFormat("de-DE", {
      style: "currency", currency: "EUR", maximumFractionDigits: 2,
    }).format(v);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: curr, maximumFractionDigits: 2,
  }).format(v);
}

// Backward-compat alias — delegates to formatMoney using company currency.
export const formatINR = (n: number | undefined | null) => formatMoney(n);

export function formatMoneyShort(amount: number, currency?: string): string {
  let curr = currency;
  if (!curr) { try { curr = store.getCompany().currency; } catch { curr = "INR"; } }
  curr = curr || "INR";
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const sym = symbols[curr] || "";
  const v = Math.abs(amount);
  if (curr === "INR") {
    if (v >= 1e7) return `${sym}${(amount / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${sym}${(amount / 1e5).toFixed(1)}L`;
    if (v >= 1e3) return `${sym}${Math.round(amount / 1e3)}k`;
    return `${sym}${Math.round(amount)}`;
  }
  if (v >= 1e9) return `${sym}${(amount / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${sym}${(amount / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${sym}${Math.round(amount / 1e3)}k`;
  return `${sym}${Math.round(amount)}`;
}

export function formatNumber(n: number | undefined | null): string {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(v);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ymdParts(d: string | Date | undefined): [string, string, string] | null {
  if (!d) return null;
  try {
    const s = typeof d === "string" ? d.slice(0, 10) : format(d, "yyyy-MM-dd");
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return [m[1], m[2], m[3]];
  } catch { return null; }
}

export function formatDate(d: string | Date | undefined): string {
  const p = ymdParts(d);
  if (!p) return "—";
  const [y, m, day] = p;
  return `${day} ${MONTHS[+m - 1]} ${y}`;
}

export function formatDateShort(d: string | Date | undefined): string {
  const p = ymdParts(d);
  if (!p) return "—";
  const [, m, day] = p;
  return `${day} ${MONTHS[+m - 1]}`;
}

export function relativeDate(d: string | Date | undefined): string {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? parseISO(d) : d;
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch { return ""; }
}

export function initials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function statusColor(status: string): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
    sent: { bg: "bg-blue-50", text: "text-blue-700", label: "Sent" },
    paid: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
    overdue: { bg: "bg-red-50", text: "text-red-700", label: "Overdue" },
    partial: { bg: "bg-amber-50", text: "text-amber-700", label: "Partial" },
    void: { bg: "bg-gray-100", text: "text-gray-500", label: "Void" },
    accepted: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Accepted" },
    declined: { bg: "bg-red-50", text: "text-red-700", label: "Declined" },
    expired: { bg: "bg-gray-100", text: "text-gray-600", label: "Expired" },
    converted: { bg: "bg-violet-50", text: "text-violet-700", label: "Converted" },
    unbilled: { bg: "bg-amber-50", text: "text-amber-700", label: "Unbilled" },
    billed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Billed" },
    "non-billable": { bg: "bg-slate-100", text: "text-slate-700", label: "Non-billable" },
  };
  return map[status] || { bg: "bg-slate-100", text: "text-slate-700", label: status };
}

// --- Number → words ---

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "")).trim();
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "");
}

function indianWords(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  let w = "";
  if (crore) w += twoDigits(crore) + " Crore ";
  if (lakh) w += twoDigits(lakh) + " Lakh ";
  if (thousand) w += twoDigits(thousand) + " Thousand ";
  if (rest) w += threeDigits(rest);
  return w.trim();
}

function intlWords(num: number): string {
  if (num === 0) return "Zero";
  const billion = Math.floor(num / 1_000_000_000);
  const million = Math.floor((num % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((num % 1_000_000) / 1_000);
  const rest = num % 1_000;
  let w = "";
  if (billion) w += threeDigits(billion) + " Billion ";
  if (million) w += threeDigits(million) + " Million ";
  if (thousand) w += threeDigits(thousand) + " Thousand ";
  if (rest) w += threeDigits(rest);
  return w.trim();
}

export function amountInWords(amount: number, currency: string = "INR"): string {
  const num = Math.floor(Math.abs(amount));
  const fracUnit = Math.round((Math.abs(amount) - num) * 100);

  const labels: Record<string, { main: string; frac: string }> = {
    INR: { main: "Rupees", frac: "Paise" },
    USD: { main: "US Dollars", frac: "Cents" },
    EUR: { main: "Euros", frac: "Cents" },
    GBP: { main: "Pounds Sterling", frac: "Pence" },
  };
  const lab = labels[currency] || { main: currency, frac: "Cents" };
  const wordFn = currency === "INR" ? indianWords : intlWords;

  let s = `${lab.main} ${wordFn(num)}`;
  if (fracUnit) s += ` and ${twoDigits(fracUnit)} ${lab.frac}`;
  return s + " Only";
}
