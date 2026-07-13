import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSnapshot, getExpenses, deleteExpense, saveExpense, getSettings } from "@/lib/store";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import type { Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExpenseDialog } from "@/components/expense-dialog";
import { Plus, Search, MoreHorizontal, ArrowUpDown, Pencil, Copy, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/expenses")({
  component: ExpensesPage,
  head: () => ({ meta: [{ title: "Expenses — Finlytic" }] }),
});

function ExpensesPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const expenses = useStoreSnapshot(() => getExpenses(uid));
  const settings = useStoreSnapshot(() => getSettings(uid));
  const currency = settings.currency;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [editing, setEditing] = useState<Expense | null>(null);

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    if (category !== "all") list = list.filter((e) => e.category === category);
    list.sort((a, b) => {
      switch (sort) {
        case "date-desc": return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc": return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc": return b.amount - a.amount;
        case "amount-asc": return a.amount - b.amount;
      }
    });
    return list;
  }, [expenses, search, category, sort]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const duplicate = (e: Expense) => {
    saveExpense(uid, { ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    toast.success("Expense duplicated");
  };

  const remove = (id: string) => {
    deleteExpense(uid, id);
    toast.success("Expense deleted");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} transactions · Total {formatCurrency(total, currency)}
          </p>
        </div>
        <ExpenseDialog>
          <Button className="shrink-0 gap-2"><Plus className="h-4 w-4" /> New expense</Button>
        </ExpenseDialog>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, category, or notes..." className="pl-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="sm:w-52"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="amount-desc">Amount: high to low</SelectItem>
              <SelectItem value="amount-asc">Amount: low to high</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted grid place-items-center">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">No expenses found</h3>
            <p className="text-sm text-muted-foreground">Try clearing filters or add your first expense.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden md:grid grid-cols-[1fr_140px_140px_140px_60px] gap-4 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted/30">
              <div>Description</div>
              <div>Category</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
              <div />
            </div>
            {filtered.map((e) => (
              <div key={e.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_140px_60px] gap-2 md:gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.paymentMethod}{e.notes ? ` · ${e.notes}` : ""}</div>
                </div>
                <div className="md:block"><Badge variant="secondary">{e.category}</Badge></div>
                <div className="text-sm text-muted-foreground">{formatDate(e.date)}</div>
                <div className="text-right font-semibold">{formatCurrency(e.amount, currency)}</div>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(e)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(e)}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => remove(e.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ExpenseDialog expense={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
      )}
    </div>
  );
}
