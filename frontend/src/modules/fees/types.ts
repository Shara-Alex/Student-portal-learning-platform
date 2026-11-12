// Mirrors backend/apps/fees/serializers.py. Keep them in sync.
import type { Tone } from "@/components/ui/badge";

export interface Fee {
  id: number;
  term: number;
  term_name: string;
  school_class: number | null; // null = every class
  school_class_name: string;
  name: string;
  amount: number;
}
export type FeeInput = Pick<Fee, "term" | "school_class" | "name" | "amount">;

export type InvoiceStatus = "paid" | "partial" | "overdue" | "pending";
export type PaymentMethod = "cash" | "bank" | "mobile" | "card";

export interface Payment {
  id: number;
  invoice: number;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
  received_by_name: string;
}
export type PaymentInput = Pick<Payment, "invoice" | "amount" | "date" | "method" | "reference">;

export interface Invoice {
  id: number;
  number: string;
  student: number;
  student_name: string;
  admission_number: string;
  term: number;
  term_name: string;
  issued: string;
  due_date: string;
  instalments: number;
  late_fee_applied: boolean;
  lines: { id: number; description: string; amount: number }[];
  payments: Payment[];
  total: number;
  paid: number;
  balance: number;
  due_now: number; // what should have been paid by today but has not been
  status: InvoiceStatus;
  schedule: { due: string; amount: number }[];
}

export interface Statement {
  invoices: Invoice[];
  balance: number;
  due_now: number;
}

export interface FeeSummary {
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
}

export interface BillInput {
  school_class: number;
  term: number;
  due_date: string;
  instalments: number;
}

/** Homeroom's colour code for money: green paid, yellow part paid, red overdue, blue not due yet. */
export const STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "good" },
  partial: { label: "Part paid", tone: "wait" },
  overdue: { label: "Overdue", tone: "bad" },
  pending: { label: "Not due yet", tone: "info" },
};

export const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "mobile", label: "Mobile money" },
  { value: "card", label: "Card" },
];
