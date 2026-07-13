import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive";
  trend?: number; // percentage
  currency?: string;
  hint?: string;
}

const accentMap = {
  primary: "from-primary/10 to-primary/0 text-primary",
  success: "from-success/15 to-success/0 text-success",
  warning: "from-warning/15 to-warning/0 text-warning",
  destructive: "from-destructive/15 to-destructive/0 text-destructive",
};

export function StatCard({ label, value, icon, accent = "primary", trend, currency, hint }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-5 shadow-soft transition-all hover:shadow-elegant">
      <div className={cn("absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-70", accentMap[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(value, currency)}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          {typeof trend === "number" && (
            <div className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={cn(
          "grid h-10 w-10 place-items-center rounded-xl bg-background/80 backdrop-blur",
          accentMap[accent].split(" ").pop(),
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
