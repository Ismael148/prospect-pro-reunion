import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  // Double-vérification avant toute redirection : évite les fausses
  // déconnexions pendant un rafraîchissement de token.
  const [recheck, setRecheck] = useState<"idle" | "checking" | "none">("idle");

  useEffect(() => {
    let cancelled = false;
    if (!loading && !session) {
      setRecheck("checking");
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setRecheck(data.session ? "idle" : "none");
      });
    } else if (session) {
      setRecheck("idle");
    }
    return () => {
      cancelled = true;
    };
  }, [loading, session]);

  if (loading || (!session && recheck !== "none")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
