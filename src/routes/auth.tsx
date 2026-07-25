import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/data-provider";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Unio Invoice" },
      { name: "description", content: "Sign in to your Unio Invoice account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState("");


  useEffect(() => {
    if (!auth.loading && auth.user) {
      navigate({ to: "/dashboard" });
    }
  }, [auth.loading, auth.user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail) { setForgotError("Please enter your email address."); return; }
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) {
      if (/not found|no user|invalid/i.test(error.message)) {
        setForgotError("No account found with this email address.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }
    setForgotOpen(false);
    toast.success("Reset link sent! Check your email inbox.");
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-semibold text-white">U</div>
          <h1 className="text-xl font-semibold">Unio Invoice</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-3">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotError(""); setForgotOpen(true); }}
                  className="text-sm text-[var(--brand)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">{busy ? "Signing in…" : "Sign in"}</Button>
            </form>

          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-3">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
              <Button type="submit" disabled={busy} className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">{busy ? "Creating…" : "Create account"}</Button>
              <p className="text-center text-xs text-muted-foreground">Your data is stored securely in Lovable Cloud.</p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>Enter your email and we'll send you a reset link.</DialogDescription>
          </DialogHeader>
          <form onSubmit={sendReset} className="space-y-3">
            <div>
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                autoComplete="email"
              />
              {forgotError && <p className="mt-1 text-sm text-[var(--danger)]">{forgotError}</p>}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" disabled={forgotBusy} className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
                {forgotBusy ? "Sending…" : "Send Reset Link"}
              </Button>
              <button type="button" onClick={() => setForgotOpen(false)} className="text-center text-sm text-muted-foreground hover:underline">
                Cancel
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>

  );
}
