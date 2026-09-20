import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useIsAdmin } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const { count } = useCart();
  const { user, isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <button
          className="md:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link to="/" className="font-display text-lg font-extrabold uppercase tracking-[-0.04em]">
          Modish<span className="text-muted-foreground"> Clothing</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <a
              href="/admin"
              className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </a>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden items-center gap-4 sm:flex">
              <Link
                to="/orders"
                className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                My Orders
              </Link>
              <button
                onClick={signOut}
                className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/auth" aria-label="Sign in" className="hidden sm:block">
              <User className="size-5" />
            </Link>
          )}
          <Link to="/cart" className="relative" aria-label="Cart">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-bold uppercase tracking-[0.18em]"
              >
                {n.label}
              </Link>
            ))}
            {isAdmin && (
              <a
                href="/admin"
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-bold uppercase tracking-[0.18em]"
              >
                Admin
              </a>
            )}
            {user ? (
              <>
                <Link
                  to="/orders"
                  onClick={() => setOpen(false)}
                  className="py-3 text-sm font-bold uppercase tracking-[0.18em]"
                >
                  My Orders
                </Link>
                <button
                  onClick={signOut}
                  className="py-3 text-left text-sm font-bold uppercase tracking-[0.18em]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-bold uppercase tracking-[0.18em]"
              >
                Login / Signup
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
