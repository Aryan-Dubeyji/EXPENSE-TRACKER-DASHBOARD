import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, TrendingUp, ShieldCheck, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, login, register, hydrated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });

  if (hydrated && user) return <Navigate to="/" />;

  const doLogin = async () => {
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };
  const doRegister = async () => {
    if (regForm.password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await register(regForm.name, regForm.email, regForm.password);
      toast.success("Account created — enjoy Finlytic!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Marketing side */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-hero p-12 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 -left-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-chart-2/40 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-accent shadow-glow">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="text-lg font-semibold tracking-tight">Finlytic</div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Your money,<br /> beautifully organized.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Track every expense, monitor income, set budgets, and visualize your financial health — all in one polished dashboard.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 max-w-md">
            {[
              { icon: TrendingUp, label: "Smart insights" },
              { icon: PieChart, label: "Rich analytics" },
              { icon: ShieldCheck, label: "Private by design" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <Icon className="h-4 w-4 text-accent" />
                <div className="mt-2 text-xs font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} Finlytic. Crafted for clarity.</div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-accent">
              <Wallet className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="text-lg font-semibold">Finlytic</div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create an account to get started.</p>

          <Tabs defaultValue="login" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 space-y-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              </div>
              <Button className="w-full" onClick={doLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo: register a new account — data stays in your browser.
              </p>
            </TabsContent>

            <TabsContent value="register" className="mt-6 space-y-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="Alex Morgan" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} placeholder="At least 6 characters" />
              </div>
              <Button className="w-full" onClick={doRegister} disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
