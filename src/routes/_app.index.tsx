import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useStoreSnapshot, getExpenses, getIncome, getBudgets, getSettings } from "@/lib/store";
import { formatCurrency, formatDate, monthKey } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { ExpenseDialog } from "@/components/expense-dialog";
import { IncomeDialog } from "@/components/income-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingDown, TrendingUp, PiggyBank, Plus, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Finlytic" }] }),
});

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.7 0.13 300)"];

function Dashboard() {
  const { user } = useAuth();
  const uid = user!.id;

  const expenses = useStoreSnapshot(() => getExpenses(uid));
  const income = useStoreSnapshot(() => getIncome(uid));
  const budgets = useStoreSnapshot(() => getBudgets(uid));
  const settings = useStoreSnapshot(() => getSettings(uid));
  const currency = settings.currency;

  const thisMonth = monthKey(new Date().toISOString());
  const thisMonthExpenses = expenses.filter((e) => monthKey(e.date) === thisMonth);
  const thisMonthIncome = income.filter((e) => monthKey(e.date) === thisMonth);

  const totalIncome = thisMonthIncome.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = thisMonthExpenses.reduce((s, x) => s + x.amount, 0);
  const savings = totalIncome - totalExpenses;
  const balance = income.reduce((s, x) => s + x.amount, 0) - expenses.reduce((s, x) => s + x.amount, 0);
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // 6-month trend
  const trend: { month: string; income: number; expense: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      income: income.filter((x) => monthKey(x.date) === key).reduce((s, x) => s + x.amount, 0),
      expense: expenses.filter((x) => monthKey(x.date) === key).reduce((s, x) => s + x.amount, 0),
    });
  }

  // Category breakdown (this month)
  const byCat = new Map<string, number>();
  thisMonthExpenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
  const pieData = Array.from(byCat.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Recent transactions
  const recent = [
    ...expenses.slice(0, 8).map((e) => ({ type: "expense" as const, id: e.id, title: e.title, amount: -e.amount, category: e.category, date: e.date })),
    ...income.slice(0, 8).map((i) => ({ type: "income" as const, id: i.id, title: i.source, amount: i.amount, category: i.category, date: i.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  const budgetUse = budgets.map((b) => {
    const spent = thisMonthExpenses.filter((e) => e.category === b.category).reduce((s, x) => s + x.amount, 0);
    return { ...b, spent, pct: b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0 };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="mt-1 truncate text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user!.name.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <IncomeDialog>
            <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Income</Button>
          </IncomeDialog>
          <ExpenseDialog>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Expense</Button>
          </ExpenseDialog>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Balance" value={balance} icon={<Wallet className="h-5 w-5" />} accent="primary" hint="Lifetime net" currency={currency} />
        <StatCard label="Income (month)" value={totalIncome} icon={<TrendingUp className="h-5 w-5" />} accent="success" currency={currency} />
        <StatCard label="Expenses (month)" value={totalExpenses} icon={<TrendingDown className="h-5 w-5" />} accent="destructive" currency={currency} />
        <StatCard label="Savings Rate" value={savings} icon={<PiggyBank className="h-5 w-5" />} accent="warning" hint={`${savingsRate.toFixed(1)}% of income saved`} currency={currency} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Cash flow</h3>
              <p className="text-xs text-muted-foreground">Income vs expenses over the last 6 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Income</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Expenses</span>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Area type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2.5} fill="url(#gInc)" />
                <Area type="monotone" dataKey="expense" stroke="var(--destructive)" strokeWidth={2.5} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-semibold">Where money goes</h3>
          <p className="text-xs text-muted-foreground">This month by category</p>
          <div className="mt-4 h-56">
            {pieData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No expenses yet</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 space-y-1.5 max-h-32 overflow-auto">
            {pieData.slice(0, 5).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {p.name}
                </span>
                <span className="font-medium">{formatCurrency(p.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent + Budgets */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between p-6 pb-3">
            <h3 className="font-semibold">Recent transactions</h3>
            <Link to="/expenses" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recent.length === 0 && <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>}
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.category} · {formatDate(t.date)}</div>
                </div>
                <div className={`shrink-0 text-sm font-semibold ${t.amount >= 0 ? "text-success" : "text-foreground"}`}>
                  {t.amount >= 0 ? "+" : ""}{formatCurrency(t.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Budgets</h3>
            <Link to="/budgets" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">Manage <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-4 space-y-4">
            {budgetUse.length === 0 && <div className="text-sm text-muted-foreground">No budgets set.</div>}
            {budgetUse.slice(0, 5).map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{b.category}</span>
                  <span className="text-muted-foreground">{formatCurrency(b.spent, currency)} / {formatCurrency(b.monthlyLimit, currency)}</span>
                </div>
                <Progress value={Math.min(b.pct, 100)} className="mt-2 h-2" />
                {b.pct >= 100 && <Badge variant="destructive" className="mt-1 text-[10px]">Over budget</Badge>}
                {b.pct >= 80 && b.pct < 100 && <Badge className="mt-1 text-[10px] bg-warning text-warning-foreground">Warning</Badge>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
