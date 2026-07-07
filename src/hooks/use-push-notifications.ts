import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { onForegroundMessage, requestFcmToken } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [enabling, setEnabling] = useState(false);

  const enable = useCallback(async () => {
    if (!user) return;
    setEnabling(true);
    try {
      const token = await requestFcmToken();
      if (!token) {
        toast({ title: "Notifications non activées", description: "Autorisation refusée ou navigateur non compatible.", variant: "destructive" });
        return;
      }
      await supabase.from("push_tokens").upsert(
        { user_id: user.id, token, user_agent: navigator.userAgent, last_used_at: new Date().toISOString() },
        { onConflict: "token" }
      );
      setPermission("granted");
      toast({ title: "Notifications activées ✅", description: "Tu recevras une notif push sur cet appareil." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erreur", description: e.message || String(e), variant: "destructive" });
    } finally {
      setEnabling(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || permission !== "granted") return;
    let unsub: any;
    onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "Adamkom";
      const body = payload.notification?.body || payload.data?.message || "";
      toast({ title, description: body });
    }).then((u) => (unsub = u));
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [user, permission]);

  return { permission, enable, enabling };
}
