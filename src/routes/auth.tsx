import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/site/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Sign Up — AVENUE NEST CLOTHING" },
      {
        name: "description",
        content:
          "Sign in to track your AVENUE NEST CLOTHING orders, or keep shopping as a guest — an account is always optional.",
      },
      { property: "og:title", content: "Login or Sign Up — AVENUE NEST CLOTHING" },
      { property: "og:description", content: "Track your orders. An account is always optional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/orders", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? "") },
          },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate({ to: "/orders", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-md px-5 py-20 md:px-8">
        <h1 className="text-4xl">{mode === "login" ? "Log in" : "Create account"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          An account is optional — you can always check out as a guest.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {mode === "signup" && (
            <>
              <label className="block">
                <span className="eyebrow">Full name</span>
                <input
                  name="name"
                  required
                  className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
                />
              </label>
              <label className="block">
                <span className="eyebrow">Phone</span>
                <input
                  name="phone"
                  className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="eyebrow">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>

        <div className="mt-10 border-t border-border pt-6">
          <Link to="/shop" className="text-xs font-bold uppercase tracking-[0.16em]">
            Continue as guest
          </Link>
        </div>
      </div>
    </Layout>
  );
}
