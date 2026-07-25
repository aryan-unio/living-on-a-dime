import type { Invoice, LineItem, Customer, Company } from "./types";
import { calculateLineTax, getTaxSystem, computeTaxSystemKey } from "./taxSystem";

export function lineSubtotal(li: LineItem): number {
  return (li.qty || 0) * (li.rate || 0);
}

export function lineTax(li: LineItem): number {
  return (lineSubtotal(li) * (li.taxRate || 0)) / 100;
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gst: number;
  pst: number;
  hst: number;
  vat: number;
  salesTax: number;
  adjustment: number;
  total: number;
  paid: number;
  balance: number;
  isInterState: boolean;
  taxLabel: string;
  systemKey: string;
}

export function isInterState(company: Company | undefined, customer: Customer | undefined): boolean {
  if (!company || !customer) return false;
  if (customer.gstTreatment === "overseas") return true;
  if (!customer.state || !company.state) return false;
  return company.state.trim().toLowerCase() !== customer.state.trim().toLowerCase();
}

export function computeInvoiceTotals(
  invoice: Invoice,
  company?: Company,
  customer?: Customer,
): InvoiceTotals {
  const subtotal = invoice.lineItems.reduce((s, li) => s + lineSubtotal(li), 0);
  const discountAmount =
    invoice.discount?.type === "percent"
      ? (subtotal * (invoice.discount.value || 0)) / 100
      : invoice.discount?.value || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

  // Resolve tax system (prefer snapshot for old invoices)
  const snapshot = invoice.taxSnapshot;
  const systemKey = snapshot?.system || (company ? computeTaxSystemKey(company.country) : "india");
  const sys = getTaxSystem(company?.country || "India");
  const splitLogic = (snapshot?.splitLogic || sys.splitLogic) as ReturnType<typeof getTaxSystem>["splitLogic"];
  const companyState = snapshot?.companyState || company?.state || "";
  const customerState = snapshot?.customerState || customer?.state || "";
  const treatment = customer?.gstTreatment || "registered";

  let cgst = 0, sgst = 0, igst = 0, gst = 0, pst = 0, hst = 0, vat = 0, salesTax = 0;
  let labelSet = new Set<string>();

  for (const li of invoice.lineItems) {
    const lineNet = lineSubtotal(li) * (1 - discountRatio);
    const br = calculateLineTax(lineNet, li.taxRate || 0, splitLogic, companyState, customerState, treatment);
    cgst += br.cgst || 0;
    sgst += br.sgst || 0;
    igst += br.igst || 0;
    gst += br.gst || 0;
    pst += br.pst || 0;
    hst += br.hst || 0;
    if (systemKey === "uk" || systemKey === "eu" || systemKey === "australia" || systemKey === "other") vat += br.total;
    if (systemKey === "us") salesTax += br.total;
    if (br.label) labelSet.add(br.label);
  }

  const taxAmount = cgst + sgst + igst + gst + pst + hst + (systemKey === "us" ? salesTax : 0) + ((systemKey === "uk" || systemKey === "eu" || systemKey === "australia" || systemKey === "other") ? vat : 0);
  const adjustment = invoice.adjustment?.value || 0;
  const total = round2(taxableAmount + taxAmount + adjustment);
  const paid = (invoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const balance = round2(total - paid);

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxableAmount: round2(taxableAmount),
    taxAmount: round2(taxAmount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    gst: round2(gst),
    pst: round2(pst),
    hst: round2(hst),
    vat: round2(vat),
    salesTax: round2(salesTax),
    adjustment: round2(adjustment),
    total,
    paid: round2(paid),
    balance,
    isInterState: igst > 0,
    taxLabel: [...labelSet].join(", "),
    systemKey,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function deriveStatus(invoice: Invoice, company?: Company, customer?: Customer): Invoice["status"] {
  if (invoice.status === "draft" || invoice.status === "void") return invoice.status;
  const t = computeInvoiceTotals(invoice, company, customer);
  if (t.balance <= 0.01) return "paid";
  if (t.paid > 0) return "partial";
  const due = new Date(invoice.dueDate).getTime();
  if (due < Date.now()) return "overdue";
  return "sent";
}
