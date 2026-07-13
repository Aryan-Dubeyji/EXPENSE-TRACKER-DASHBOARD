import { useSyncExternalStore } from "react";
import type { Expense, Income, Budget, User } from "./types";

const KEYS = {
  users: "et.users",
  session: "et.session",
  expenses: (uid: string) => `et.expenses.${uid}`,
  income: (uid: string) => `et.income.${uid}`,
  budgets: (uid: string) => `et.budgets.${uid}`,
  categories: (uid: string) => `et.categories.${uid}`,
  settings: (uid: string) => `et.settings.${uid}`,
};

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

// Cache the last parsed value per key so useSyncExternalStore
// receives stable references between renders.
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    cache.set(key, value);
    return value;
  } catch {
    cache.set(key, fallback);
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
  cache.set(key, value);
  emit();
}

// SSR-safe empty snapshot: no localStorage reads on the server.
function serverSnapshot<T>(): T {
  return undefined as unknown as T;
}

export function useStoreSnapshot<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}

// --- Auth ---
interface StoredUser extends User {
  passwordHash: string;
}

async function hashPassword(pw: string): Promise<string> {
  if (!isBrowser() || !window.crypto?.subtle) return btoa(pw);
  const data = new TextEncoder().encode(pw + "_expense_tracker_salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const users = read<StoredUser[]>(KEYS.users, []);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  const passwordHash = await hashPassword(password);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  write(KEYS.users, users);
  const { passwordHash: _, ...pub } = user;
  write(KEYS.session, pub);
  seedDemoData(user.id);
  return pub;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const users = read<StoredUser[]>(KEYS.users, []);
  const passwordHash = await hashPassword(password);
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === passwordHash,
  );
  if (!user) throw new Error("Invalid email or password.");
  const { passwordHash: _, ...pub } = user;
  write(KEYS.session, pub);
  return pub;
}

export function logoutUser() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.session);
  emit();
}

export function getSession(): User | null {
  return read<User | null>(KEYS.session, null);
}

export function updateProfile(userId: string, updates: Partial<Pick<User, "name" | "email">>) {
  const users = read<StoredUser[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return;
  users[idx] = { ...users[idx], ...updates };
  write(KEYS.users, users);
  const session = getSession();
  if (session && session.id === userId) {
    write(KEYS.session, { ...session, ...updates });
  }
}

export async function changePassword(userId: string, oldPw: string, newPw: string) {
  const users = read<StoredUser[]>(KEYS.users, []);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("User not found");
  const oldHash = await hashPassword(oldPw);
  if (users[idx].passwordHash !== oldHash) throw new Error("Current password is incorrect.");
  users[idx].passwordHash = await hashPassword(newPw);
  write(KEYS.users, users);
}

// --- Expenses ---
export function getExpenses(uid: string): Expense[] {
  return read<Expense[]>(KEYS.expenses(uid), []);
}
export function saveExpense(uid: string, e: Expense) {
  const list = getExpenses(uid);
  const idx = list.findIndex((x) => x.id === e.id);
  if (idx >= 0) list[idx] = e;
  else list.unshift(e);
  write(KEYS.expenses(uid), list);
}
export function deleteExpense(uid: string, id: string) {
  write(KEYS.expenses(uid), getExpenses(uid).filter((e) => e.id !== id));
}

// --- Income ---
export function getIncome(uid: string): Income[] {
  return read<Income[]>(KEYS.income(uid), []);
}
export function saveIncome(uid: string, i: Income) {
  const list = getIncome(uid);
  const idx = list.findIndex((x) => x.id === i.id);
  if (idx >= 0) list[idx] = i;
  else list.unshift(i);
  write(KEYS.income(uid), list);
}
export function deleteIncome(uid: string, id: string) {
  write(KEYS.income(uid), getIncome(uid).filter((e) => e.id !== id));
}

// --- Budgets ---
export function getBudgets(uid: string): Budget[] {
  return read<Budget[]>(KEYS.budgets(uid), []);
}
export function saveBudget(uid: string, b: Budget) {
  const list = getBudgets(uid);
  const idx = list.findIndex((x) => x.id === b.id);
  if (idx >= 0) list[idx] = b;
  else list.unshift(b);
  write(KEYS.budgets(uid), list);
}
export function deleteBudget(uid: string, id: string) {
  write(KEYS.budgets(uid), getBudgets(uid).filter((e) => e.id !== id));
}

// --- Custom categories ---
export function getCustomCategories(uid: string): string[] {
  return read<string[]>(KEYS.categories(uid), []);
}
export function addCustomCategory(uid: string, name: string) {
  const list = getCustomCategories(uid);
  if (list.includes(name)) return;
  list.push(name);
  write(KEYS.categories(uid), list);
}

// --- Settings ---
export interface UserSettings {
  theme: "light" | "dark";
  accent: string;
  currency: string;
}
const DEFAULT_SETTINGS: UserSettings = { theme: "light", accent: "emerald", currency: "$" };
export function getSettings(uid: string): UserSettings {
  return read<UserSettings>(KEYS.settings(uid), DEFAULT_SETTINGS);
}
export function saveSettings(uid: string, s: UserSettings) {
  write(KEYS.settings(uid), s);
}

// --- Import / Export ---
export function exportData(uid: string) {
  return {
    exportedAt: new Date().toISOString(),
    expenses: getExpenses(uid),
    income: getIncome(uid),
    budgets: getBudgets(uid),
    categories: getCustomCategories(uid),
  };
}
export function importData(uid: string, data: any) {
  if (Array.isArray(data.expenses)) write(KEYS.expenses(uid), data.expenses);
  if (Array.isArray(data.income)) write(KEYS.income(uid), data.income);
  if (Array.isArray(data.budgets)) write(KEYS.budgets(uid), data.budgets);
  if (Array.isArray(data.categories)) write(KEYS.categories(uid), data.categories);
}

// --- Demo seed ---
function seedDemoData(uid: string) {
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };
  const expenses: Expense[] = [
    { id: crypto.randomUUID(), title: "Whole Foods Groceries", amount: 142.5, category: "Food", date: daysAgo(1), paymentMethod: "Credit Card", notes: "", createdAt: daysAgo(1) },
    { id: crypto.randomUUID(), title: "Uber to airport", amount: 38.2, category: "Transportation", date: daysAgo(2), paymentMethod: "Credit Card", createdAt: daysAgo(2) },
    { id: crypto.randomUUID(), title: "Netflix", amount: 15.99, category: "Entertainment", date: daysAgo(3), paymentMethod: "Debit Card", createdAt: daysAgo(3) },
    { id: crypto.randomUUID(), title: "Apartment Rent", amount: 1650, category: "Rent", date: daysAgo(5), paymentMethod: "Bank Transfer", createdAt: daysAgo(5) },
    { id: crypto.randomUUID(), title: "Electric Bill", amount: 92.4, category: "Utilities", date: daysAgo(6), paymentMethod: "Bank Transfer", createdAt: daysAgo(6) },
    { id: crypto.randomUUID(), title: "Nike Sneakers", amount: 129, category: "Shopping", date: daysAgo(8), paymentMethod: "Credit Card", createdAt: daysAgo(8) },
    { id: crypto.randomUUID(), title: "Coffee & pastry", amount: 8.75, category: "Food", date: daysAgo(9), paymentMethod: "Cash", createdAt: daysAgo(9) },
    { id: crypto.randomUUID(), title: "Gym membership", amount: 45, category: "Healthcare", date: daysAgo(12), paymentMethod: "Credit Card", createdAt: daysAgo(12) },
    { id: crypto.randomUUID(), title: "Weekend trip", amount: 320, category: "Travel", date: daysAgo(15), paymentMethod: "Credit Card", createdAt: daysAgo(15) },
    { id: crypto.randomUUID(), title: "Coursera course", amount: 49, category: "Education", date: daysAgo(20), paymentMethod: "Credit Card", createdAt: daysAgo(20) },
    { id: crypto.randomUUID(), title: "Restaurant dinner", amount: 78.5, category: "Food", date: daysAgo(22), paymentMethod: "Credit Card", createdAt: daysAgo(22) },
    { id: crypto.randomUUID(), title: "Gasoline", amount: 52, category: "Transportation", date: daysAgo(25), paymentMethod: "Debit Card", createdAt: daysAgo(25) },
  ];
  const income: Income[] = [
    { id: crypto.randomUUID(), source: "Monthly Salary", amount: 5400, category: "Salary", date: daysAgo(4), notes: "", createdAt: daysAgo(4) },
    { id: crypto.randomUUID(), source: "Freelance project", amount: 1200, category: "Freelancing", date: daysAgo(11), createdAt: daysAgo(11) },
    { id: crypto.randomUUID(), source: "Dividend payout", amount: 210, category: "Investments", date: daysAgo(18), createdAt: daysAgo(18) },
  ];
  const budgets: Budget[] = [
    { id: crypto.randomUUID(), category: "Food", monthlyLimit: 500, createdAt: now.toISOString() },
    { id: crypto.randomUUID(), category: "Transportation", monthlyLimit: 200, createdAt: now.toISOString() },
    { id: crypto.randomUUID(), category: "Entertainment", monthlyLimit: 150, createdAt: now.toISOString() },
    { id: crypto.randomUUID(), category: "Shopping", monthlyLimit: 300, createdAt: now.toISOString() },
  ];
  write(KEYS.expenses(uid), expenses);
  write(KEYS.income(uid), income);
  write(KEYS.budgets(uid), budgets);
}
