export type Currency = "INR" | "USD" | "EUR" | "GBP";

export interface Company {
  name: string;
  logo: string;
  tagline: string;
  email: string;
  phone: string;
  website?: string;
  // Tax registration fields (vary by country)
  gst: string;          // India GSTIN
  pan: string;          // India PAN
  ein?: string;         // US
  vatNumber?: string;   // UK / EU
  bn?: string;          // Canada
  abn?: string;         // Australia
  taxRegNumber?: string; // Other
  street: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  currency: Currency;
  fiscalYearStart: string;
  timezone: string;
  upiId: string;
  taxSystem?: string;   // computed key: india/us/uk/eu/canada/australia/other
}

export type GstTreatment = "registered" | "unregistered" | "overseas" | "composition" | "consumer";

export interface Customer {
  id: string;
  displayName: string;
  companyName: string;
  email: string;
  phone: string;
  // Tax fields (one used per country, but all stored)
  gstin: string;        // India
  ein?: string;         // US
  vatNumber?: string;   // UK / EU
  bn?: string;          // Canada
  abn?: string;         // Australia
  taxRegNumber?: string; // Other
  gstTreatment: GstTreatment;
  state: string;
  city: string;
  country?: string;
  outstandingBalance: number;
  totalInvoiced: number;
}

export interface LineItem {
  id: string;
  itemId?: string;
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
  hsnCode: string;
}

export type PaymentMode = "cash" | "upi" | "bank_transfer" | "card" | "cheque";

export interface Payment {
  id: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  notes?: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "partial" | "void";

export interface TaxSnapshot {
  system: string;
  companyState: string;
  customerState: string;
  splitLogic: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  date: string;
  dueDate: string;
  
  lineItems: LineItem[];
  discount: { type: "percent" | "fixed"; value: number };
  adjustment?: { label: string; value: number };
  notes?: string;
  terms?: string;
  status: InvoiceStatus;
  payments: Payment[];
  attachments?: string[];
  taxSnapshot?: TaxSnapshot;
  currency?: Currency;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "converted";

export interface Quote {
  id: string;
  number: string;
  customerId: string;
  date: string;
  expiryDate: string;
  lineItems?: LineItem[];
  discount?: { type: "percent" | "fixed"; value: number };
  notes?: string;
  status: QuoteStatus;
  total?: number;
}

export interface Item {
  id: string;
  name: string;
  type: "service" | "goods";
  rate: number;
  taxRate: number;
  sacCode?: string;
  hsnCode?: string;
  unit: string;
  description?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  vendor: string;
  amount: number;
  taxRate: number;
  paidThrough: PaymentMode;
  customerId?: string;
  billable: boolean;
  status: "unbilled" | "billed" | "non-billable";
  notes?: string;
  receiptPath?: string;
  receiptName?: string;
  receiptType?: string;
  billNumber?: string;
  billDate?: string;
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  status: "active" | "completed" | "on-hold";
  rate?: number;
}

export interface Settings {
  theme: "light" | "dark";
  reminderRules: Record<string, unknown>;
  sidebarCollapsed?: boolean;
  locale?: string;
}
