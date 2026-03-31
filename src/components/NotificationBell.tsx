import { Bell, CheckCheck, UserPlus, ArrowRightLeft, LifeBuoy, FileText, CreditCard, Globe, Calendar } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  assignment: { icon: <UserPlus className="w-4 h-4" />, color: "text-primary bg-primary/10" },
  status_change: { icon: <ArrowRightLeft className="w-4 h-4" />, color: "text-accent-foreground bg-accent/30" },
  support: { icon: <LifeBuoy className="w-4 h-4" />, color: "text-destructive bg-destructive/10" },
  form_submission: { icon: <FileText className="w-4 h-4" />, color: "text-chart-4 bg-chart-4/10" },
  rdv_planifie: { icon: <Calendar className="w-4 h-4" />, color: "text-chart-2 bg-chart-2/10" },
  nfc: { icon: <CreditCard className="w-4 h-4" />, color: "text-chart-3 bg-chart-3/10" },
  site: { icon: <Globe className="w-4 h-4" />, color: "text-chart-1 bg-chart-1/10" },
  discord: { icon: <Bell className="w-4 h-4" />, color: "text-[#5865F2] bg-[#5865F2]/10" },
};

const defaultConfig = { icon: <Bell className="w-4 h-4" />, color: "text-muted-foreground bg-muted" };

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();

  const handleClick = (n: { id: string; read: boolean; link: string | null }) => {
    if (!n.read) markAsRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tout lire
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {!notifications?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune notification
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => {
                const cfg = typeConfig[n.type] || defaultConfig;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors flex gap-3 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : ""}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
