import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import type { Expense } from "@/lib/types";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
import { saveExpense, getCustomCategories } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(100),
  amount: z.number().positive("Amount must be > 0"),
  category: z.string().min(1),
  date: z.string().min(1),
  paymentMethod: z.string().min(1),
  notes: z.string().max(500).optional(),
});

interface Props {
  children?: ReactNode;
  expense?: Expense;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function ExpenseDialog({ children, expense, open: controlledOpen, onOpenChange }: Props) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: PAYMENT_METHODS[0],
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (expense) {
        setForm({
          title: expense.title,
          amount: String(expense.amount),
          category: expense.category,
          date: expense.date.slice(0, 10),
          paymentMethod: expense.paymentMethod,
          notes: expense.notes ?? "",
        });
      } else {
        setForm({
          title: "",
          amount: "",
          category: EXPENSE_CATEGORIES[0],
          date: new Date().toISOString().slice(0, 10),
          paymentMethod: PAYMENT_METHODS[0],
          notes: "",
        });
      }
    }
  }, [open, expense]);

  const categories = user ? [...EXPENSE_CATEGORIES, ...getCustomCategories(user.id)] : EXPENSE_CATEGORIES;

  const submit = () => {
    if (!user) return;
    const parsed = schema.safeParse({
      title: form.title,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const now = new Date().toISOString();
    saveExpense(user.id, {
      id: expense?.id ?? crypto.randomUUID(),
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: new Date(parsed.data.date).toISOString(),
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes,
      createdAt: expense?.createdAt ?? now,
    });
    toast.success(expense ? "Expense updated" : "Expense added");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "New expense"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Groceries at Whole Foods" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{expense ? "Save changes" : "Add expense"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
