import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ALERT_TYPES = new Set(["mention", "note_reply"]);

/**
 * Alerts the signed-in member as soon as someone mentions them (or answers their note):
 * a toast that stays until it is closed, plus a system notification when the app tab is in the background.
 */
export function MentionAlertsWatcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Ask once for system notifications, on the member's first click (browsers require a gesture).
  useEffect(() => {
    if (!user || typeof Notification === "undefined" || Notification.permission !== "default") return;
    const ask = () => { Notification.requestPermission().catch(() => {}); };
    window.addEventListener("click", ask, { once: true });
    return () => window.removeEventListener("click", ask);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`mention-alerts-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { id: string; title: string; message: string | null; type: string; link: string | null };
          if (!ALERT_TYPES.has(n.type)) return;
          qc.invalidateQueries({ queryKey: ["team-comments"] });

          const open = async () => {
            await supabase.from("notifications").update({ read: true }).eq("id", n.id);
            qc.invalidateQueries({ queryKey: ["notifications"] });
            navigate(n.link || "/commentaires-equipe");
          };

          toast(n.title, {
            id: `mention-${n.id}`,
            description: n.message || undefined,
            duration: Infinity,
            closeButton: true,
            action: { label: "Voir", onClick: () => { void open(); } },
          });

          if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const sys = new Notification(n.title, { body: n.message || "", tag: n.id, icon: "/favicon.ico" });
              sys.onclick = () => { window.focus(); void open(); sys.close(); };
            } catch { /* system notifications unavailable */ }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, navigate, qc]);

  return null;
}
