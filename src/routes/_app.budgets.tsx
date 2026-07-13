import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSnapshot, getBudgets, saveBudget, deleteBudget, getExpenses, getSettings } from "@/lib/store";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { formatCurrency, monthKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/budgets")({
  component: BudgetsPage,
  head: () => ({ meta: [{ title: "Budgets — Finlytic" }] }),
});

function BudgetsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const budgets = useStoreSnapshot(() => getBudgets(uid));
  const expenses = useStoreSnapshot(() => getExpenses(uid));
  const settings = useStoreSnapshot(() => getSettings(uid));
  const currency = settings.currency;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], monthlyLimit: "" });

  const thisMonth = monthKey(new Date().toISOString());
  const withUsage = budgets.map((b) => {
    const spent = expenses.filter((e) => monthKey(e.date) === thisMonth && e.category === b.category).reduce((s, x) => s + x.amount, 0);
    return { ...b, spent, pct: b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0 };
  });

  const totalLimit = withUsage.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = withUsage.reduce((s, b) => s + b.spent, 0);

  const submit = () => {
    const amount = Number(form.monthlyLimit);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (budgets.some((b) => b.category === form.category)) return toast.error("Budget for this category already exists");
    saveBudget(uid, { id: crypto.randomUUID(), category: form.category, monthlyLimit: amount, createdAt: new Date().toISOString() });
    toast.success("Budget created");
    setOpen(false);
    setForm({ category: EXPENSE_CATEGORIES[0], monthlyLimit: "" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set monthly spending limits for each category.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2"><Plus className="h-4 w-4" /> New budget</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create budget</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Monthly limit</Label>
                <Input type="number" step="0.01" value={form.monthlyLimit} onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} placeholder="500.00" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary-foreground/70">Total budget usage</div>
            <div className="mt-2 text-3xl font-bold">{formatCurrency(totalSpent, currency)} <span className="text-lg font-normal text-primary-foreground/70">/ {formatCurrency(totalLimit, currency)}</span></div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <PiggyBank className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-accent transition-all" style={{ width: `${totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0}%` }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {withUsage.length === 0 && (
          <div className="md:col-span-2 rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted grid place-items-center">
              <PiggyBank className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">No budgets yet</h3>
            <p className="text-sm text-muted-foreground">Create a budget to track category spending.</p>
          </div>
        )}
        {withUsage.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{b.category}</div>
                <div className="mt-1 text-2xl font-bold">{formatCurrency(b.spent, currency)}</div>
                <div className="text-xs text-muted-foreground">of {formatCurrency(b.monthlyLimit, currency)} this month</div>
              </div>
              <div className="flex items-center gap-2">
                {b.pct >= 100 ? <Badge variant="destructive">Exceeded</Badge> :
                  b.pct >= 80 ? <Badge className="bg-warning text-warning-foreground">Warning</Badge> :
                  <Badge variant="secondary">On track</Badge>}
                <Button variant="ghost" size="icon" onClick={() => { deleteBudget(uid, b.id); toast.success("Budget removed"); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Progress value={Math.min(b.pct, 100)} className="mt-4 h-2.5" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{b.pct.toFixed(0)}% used</span>
              <span>{formatCurrency(Math.max(b.monthlyLimit - b.spent, 0), currency)} remaining</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
