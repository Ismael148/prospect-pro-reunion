import { Bell, CheckCheck, UserPlus, ArrowRightLeft, LifeBuoy, FileText, CreditCard, Globe, Calendar, AlertTriangle, Info } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
  assignment: {
    icon: <UserPlus className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-l-blue-500",
  },
  status_change: {
    icon: <ArrowRightLeft className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-l-amber-500",
  },
  support: {
    icon: <LifeBuoy className="w-4 h-4 text-rose-600" />,
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-l-rose-500",
  },
  form_submission: {
    icon: <FileText className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-l-emerald-500",
  },
  rdv_planifie: {
    icon: <Calendar className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-l-purple-500",
  },
  discord_reply: {
    icon: <AlertTriangle className="w-4 h-4 text-indigo-600" />,
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-l-indigo-500",
  },
};

const defaultConfig = {
  icon: <Info className="w-4 h-4 text-muted-foreground" />,
  bg: "bg-muted/30",
  border: "border-l-muted-foreground/30",
};

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
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
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
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const config = typeConfig[n.type] || defaultConfig;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 border-l-[3px] ${config.border} ${
                      !n.read ? config.bg : "border-l-transparent"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${!n.read ? config.bg : "bg-muted/50"}`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
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
