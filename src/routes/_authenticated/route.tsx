import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { verifyAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedOutlet,
});

function AuthenticatedOutlet() {
  const location = useLocation();
  const checkAdmin = useServerFn(verifyAdmin);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/admin") {
      setAllowed(false);
      setChecking(false);
      return;
    }
    let active = true;
    setChecking(true);
    checkAdmin().then(() => {
      if (active) setAllowed(true);
    }).catch(() => {
      if (active) setAllowed(false);
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [location.pathname, checkAdmin]);

  if (location.pathname === "/admin" && !allowed) {
    return <main className="grid min-h-screen place-items-center px-6"><p className="text-sm text-muted-foreground">{checking ? "Checking administrator access…" : "This area is only available to an approved store administrator."}</p></main>;
  }
  return <Outlet />;
}
