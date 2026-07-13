import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSnapshot, getIncome, deleteIncome, getSettings } from "@/lib/store";
import { INCOME_CATEGORIES } from "@/lib/types";
import type { Income } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IncomeDialog } from "@/components/income-dialog";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/income")({
  component: IncomePage,
  head: () => ({ meta: [{ title: "Income — Finlytic" }] }),
});

function IncomePage() {
  const { user } = useAuth();
  const uid = user!.id;
  const income = useStoreSnapshot(() => getIncome(uid));
  const settings = useStoreSnapshot(() => getSettings(uid));
  const currency = settings.currency;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Income | null>(null);

  const filtered = useMemo(() => {
    let list = [...income];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.source.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    if (category !== "all") list = list.filter((e) => e.category === category);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [income, search, category]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Income</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} entries · Total {formatCurrency(total, currency)}</p>
        </div>
        <IncomeDialog>
          <Button className="shrink-0 gap-2"><Plus className="h-4 w-4" /> New income</Button>
        </IncomeDialog>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search source or category..." className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-success/15 grid place-items-center">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <h3 className="mt-4 font-semibold">No income yet</h3>
            <p className="text-sm text-muted-foreground">Add your first income entry to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((i) => (
              <div key={i.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{i.source}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(i.date)} {i.notes ? `· ${i.notes}` : ""}</div>
                </div>
                <Badge variant="secondary" className="shrink-0">{i.category}</Badge>
                <div className="w-28 text-right font-semibold text-success shrink-0">+{formatCurrency(i.amount, currency)}</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(i)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { deleteIncome(uid, i.id); toast.success("Income deleted"); }} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && <IncomeDialog income={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />}
    </div>
  );
}
