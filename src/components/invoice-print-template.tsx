import type { Company, Customer, Invoice } from "@/lib/types";
import type { InvoiceTotals } from "@/lib/calc";
import { formatDate, amountInWords } from "@/lib/format";
import { getTaxSystem } from "@/lib/taxSystem";

// Auto-decimal money formatter: 0 decimals when whole, 2 when fractional
function fmtMoney(amount: number | undefined | null, currency: string): string {
  const v = typeof amount === "number" && isFinite(amount) ? amount : 0;
  const digits = Math.round(v * 100) % 100 === 0 ? 0 : 2;
  const locale = currency === "INR" ? "en-IN" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}


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
      className="invoice-print-area bg-white text-[13px] text-slate-900"
      style={{
        padding: 40,
        minHeight: 800,
        fontFamily: "Inter, system-ui, sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-8">
        {/* LEFT 40% */}
        <div style={{ flex: "0 0 40%" }}>
          <CompanyLogo company={company} />
          <div
            style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, marginTop: 12, color: "#0f172a" }}
          >
            {company.name || "Your Company"}
          </div>
          {company.tagline && (
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
              {company.tagline}
            </div>
          )}
          <div style={{ height: 12 }} />
          <div style={{ color: BRAND, fontSize: 12, lineHeight: 1.7 }}>
            {company.street && <div>{company.street}</div>}
            {[company.city, company.state, company.pin].filter(Boolean).length > 0 && (
              <div>
                {[[company.city, company.state].filter(Boolean).join(", "), company.pin]
                  .filter(Boolean)
                  .join(" ")}
              </div>
            )}
            {company.country && <div>{company.country}</div>}
            {company.email && <div>{company.email}</div>}
            {company.website && <div>{company.website}</div>}
          </div>

        </div>

        {/* RIGHT 60% */}
        <div style={{ flex: "0 0 55%", textAlign: "right" }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: "-1px",
              color: "#000",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            TAX INVOICE
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: BRAND, marginTop: 8 }}>
            # {invoice.number}
          </div>
          <div
            style={{
              marginTop: 16,
              display: "inline-block",
              background: "#f8fafc",
              padding: "10px 16px",
              borderRadius: 4,
              minWidth: 200,
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#6b7280",
                letterSpacing: "0.08em",
              }}
            >
              Balance Due
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#000", marginTop: 2 }}>
              {fmtMoney(totals.balance, curr)}
            </div>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

      {/* META (right) */}
      <div style={{ marginLeft: "auto", width: 320 }}>
        <MetaRow label="Invoice Date :" value={formatDate(invoice.date)} />
        <MetaRow label="Terms :" value={terms} />
        <MetaRow label="Due Date :" value={formatDate(invoice.dueDate)} />
      </div>

      {/* CUSTOMER */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {customer?.companyName || customer?.displayName || "—"}
        </div>
        {customer?.companyName && customer?.displayName && (
          <div style={{ fontSize: 14, color: "#6b7280" }}>{customer.displayName}</div>
        )}
        {(customer?.city || customer?.state) && (
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {[customer?.city, customer?.state].filter(Boolean).join(", ")}
          </div>
        )}
      </div>

      {/* LINE ITEMS */}
      <table
        style={{
          marginTop: 24,
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ background: "#1e293b", color: "#fff" }}>
            <th style={thStyle(40, "left")}>#</th>
            <th style={thStyle(undefined, "left")}>Description</th>
            <th style={thStyle(80, "right")}>Qty</th>
            <th style={thStyle(110, "right")}>Rate</th>
            <th style={thStyle(120, "right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li, i) => {
            const isFlat = (li.qty ?? 0) === 1 && (li.rate ?? 0) === 0;
            const hasQtyRate = (li.qty ?? 0) > 0 && (li.rate ?? 0) > 0;
            const amt = (li.qty || 0) * (li.rate || 0);
            const rowBg = i % 2 === 0 ? "#ffffff" : "#fafafa";
            return (
              <tr
                key={li.id}
                style={{ background: rowBg, borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}
              >
                <td style={tdStyle("left", "#374151")}>{i + 1}</td>
                <td style={tdStyle("left", "#0f172a")}>
                  {li.description || "—"}
                  {taxSystem.showHSN && li.hsnCode && (
                    <div style={{ fontSize: 11, color: "#6b7280" }}>HSN/SAC: {li.hsnCode}</div>
                  )}
                </td>
                <td style={tdStyle("right", "#374151")}>
                  {hasQtyRate ? formatQty(li.qty) : ""}
                </td>
                <td style={tdStyle("right", "#374151")}>
                  {hasQtyRate ? fmtMoney(li.rate, curr) : ""}
                </td>
                <td style={{ ...tdStyle("right", "#0f172a"), fontWeight: 500 }}>
                  {fmtMoney(isFlat ? li.rate || 0 : amt, curr)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* TOTALS */}
      <div style={{ marginTop: 24, marginLeft: "auto", width: 320 }}>
        <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", marginBottom: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
          <TotalRow label="Sub Total" value={fmtMoney(totals.subtotal, curr)} />
          {totals.discountAmount > 0 && (
            <TotalRow label="Discount" value={`− ${fmtMoney(totals.discountAmount, curr)}`} />
          )}
          {totals.taxAmount + totals.igst + totals.cgst + totals.sgst + totals.gst + totals.hst + totals.pst + totals.salesTax > 0 && (
            <TotalRow
              label={taxSystem.label}
              value={fmtMoney(
                totals.taxAmount + totals.igst + totals.cgst + totals.sgst + totals.gst + totals.hst + totals.pst + totals.salesTax,
                curr,
              )}
            />
          )}
          {totals.adjustment !== 0 && (
            <TotalRow label={invoice.adjustment?.label || "Adjustment"} value={fmtMoney(totals.adjustment, curr)} />
          )}
          <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "6px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
            <span>Total</span>
            <span>{fmtMoney(totals.total, curr)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              background: "#f8fafc",
              padding: 8,
              borderRadius: 4,
              fontWeight: 700,
              color: "#0f172a",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            <span>Balance Due</span>
            <span>{fmtMoney(totals.balance, curr)}</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            fontStyle: "italic",
            fontSize: 12,
            textAlign: "right",
            color: "#374151",
          }}
        >
          Total In Words: {words} /-
        </div>
      </div>

      {/* NOTES */}
      <div style={{ marginTop: 32, fontSize: 13, color: "#374151" }}>
        {invoice.notes ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
        ) : (
          <div>Thanks for your business.</div>
        )}
      </div>

      {/* TERMS */}
      {invoice.terms && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              color: BRAND,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Terms &amp; Conditions
          </div>
          <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", marginTop: 4 }}>
            {invoice.terms}
          </div>
        </div>
      )}

      {/* PAYMENT OPTIONS */}
      {showPayments && (
        <div style={{ marginTop: 24 }}>
          <div style={{ color: BRAND, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Payment Options
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>
            {paymentLines.map((l) => (
              <div key={l.label}>
                {l.label} :- {l.value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", marginTop: 40 }} />
      <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280", marginTop: 6 }}>1</div>

      <style>{`
        @media print {
          .invoice-print-area {
            padding: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { margin: 15mm; }
        }
      `}</style>
    </div>
  );
}

function thStyle(width: number | undefined, align: "left" | "right"): React.CSSProperties {
  return {
    padding: "10px 8px",
    textAlign: align,
    fontWeight: 600,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    ...(width ? { width } : {}),
  };
}

function tdStyle(align: "left" | "right", color: string): React.CSSProperties {
  return { padding: "12px 8px", textAlign: align, color };
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: BRAND, fontWeight: 500, textAlign: "right" }}>{label}</span>
      <span style={{ color: "#000", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: "#374151" }}>
      <span>{label}</span>
      <span style={{ color: "#0f172a" }}>{value}</span>
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
        style={{ maxHeight: 80, maxWidth: 180, objectFit: "contain", display: "block" }}
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
