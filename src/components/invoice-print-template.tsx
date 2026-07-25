import type { Company, Customer, Invoice } from "@/lib/types";
import type { InvoiceTotals } from "@/lib/calc";
import { formatDate, formatMoney, amountInWords } from "@/lib/format";
import { getTaxSystem } from "@/lib/taxSystem";

const BRAND = "#EA580C";

export function InvoicePrintTemplate({
  invoice, company, customer, totals,
}: {
  invoice: Invoice;
  company: Company;
  customer: Customer | undefined;
  totals: InvoiceTotals;
}) {
  const curr = invoice.currency || company.currency;
  const isIndia = curr === "INR";
  const baseTaxSystem = getTaxSystem(company.country);
  const taxSystem = isIndia
    ? baseTaxSystem
    : { ...baseTaxSystem, key: "other" as const, label: "Tax", showHSN: false };

  const paymentLines = buildPaymentLines(company);
  const showPayments = paymentLines.length > 0;

  const daysDiff = Math.max(
    0,
    Math.round(
      (new Date(invoice.dueDate).getTime() - new Date(invoice.date).getTime()) /
        86400000,
    ),
  );
  const terms = daysDiff > 0 ? `Net ${daysDiff}` : "Due on Receipt";

  const words = wordsOnly(totals.total, curr);

  return (
    <div
      className="bg-white p-10 text-[13px] text-slate-900"
      style={{
        minHeight: 800,
        fontFamily: "Inter, system-ui, sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-8">
        <div className="flex items-start gap-4">
          <CompanyLogo company={company} />
          <div>
            <div className="text-2xl font-bold leading-tight text-slate-900">
              {company.name || "Your Company"}
            </div>
            {company.tagline && (
              <div className="mt-0.5 text-xs text-slate-500">{company.tagline}</div>
            )}
            <div
              className="mt-3 space-y-0.5 text-[12px] leading-relaxed"
              style={{ color: BRAND }}
            >
              {[company.city, company.state, company.pin]
                .filter(Boolean).length > 0 && (
                <div>
                  {[company.city, company.state, company.pin].filter(Boolean).join(", ")}
                </div>
              )}
              {company.country && <div>{company.country}</div>}
              {company.email && <div>{company.email}</div>}
              {company.website && <div>{company.website}</div>}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className="font-bold uppercase leading-none text-slate-900"
            style={{ fontSize: 40, letterSpacing: "0.02em" }}
          >
            TAX INVOICE
          </div>
          <div className="mt-2 text-sm font-semibold" style={{ color: BRAND }}>
            # {invoice.number}
          </div>
          <div
            className="mt-4 inline-block rounded px-4 py-2 text-right"
            style={{ background: "#F8FAFC", minWidth: 200 }}
          >
            <div className="text-xs uppercase text-slate-500">Balance Due</div>
            <div className="text-xl font-bold text-slate-900">
              {formatMoney(totals.balance, curr)}
            </div>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="mt-6 border-t border-slate-200" />

      {/* META ROW */}
      <div className="mt-4 flex justify-end">
        <div className="w-72 space-y-1 text-[12px]">
          <MetaRow label="Invoice Date :" value={formatDate(invoice.date)} />
          <MetaRow label="Terms :" value={terms} />
          <MetaRow label="Due Date :" value={formatDate(invoice.dueDate)} />
        </div>
      </div>

      {/* BILL TO */}
      <div className="mt-6">
        <div className="text-[13px] font-bold text-slate-900">
          {customer?.companyName || customer?.displayName || "—"}
        </div>
        {customer?.companyName && customer?.displayName && (
          <div className="text-[12px] text-slate-600">{customer.displayName}</div>
        )}
        {(customer?.city || customer?.state) && (
          <div className="text-[12px] text-slate-500">
            {[customer?.city, customer?.state].filter(Boolean).join(", ")}
          </div>
        )}
      </div>

      {/* LINE ITEMS */}
      <table className="mt-6 w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: "#1F2A44", color: "#fff" }}>
            <th className="px-3 py-2 text-left font-semibold w-8">#</th>
            <th className="px-3 py-2 text-left font-semibold">Item &amp; Description</th>
            <th className="px-3 py-2 text-right font-semibold w-20">Qty</th>
            <th className="px-3 py-2 text-right font-semibold w-28">Rate</th>
            <th className="px-3 py-2 text-right font-semibold w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li, i) => {
            const hasQtyRate = (li.qty ?? 0) > 0 && (li.rate ?? 0) > 0;
            const amt = (li.qty || 0) * (li.rate || 0);
            return (
              <tr key={li.id} className="border-b border-slate-200 align-top">
                <td className="px-3 py-3 text-slate-700">{i + 1}</td>
                <td className="px-3 py-3 text-slate-900">
                  {li.description || "—"}
                  {taxSystem.showHSN && li.hsnCode && (
                    <div className="text-[11px] text-slate-500">HSN/SAC: {li.hsnCode}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {hasQtyRate ? formatQty(li.qty) : ""}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {hasQtyRate ? formatMoney(li.rate, curr) : ""}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900">
                  {formatMoney(amt || li.rate || 0, curr)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="mt-6 flex justify-end">
        <div className="w-80">
          <div className="border-t border-slate-300 pt-3 space-y-1.5 text-[12px]">
            <Row label="Sub Total" value={formatMoney(totals.subtotal, curr)} />
            {totals.discountAmount > 0 && (
              <Row label="Discount" value={`− ${formatMoney(totals.discountAmount, curr)}`} />
            )}
            {totals.taxAmount + totals.igst + totals.cgst + totals.sgst + totals.gst + totals.hst + totals.pst + totals.salesTax > 0 && (
              <Row label={taxSystem.label} value={formatMoney(
                totals.taxAmount + totals.igst + totals.cgst + totals.sgst + totals.gst + totals.hst + totals.pst + totals.salesTax, curr,
              )} />
            )}
            {totals.adjustment !== 0 && (
              <Row label={invoice.adjustment?.label || "Adjustment"} value={formatMoney(totals.adjustment, curr)} />
            )}
            <div className="flex items-center justify-between border-t border-slate-300 pt-2 text-[13px] font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(totals.total, curr)}</span>
            </div>
            <div
              className="mt-1 flex items-center justify-between rounded px-2 py-2 text-[13px] font-bold text-slate-900"
              style={{ background: "#F1F5F9" }}
            >
              <span>Balance Due</span>
              <span>{formatMoney(totals.balance, curr)}</span>
            </div>
          </div>
          <div className="mt-3 text-right text-[11px] italic text-slate-600">
            Total In Words: {words} /-
          </div>
        </div>
      </div>

      {/* NOTES + PAYMENT OPTIONS */}
      <div className="mt-10 space-y-6">
        {invoice.notes && (
          <div className="text-[12px] text-slate-700">
            <div className="whitespace-pre-wrap">{invoice.notes}</div>
          </div>
        )}
        {!invoice.notes && (
          <div className="text-[12px] text-slate-700">Thanks for your business.</div>
        )}

        {showPayments && (
          <div>
            <div
              className="text-[13px] font-semibold"
              style={{ color: BRAND }}
            >
              Payment Options
            </div>
            <div className="mt-1 space-y-0.5 text-[12px] text-slate-700">
              {paymentLines.map((l) => (
                <div key={l.label}>
                  <span>{l.label} :- </span>
                  <span className="text-slate-900">{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.terms && (
          <div className="text-[11px] text-slate-500">
            <div className="mb-0.5 font-semibold uppercase text-slate-500">Terms &amp; Conditions</div>
            <div className="whitespace-pre-wrap">{invoice.terms}</div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-12 border-t border-slate-200 pt-2 text-right text-[11px] text-slate-500">
        1
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium" style={{ color: BRAND }}>{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function formatQty(q: number): string {
  if (Number.isInteger(q)) return String(q);
  return q.toFixed(2);
}

function buildPaymentLines(company: Company): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (company.bankName) out.push({ label: "Bank Name", value: company.bankName });
  if (company.accountHolder) out.push({ label: "Name", value: company.accountHolder });
  if (company.accountNumber) out.push({ label: "A/C No", value: company.accountNumber });
  if (company.ifsc) out.push({ label: "IFSC", value: company.ifsc });
  if (company.upiId) out.push({ label: "UPI ID", value: company.upiId });
  return out;
}

function wordsOnly(amount: number, currency: string): string {
  // Strip the currency prefix from amountInWords: "Rupees Seventy Thousand Only" -> "Seventy Thousand Only"
  const s = amountInWords(amount, currency);
  return s.replace(/^(Rupees|US Dollars|Euros|Pounds Sterling|[A-Z]{3})\s+/i, "");
}

function CompanyLogo({ company }: { company: Company }) {
  const logo = (company.logo || "").trim();
  if (logo) {
    return (
      <img
        src={logo}
        alt={`${company.name || "Company"} logo`}
        crossOrigin="anonymous"
        style={{ maxHeight: 96, maxWidth: 180, objectFit: "contain" }}
      />
    );
  }
  const name = (company.name || "U").trim();
  const parts = name.split(/\s+/);
  const inits = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
  return (
    <div
      style={{
        height: 72, width: 72, borderRadius: 12,
        background: BRAND, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 24,
      }}
    >
      {inits}
    </div>
  );
}
