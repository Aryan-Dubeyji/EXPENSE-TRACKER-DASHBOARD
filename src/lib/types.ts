export type TransactionType = "expense" | "income";

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string; // ISO
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Rent",
  "Education",
  "Travel",
  "Other",
];

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelancing",
  "Investments",
  "Business",
  "Gift",
  "Other",
];

export const PAYMENT_METHODS = ["Cash", "Credit Card", "Debit Card", "UPI", "Bank Transfer", "Wallet"];
