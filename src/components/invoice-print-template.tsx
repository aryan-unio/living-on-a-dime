import type { Company, Customer, Invoice } from "@/lib/types";
import type { InvoiceTotals } from "@/lib/calc";
import { formatDate, formatMoney, amountInWords } from "@/lib/format";
import { getTaxSystem } from "@/lib/taxSystem";
import { QRCodeSVG } from "qrcode.react";

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
  const showUPI = isIndia && !!company.upiId && totals.balance > 0;

  const upiLink = showUPI
    ? `upi://pay?pa=${encodeURIComponent(company.upiId)}&pn=${encodeURIComponent(company.name)}&am=${totals.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoice.number)}`
    : "";

  return (
    <div className="p-10 text-sm text-slate-800" style={{ minHeight: 800 }}>
      <div className="flex items-start justify-between gap-6 border-b pb-6">
        <div className="flex items-start gap-4">
          <CompanyLogo company={company} />
          <div>
            <div className="text-2xl font-bold text-[#0F7B6C]">{company.name || "Your Company"}</div>
            {company.tagline && <div className="text-xs text-muted-foreground">{company.tagline}</div>}
            <div className="mt-2 text-xs text-slate-600">
              {[company.street, company.city, company.state, company.pin].filter(Boolean).join(", ")}
              {company.country && <><br />{company.country}</>}
              {company.email && <><br />{company.email}</>}
              {company.phone && <> · {company.phone}</>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold uppercase tracking-wide text-slate-700">{isIndia ? "Tax Invoice" : "Invoice"}</div>
          <div className="mt-2 text-sm font-medium">{invoice.number}</div>
          <div className="text-xs text-slate-500">Date: {formatDate(invoice.date)}</div>
          <div className="text-xs text-slate-500">Due: {formatDate(invoice.dueDate)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Bill To</div>
          <div className="mt-1 font-medium">{customer?.displayName || "—"}</div>
          {customer?.companyName && <div>{customer.companyName}</div>}
          <div className="text-xs text-slate-600">
            {[customer?.city, customer?.state].filter(Boolean).join(", ")}
            {customer?.email && <><br />{customer.email}</>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-600">
          {isIndia && <div>Place of Supply: <span className="font-medium text-slate-800">{customer?.state || "—"}</span></div>}
          
        </div>
      </div>

      {/* Compliance block */}
      <ComplianceBlock company={company} customer={customer} taxSystemKey={taxSystem.key} />

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-xs uppercase text-slate-600">
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Item / Description</th>
            {taxSystem.showHSN && <th className="px-3 py-2 text-left font-semibold">HSN/SAC</th>}
            <th className="px-3 py-2 text-right font-semibold">Qty</th>
            <th className="px-3 py-2 text-right font-semibold">Rate</th>
            <th className="px-3 py-2 text-right font-semibold">{taxSystem.label} %</th>
            <th className="px-3 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li, i) => (
            <tr key={li.id} className="border-b">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{li.description}</td>
              {taxSystem.showHSN && <td className="px-3 py-2 text-slate-600">{li.hsnCode || "—"}</td>}
              <td className="px-3 py-2 text-right">{li.qty}</td>
              <td className="px-3 py-2 text-right">{formatMoney(li.rate, curr)}</td>
              <td className="px-3 py-2 text-right">{li.taxRate}%</td>
              <td className="px-3 py-2 text-right font-medium">{formatMoney(li.qty * li.rate, curr)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-72 space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(totals.subtotal, curr)} />
          {totals.discountAmount > 0 && <Row label="Discount" value={`− ${formatMoney(totals.discountAmount, curr)}`} />}
          <Row label="Taxable Amount" value={formatMoney(totals.taxableAmount, curr)} />
          <PrintTaxRows totals={totals} curr={curr} treatment={customer?.gstTreatment} />
          {totals.adjustment !== 0 && <Row label={invoice.adjustment?.label || "Adjustment"} value={formatMoney(totals.adjustment, curr)} />}
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span><span>{formatMoney(totals.total, curr)}</span>
          </div>
          {totals.paid > 0 && <Row label="Paid" value={`− ${formatMoney(totals.paid, curr)}`} />}
          {totals.balance > 0 && (
            <div className="flex items-center justify-between text-sm font-semibold text-[#DC2626]">
              <span>Balance Due</span><span>{formatMoney(totals.balance, curr)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs italic text-slate-600">
        {amountInWords(totals.total, curr)}
      </div>

      {showUPI && (
        <div className="mt-6 flex justify-end">
          <div className="text-center">
            <QRCodeSVG value={upiLink} size={80} fgColor="#0F7B6C" />
            <div className="mt-1 text-xs text-slate-500">Scan to pay via UPI</div>
          </div>
        </div>
      )}

      {(invoice.notes || invoice.terms) && (
        <div className="mt-10 grid grid-cols-2 gap-6 border-t pt-6 text-xs text-slate-600">
          {invoice.notes && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Notes</div>
              <div className="whitespace-pre-wrap">{invoice.notes}</div>
            </div>
          )}
          {invoice.terms && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Terms &amp; Conditions</div>
              <div className="whitespace-pre-wrap">{invoice.terms}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompanyLogo({ company }: { company: Company }) {
  const logo = (company.logo || "").trim();
  if (logo) {
    return (
      <img
        src={logo}
        alt={`${company.name || "Company"} logo`}
        crossOrigin="anonymous"
        style={{ maxHeight: 80, maxWidth: 160, objectFit: "contain" }}
      />
    );
  }
  const name = (company.name || "U").trim();
  const parts = name.split(/\s+/);
  const inits = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
  return (
    <div
      style={{ height: 64, width: 64, borderRadius: 12, background: "#0F7B6C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22 }}
    >
      {inits}
    </div>
  );
}

function ComplianceBlock({ company, customer, taxSystemKey }: { company: Company; customer?: Customer; taxSystemKey: string }) {
  const lines: string[] = [];
  if (taxSystemKey === "india") {
    const a: string[] = [];
    if (company.gst) a.push(`GSTIN: ${company.gst}`);
    if (company.pan) a.push(`PAN: ${company.pan}`);
    if (a.length) lines.push(a.join(" | "));
    const b: string[] = [];
    if (customer?.gstin) b.push(`Customer GSTIN: ${customer.gstin}`);
    if (customer?.state) b.push(`Place of Supply: ${customer.state}`);
    if (b.length) lines.push(b.join(" | "));
  } else if (taxSystemKey === "uk" || taxSystemKey === "eu") {
    if (company.vatNumber) lines.push(`VAT Reg No: ${company.vatNumber}`);
    if (customer?.vatNumber) lines.push(`Customer VAT No: ${customer.vatNumber}`);
  } else if (taxSystemKey === "us") {
    if (company.ein) lines.push(`EIN: ${company.ein}`);
    if (customer?.ein) lines.push(`Customer EIN: ${customer.ein}`);
  } else if (taxSystemKey === "australia") {
    if (company.abn) lines.push(`ABN: ${company.abn}`);
    if (customer?.abn) lines.push(`Customer ABN: ${customer.abn}`);
  } else if (taxSystemKey === "canada") {
    if (company.bn) lines.push(`BN: ${company.bn}`);
    if (customer?.bn) lines.push(`Customer BN: ${customer.bn}`);
  }
  if (!lines.length) return null;
  return (
    <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

function PrintTaxRows({ totals, curr, treatment }: { totals: InvoiceTotals; curr: string; treatment?: string }) {
  const sys = totals.systemKey;
  if (sys === "india") {
    if (treatment === "overseas") return <Row label="Export (0%)" value={formatMoney(0, curr)} />;
    if (totals.igst > 0) return <Row label="IGST" value={formatMoney(totals.igst, curr)} />;
    return (
      <>
        <Row label="CGST" value={formatMoney(totals.cgst, curr)} />
        <Row label="SGST" value={formatMoney(totals.sgst, curr)} />
      </>
    );
  }
  if (sys === "canada") {
    return (
      <>
        {totals.gst > 0 && <Row label="GST (5%)" value={formatMoney(totals.gst, curr)} />}
        {totals.pst > 0 && <Row label="PST" value={formatMoney(totals.pst, curr)} />}
        {totals.hst > 0 && <Row label="HST" value={formatMoney(totals.hst, curr)} />}
      </>
    );
  }
  if (sys === "us") return <Row label="Sales Tax" value={formatMoney(totals.salesTax, curr)} />;
  const label = sys === "australia" ? "GST" : sys === "other" ? "Tax" : "VAT";
  return <Row label={label} value={formatMoney(totals.taxAmount, curr)} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
