import { store, uid } from "./storage";
import type { Employee, Expense, PayrollPayment } from "./types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[+m - 1]} ${y}`;
}

export function isPaidFor(employeeId: string, month: string): boolean {
  return store.getPayrollPayments().some((p) => p.employeeId === employeeId && p.month === month);
}

/** Marks a salary paid: creates the linked Salary expense + payroll history row. */
export function markSalaryPaid(emp: Employee, date: string, month = monthKey(new Date(date))): boolean {
  if (isPaidFor(emp.id, month)) return false;

  const paymentId = uid("pay");
  const expense: Expense = {
    id: uid("exp"),
    payrollPaymentId: paymentId,
    date,
    category: "Salary",
    vendor: emp.name,
    amount: emp.salary,
    taxRate: 0,
    paidThrough: "bank_transfer",
    billable: false,
    status: "non-billable",
    notes: `Salary - ${emp.name} - ${monthLabel(month)}`,
  };
  store.upsertExpense(expense);

  const payment: PayrollPayment = {
    id: paymentId,
    employeeId: emp.id,
    month,
    amount: emp.salary,
    datePaid: date,
    expenseId: expense.id,
    status: "paid",
  };
  store.savePayroll(store.getEmployees(), [...store.getPayrollPayments(), payment]);
  return true;
}

/** Updates a payroll payment amount/date and keeps its Salary expense in sync. */
export function updatePayrollPayment(paymentId: string, patch: { amount?: number; datePaid?: string }) {
  const payments = store.getPayrollPayments();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return;
  const next = { ...payment, ...patch };
  const expense = store.getExpenses().find((e) => e.id === payment.expenseId || e.payrollPaymentId === paymentId);
  if (expense) {
    store.upsertExpense({ ...expense, amount: next.amount, date: next.datePaid });
  }
  store.savePayroll(store.getEmployees(), payments.map((p) => (p.id === paymentId ? next : p)));
}

/** Deletes a payroll payment and its linked Salary expense. */
export function deletePayrollPayment(paymentId: string) {
  const payments = store.getPayrollPayments();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return;
  const expense = store.getExpenses().find((e) => e.id === payment.expenseId || e.payrollPaymentId === paymentId);
  if (expense) store.deleteExpense(expense.id);
  store.savePayroll(store.getEmployees(), payments.filter((p) => p.id !== paymentId));
}

/** Runs due auto-pay salaries for the current month. Returns how many were paid. */
export function runAutoPay(): number {
  const today = new Date();
  const month = monthKey(today);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  let count = 0;
  store.getEmployees().forEach((emp) => {
    if (!emp.autoPay) return;
    const due = Math.min(emp.payDay || 1, lastDay);
    if (today.getDate() < due) return;
    const payDate = ymd(new Date(today.getFullYear(), today.getMonth(), due));
    if (markSalaryPaid(emp, payDate, month)) count++;
  });
  return count;
}

/** Deletes an employee plus its payroll history and generated salary expenses. */
export function deleteEmployee(id: string) {
  const payments = store.getPayrollPayments();
  payments.filter((p) => p.employeeId === id).forEach((p) => store.deleteExpense(p.expenseId));
  store.savePayroll(
    store.getEmployees().filter((e) => e.id !== id),
    payments.filter((p) => p.employeeId !== id),
  );
}
