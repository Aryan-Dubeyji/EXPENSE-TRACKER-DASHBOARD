import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import type { Income } from "@/lib/types";
import { INCOME_CATEGORIES } from "@/lib/types";
import { saveIncome } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const schema = z.object({
  source: z.string().trim().min(1).max(100),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().max(500).optional(),
});

interface Props {
  children?: ReactNode;
  income?: Income;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function IncomeDialog({ children, income, open: controlledOpen, onOpenChange }: Props) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [form, setForm] = useState({
    source: "",
    amount: "",
    category: INCOME_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (income) {
        setForm({
          source: income.source,
          amount: String(income.amount),
          category: income.category,
          date: income.date.slice(0, 10),
          notes: income.notes ?? "",
        });
      } else {
        setForm({ source: "", amount: "", category: INCOME_CATEGORIES[0], date: new Date().toISOString().slice(0, 10), notes: "" });
      }
    }
  }, [open, income]);

  const submit = () => {
    if (!user) return;
    const parsed = schema.safeParse({
      source: form.source,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      notes: form.notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    saveIncome(user.id, {
      id: income?.id ?? crypto.randomUUID(),
      source: parsed.data.source,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: new Date(parsed.data.date).toISOString(),
      notes: parsed.data.notes,
      createdAt: income?.createdAt ?? new Date().toISOString(),
    });
    toast.success(income ? "Income updated" : "Income added");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{income ? "Edit income" : "New income"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Source</Label>
            <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Monthly salary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{income ? "Save changes" : "Add income"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
