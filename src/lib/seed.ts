import type { Company, Customer, Expense, Invoice, Item, Quote } from "./types";

function daysFromNow(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function buildSeed() {
  const company: Company = {
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

  const customers: Customer[] = [
    {
      id: "cust_001",
      displayName: "Rajesh Mehta",
      companyName: "TechSphere Solutions Pvt Ltd",
      email: "rajesh@techsphere.in",
      phone: "9820012345",
      gstin: "27AABCT1234A1Z5",
      gstTreatment: "registered",
      state: "Maharashtra",
      city: "Mumbai",
      outstandingBalance: 124500,
      totalInvoiced: 450000,
    },
    {
      id: "cust_002",
      displayName: "Priya Sharma",
      companyName: "Sharma Retail Traders",
      email: "priya@sharmaretail.com",
      phone: "9811098765",
      gstin: "07BCOPS5678B1Z3",
      gstTreatment: "registered",
      state: "Delhi",
      city: "New Delhi",
      outstandingBalance: 38200,
      totalInvoiced: 220000,
    },
    {
      id: "cust_003",
      displayName: "Ankit Desai",
      companyName: "",
      email: "ankit.desai@gmail.com",
      phone: "9900112233",
      gstin: "",
      gstTreatment: "unregistered",
      state: "Karnataka",
      city: "Bangalore",
      outstandingBalance: 15000,
      totalInvoiced: 75000,
    },
    {
      id: "cust_004",
      displayName: "Suresh Kumar",
      companyName: "Kumar Manufacturing Co.",
      email: "suresh@kumarmanufacturing.com",
      phone: "9444055566",
      gstin: "33DFGHI9012C1Z7",
      gstTreatment: "registered",
      state: "Tamil Nadu",
      city: "Chennai",
      outstandingBalance: 0,
      totalInvoiced: 310000,
    },
    {
      id: "cust_005",
      displayName: "Sarah Johnson",
      companyName: "Johnson Consulting LLC",
      email: "sarah@johnsonconsulting.com",
      phone: "0019174445566",
      gstin: "",
      gstTreatment: "overseas",
      state: "California",
      city: "San Francisco",
      outstandingBalance: 85000,
      totalInvoiced: 185000,
    },
  ];

  const invoices: Invoice[] = [
    {
      id: "inv_001",
      number: "INV-0001",
      customerId: "cust_001",
      date: daysFromNow(-5),
      dueDate: daysFromNow(25),
      status: "sent",
      lineItems: [
        { id: "li_1", description: "Web Development Services", qty: 10, rate: 8000, taxRate: 18, hsnCode: "998314" },
        { id: "li_2", description: "UI/UX Design", qty: 5, rate: 6000, taxRate: 18, hsnCode: "998314" },
      ],
      discount: { type: "percent", value: 5 },
      payments: [],
      notes: "",
      terms: "Payment due within 30 days.",
    },
    {
      id: "inv_002",
      number: "INV-0002",
      customerId: "cust_004",
      date: daysFromNow(-95),
      dueDate: daysFromNow(-65),
      status: "paid",
      lineItems: [
        { id: "li_3", description: "Industrial Machine Parts", qty: 50, rate: 2000, taxRate: 12, hsnCode: "8431" },
      ],
      discount: { type: "percent", value: 0 },
      payments: [
        { id: "pay_001", date: daysFromNow(-60), amount: 112000, mode: "bank_transfer", reference: "NEFT2024001" },
      ],
    },
    {
      id: "inv_003",
      number: "INV-0003",
      customerId: "cust_002",
      date: daysFromNow(-45),
      dueDate: daysFromNow(-15),
      status: "overdue",
      lineItems: [
        { id: "li_4", description: "Retail Software License", qty: 1, rate: 25000, taxRate: 18, hsnCode: "997331" },
        { id: "li_5", description: "Installation & Setup", qty: 1, rate: 8000, taxRate: 18, hsnCode: "998314" },
      ],
      discount: { type: "percent", value: 0 },
      payments: [
        { id: "pay_002", date: daysFromNow(-20), amount: 10000, mode: "upi", reference: "UPI2024089" },
      ],
    },
    {
      id: "inv_004",
      number: "INV-0004",
      customerId: "cust_003",
      date: daysFromNow(-20),
      dueDate: daysFromNow(10),
      status: "partial",
      lineItems: [
        { id: "li_6", description: "Logo Design", qty: 1, rate: 8000, taxRate: 18, hsnCode: "998383" },
        { id: "li_7", description: "Brand Guidelines Document", qty: 1, rate: 5000, taxRate: 18, hsnCode: "998383" },
      ],
      discount: { type: "percent", value: 0 },
      payments: [
        { id: "pay_003", date: daysFromNow(-10), amount: 5000, mode: "upi", reference: "UPI2024102" },
      ],
    },
    {
      id: "inv_005",
      number: "INV-0005",
      customerId: "cust_004",
      date: daysFromNow(-10),
      dueDate: daysFromNow(20),
      status: "paid",
      lineItems: [
        { id: "li_8", description: "Annual Maintenance Contract", qty: 1, rate: 48000, taxRate: 18, hsnCode: "998714" },
      ],
      discount: { type: "percent", value: 0 },
      payments: [
        { id: "pay_004", date: daysFromNow(-5), amount: 56640, mode: "cheque", reference: "CHQ00234" },
      ],
    },
    {
      id: "inv_006",
      number: "INV-0006",
      customerId: "cust_005",
      date: daysFromNow(-3),
      dueDate: daysFromNow(27),
      status: "draft",
      lineItems: [
        { id: "li_9", description: "Consulting Services - Q1", qty: 40, rate: 150, taxRate: 0, hsnCode: "998311" },
      ],
      discount: { type: "percent", value: 0 },
      payments: [],
    },
    {
      id: "inv_007",
      number: "INV-0007",
      customerId: "cust_001",
      date: daysFromNow(-60),
      dueDate: daysFromNow(-30),
      status: "void",
      lineItems: [
        { id: "li_10", description: "Server Setup", qty: 1, rate: 15000, taxRate: 18, hsnCode: "998314" },
      ],
      discount: { type: "percent", value: 0 },
      payments: [],
    },
    {
      id: "inv_008",
      number: "INV-0008",
      customerId: "cust_002",
      date: daysFromNow(-15),
      dueDate: daysFromNow(15),
      status: "sent",
      lineItems: [
        { id: "li_11", description: "POS System License", qty: 3, rate: 5000, taxRate: 18, hsnCode: "997331" },
        { id: "li_12", description: "Hardware Installation", qty: 3, rate: 2000, taxRate: 12, hsnCode: "998719" },
        { id: "li_13", description: "Staff Training", qty: 2, rate: 3000, taxRate: 0, hsnCode: "999292" },
        { id: "li_14", description: "Annual Support", qty: 1, rate: 8000, taxRate: 18, hsnCode: "998714" },
      ],
      discount: { type: "fixed", value: 2000 },
      payments: [],
    },
  ];

  const items: Item[] = [
    { id: "item_001", name: "Web Development", type: "service", rate: 8000, taxRate: 18, sacCode: "998314", unit: "hour" },
    { id: "item_002", name: "Logo Design", type: "service", rate: 8000, taxRate: 18, sacCode: "998383", unit: "project" },
    { id: "item_003", name: "Software License", type: "service", rate: 25000, taxRate: 18, sacCode: "997331", unit: "license" },
    { id: "item_004", name: "Machine Parts", type: "goods", rate: 2000, taxRate: 12, hsnCode: "8431", unit: "piece" },
    { id: "item_005", name: "Training Session", type: "service", rate: 3000, taxRate: 0, sacCode: "999292", unit: "session" },
  ];

  const expenses: Expense[] = [
    { id: "exp_001", date: daysFromNow(-5), category: "Travel", vendor: "IndiGo Airlines", amount: 8500, taxRate: 5, paidThrough: "card", customerId: "cust_001", billable: true, status: "unbilled", notes: "Flight to Mumbai for client meeting" },
    { id: "exp_002", date: daysFromNow(-15), category: "Software", vendor: "Adobe Systems", amount: 4800, taxRate: 18, paidThrough: "card", billable: false, status: "non-billable", notes: "Creative Cloud subscription" },
    { id: "exp_003", date: daysFromNow(-1), category: "Rent", vendor: "Prestige Office Spaces", amount: 35000, taxRate: 18, paidThrough: "bank_transfer", billable: false, status: "non-billable", notes: "Monthly office rent" },
    { id: "exp_004", date: daysFromNow(-3), category: "Meals", vendor: "The Taj Hotel", amount: 3200, taxRate: 5, paidThrough: "cash", customerId: "cust_004", billable: true, status: "unbilled", notes: "Client dinner - Kumar Manufacturing" },
  ];

  const quotes: Quote[] = [
    { id: "qte_001", number: "QTE-0001", customerId: "cust_001", date: daysFromNow(-30), expiryDate: daysFromNow(-5), status: "accepted", total: 85000 },
    { id: "qte_002", number: "QTE-0002", customerId: "cust_003", date: daysFromNow(-5), expiryDate: daysFromNow(25), status: "sent", total: 22000 },
    { id: "qte_003", number: "QTE-0003", customerId: "cust_002", date: daysFromNow(-40), expiryDate: daysFromNow(-10), status: "expired", total: 55000 },
  ];

  return { company, customers, invoices, quotes, expenses, items };
}
