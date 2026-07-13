import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  useStoreSnapshot, getSettings, saveSettings, updateProfile, changePassword,
  exportData, importData,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Upload, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Finlytic" }] }),
});

function SettingsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const settings = useStoreSnapshot(() => getSettings(uid));
  const [profile, setProfile] = useState({ name: user!.name, email: user!.email });
  const [pw, setPw] = useState({ current: "", next: "" });

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const doExport = (fmt: "json" | "csv") => {
    const data = exportData(uid);
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      trigger(blob, `finlytic-${Date.now()}.json`);
    } else {
      const rows = [
        ["type", "title", "amount", "category", "date", "paymentMethod", "notes"],
        ...data.expenses.map((e) => ["expense", e.title, e.amount, e.category, e.date, e.paymentMethod, e.notes ?? ""]),
        ...data.income.map((i) => ["income", i.source, i.amount, i.category, i.date, "", i.notes ?? ""]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      trigger(new Blob([csv], { type: "text/csv" }), `finlytic-${Date.now()}.csv`);
    }
    toast.success("Data exported");
  };

  const trigger = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        importData(uid, data);
        toast.success("Data imported");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, appearance, and data.</p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-semibold">Profile</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={() => { updateProfile(uid, profile); toast.success("Profile updated"); }}>Save profile</Button>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-semibold">Appearance</h3>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <div>
              <div className="text-sm font-medium">Dark mode</div>
              <div className="text-xs text-muted-foreground">Toggle a darker interface.</div>
            </div>
          </div>
          <Switch checked={settings.theme === "dark"} onCheckedChange={(v) => saveSettings(uid, { ...settings, theme: v ? "dark" : "light" })} />
        </div>
        <div className="mt-6 grid gap-2 sm:max-w-xs">
          <Label>Currency symbol</Label>
          <Select value={settings.currency} onValueChange={(v) => saveSettings(uid, { ...settings, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["$", "€", "£", "¥", "₹", "₩", "A$", "C$"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-semibold">Change password</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Current password</Label>
            <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>New password</Label>
            <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={async () => {
          if (pw.next.length < 6) return toast.error("New password must be at least 6 characters");
          try {
            await changePassword(uid, pw.current, pw.next);
            toast.success("Password changed");
            setPw({ current: "", next: "" });
          } catch (e: any) { toast.error(e.message); }
        }}>Update password</Button>
      </div>

      {/* Data */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-semibold">Data</h3>
        <p className="text-sm text-muted-foreground mt-1">Export a backup or import previously exported data.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => doExport("json")} className="gap-2"><Download className="h-4 w-4" /> Export JSON</Button>
          <Button variant="outline" onClick={() => doExport("csv")} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          <label className="inline-flex">
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            <Button variant="outline" asChild className="gap-2"><span><Upload className="h-4 w-4" /> Import JSON</span></Button>
          </label>
        </div>
      </div>
    </div>
  );
}
