// Multi-country tax system engine for Unio Invoice.

export type SplitLogic =
  | "india_cgst_sgst_igst"
  | "canada_gst_pst"
  | "none";

export interface TaxComplianceField {
  label: string;
  key: string;
}

export interface TaxSystemConfig {
  key: string;
  label: string;
  rates: number[];
  freeEntry: boolean;
  splitLogic: SplitLogic;
  showHSN: boolean;
  showUPI: boolean;
  tooltip?: string;
  complianceField: TaxComplianceField | null;
  secondaryComplianceField?: TaxComplianceField | null;
  customerTaxField: TaxComplianceField | null;
}

export const TAX_SYSTEMS: Record<string, TaxSystemConfig> = {
  india: {
    key: "india",
    label: "GST",
    rates: [0, 5, 12, 18, 28],
    freeEntry: false,
    splitLogic: "india_cgst_sgst_igst",
    showHSN: true,
    showUPI: true,
    complianceField: { label: "GST Number", key: "gst" },
    secondaryComplianceField: { label: "PAN Number", key: "pan" },
    customerTaxField: { label: "GSTIN", key: "gstin" },
  },
  us: {
    key: "us",
    label: "Sales Tax",
    rates: [],
    freeEntry: true,
    splitLogic: "none",
    showHSN: false,
    showUPI: false,
    tooltip:
      "Tax rates vary by state. Enter the applicable rate for your customer's location.",
    complianceField: { label: "EIN", key: "ein" },
    customerTaxField: { label: "EIN", key: "ein" },
  },
  uk: {
    key: "uk",
    label: "VAT",
    rates: [0, 5, 20],
    freeEntry: false,
    splitLogic: "none",
    showHSN: false,
    showUPI: false,
    complianceField: { label: "VAT Reg No", key: "vatNumber" },
    customerTaxField: { label: "VAT Number", key: "vatNumber" },
  },
  eu: {
    key: "eu",
    label: "VAT",
    rates: [0, 5, 10, 20, 21, 23],
    freeEntry: true,
    splitLogic: "none",
    showHSN: false,
    showUPI: false,
    complianceField: { label: "VAT No", key: "vatNumber" },
    customerTaxField: { label: "VAT Number", key: "vatNumber" },
  },
  canada: {
    key: "canada",
    label: "GST/HST",
    rates: [0, 5, 13, 15],
    freeEntry: false,
    splitLogic: "canada_gst_pst",
    showHSN: false,
    showUPI: false,
    complianceField: { label: "Business Number (BN)", key: "bn" },
    customerTaxField: { label: "BN", key: "bn" },
  },
  australia: {
    key: "australia",
    label: "GST",
    rates: [0, 10],
    freeEntry: false,
    splitLogic: "none",
    showHSN: false,
    showUPI: false,
    complianceField: { label: "ABN", key: "abn" },
    customerTaxField: { label: "ABN", key: "abn" },
  },
  other: {
    key: "other",
    label: "Tax",
    rates: [],
    freeEntry: true,
    splitLogic: "none",
    showHSN: false,
    showUPI: false,
    complianceField: { label: "Tax Registration Number", key: "taxRegNumber" },
    customerTaxField: { label: "Tax ID", key: "taxRegNumber" },
  },
};

export const EU_COUNTRIES = [
  "Germany","France","Italy","Spain","Netherlands","Belgium","Austria","Portugal",
  "Sweden","Denmark","Finland","Ireland","Poland","Czech Republic","Romania",
  "Hungary","Greece","Croatia","Bulgaria","Slovakia","Slovenia","Estonia",
  "Latvia","Lithuania","Luxembourg","Malta","Cyprus",
];

export const COUNTRIES = [
  "India","United States","United Kingdom","Canada","Australia",
  ...EU_COUNTRIES,
  "Singapore","United Arab Emirates","Saudi Arabia","South Africa","Brazil",
  "Mexico","Japan","China","New Zealand","Switzerland","Norway","Iceland",
  "Turkey","Israel","Egypt","Nigeria","Kenya","Argentina","Chile","Colombia",
  "Peru","Vietnam","Thailand","Indonesia","Malaysia","Philippines",
  "Bangladesh","Pakistan","Sri Lanka","Nepal","Russia","Ukraine","Other",
].sort();

export function computeTaxSystemKey(country: string): string {
  if (country === "India") return "india";
  if (country === "United States") return "us";
  if (country === "United Kingdom") return "uk";
  if (country === "Canada") return "canada";
  if (country === "Australia") return "australia";
  if (EU_COUNTRIES.includes(country)) return "eu";
  return "other";
}

export function getTaxSystem(country: string): TaxSystemConfig {
  return TAX_SYSTEMS[computeTaxSystemKey(country)];
}

export const STATES_BY_COUNTRY: Record<string, string[]> = {
  India: [
    "Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam",
    "Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu",
    "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir",
    "Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh",
    "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry",
    "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
    "Uttar Pradesh","Uttarakhand","West Bengal",
  ],
  "United States": [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
    "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
    "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
    "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
    "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
    "District of Columbia",
  ],
  Canada: [
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut",
    "Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon",
  ],
  Australia: [
    "Australian Capital Territory","New South Wales","Northern Territory",
    "Queensland","South Australia","Tasmania","Victoria","Western Australia",
  ],
};

export const CANADA_PROVINCE_TAX: Record<
  string,
  { type: "HST" | "PST" | "QST" | "RST" | "none"; rate: number }
> = {
  Ontario: { type: "HST", rate: 13 },
  "British Columbia": { type: "PST", rate: 7 },
  Quebec: { type: "QST", rate: 9.975 },
  Saskatchewan: { type: "PST", rate: 6 },
  Manitoba: { type: "RST", rate: 7 },
  "Nova Scotia": { type: "HST", rate: 15 },
  "New Brunswick": { type: "HST", rate: 15 },
  "Newfoundland and Labrador": { type: "HST", rate: 15 },
  "Prince Edward Island": { type: "HST", rate: 15 },
  Alberta: { type: "none", rate: 0 },
  "Northwest Territories": { type: "none", rate: 0 },
  Nunavut: { type: "none", rate: 0 },
  Yukon: { type: "none", rate: 0 },
};

export interface TaxBreakdown {
  cgst?: number;
  sgst?: number;
  igst?: number;
  gst?: number;
  pst?: number;
  hst?: number;
  vat?: number;
  salesTax?: number;
  total: number;
  label: string;
}

export function calculateLineTax(
  lineAmount: number,
  taxRate: number,
  splitLogic: SplitLogic,
  companyState: string,
  customerState: string,
  customerTreatment: string,
): TaxBreakdown {
  const amt = lineAmount || 0;
  const r = taxRate || 0;

  if (splitLogic === "india_cgst_sgst_igst") {
    if (customerTreatment === "overseas") {
      return { total: 0, label: "Export (0%)" };
    }
    const sameState =
      companyState &&
      customerState &&
      companyState.trim().toLowerCase() === customerState.trim().toLowerCase();
    if (sameState) {
      const half = (amt * (r / 2)) / 100;
      return {
        cgst: half,
        sgst: half,
        total: half * 2,
        label: `CGST (${r / 2}%) + SGST (${r / 2}%)`,
      };
    }
    const igst = (amt * r) / 100;
    return { igst, total: igst, label: `IGST (${r}%)` };
  }

  if (splitLogic === "canada_gst_pst") {
    const province = CANADA_PROVINCE_TAX[customerState];
    if (province && province.type === "HST") {
      const hst = (amt * province.rate) / 100;
      return { hst, total: hst, label: `HST (${province.rate}%)` };
    }
    const gst = amt * 0.05;
    if (!province || province.type === "none") {
      return { gst, total: gst, label: "GST (5%)" };
    }
    const pst = (amt * province.rate) / 100;
    return {
      gst,
      pst,
      total: gst + pst,
      label: `GST (5%) + ${province.type} (${province.rate}%)`,
    };
  }

  // splitLogic === "none"
  const tax = (amt * r) / 100;
  return { total: tax, vat: tax, salesTax: tax, label: `Tax (${r}%)` };
}
