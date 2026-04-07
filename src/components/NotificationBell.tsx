import { Bell, CheckCheck, UserPlus, ArrowRightLeft, LifeBuoy, FileText, CreditCard, Globe, Calendar, AlertTriangle, Info, MessageCircle, ExternalLink, CheckCircle } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; label: string; labelColor: string }> = {
  assignment: {
    icon: <UserPlus className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-l-blue-500",
    label: "Assignation",
    labelColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  status_change: {
    icon: <ArrowRightLeft className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-l-amber-500",
    label: "Statut",
    labelColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  support: {
    icon: <LifeBuoy className="w-5 h-5 text-rose-600" />,
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-l-rose-500",
    label: "🆘 Support",
    labelColor: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  },
  discord_reply: {
    icon: <MessageCircle className="w-5 h-5 text-indigo-600" />,
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-l-indigo-500",
    label: "💬 Retour Discord",
    labelColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  },
  form_submission: {
    icon: <FileText className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-l-emerald-500",
    label: "Formulaire",
    labelColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  rdv_planifie: {
    icon: <Calendar className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-l-purple-500",
    label: "RDV",
    labelColor: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  module_complete: {
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-l-green-500",
    label: "Module terminé",
    labelColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  module_note: {
    icon: <MessageCircle className="w-4 h-4 text-cyan-600" />,
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-l-cyan-500",
    label: "Note module",
    labelColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  },
};

const defaultConfig = {
  icon: <Info className="w-4 h-4 text-muted-foreground" />,
  bg: "bg-muted/30",
  border: "border-l-muted-foreground/30",
  label: "Info",
  labelColor: "bg-muted text-muted-foreground",
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

  // Highlight types that need special attention
  const isHighPriority = (type: string) => type === "support" || type === "discord_reply";

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
      <PopoverContent className="w-[420px] p-0" align="end">
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
        <ScrollArea className="h-[450px]">
          {!notifications?.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const config = typeConfig[n.type] || defaultConfig;
                const highPriority = isHighPriority(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-all flex gap-3 border-l-[4px] group ${config.border} ${
                      !n.read ? config.bg : "border-l-transparent"
                    } ${highPriority && !n.read ? "ring-1 ring-inset ring-rose-200 dark:ring-rose-800" : ""}`}
                  >
                    <div className={`mt-0.5 shrink-0 p-2 rounded-xl ${!n.read ? config.bg : "bg-muted/50"} ${highPriority && !n.read ? "shadow-sm" : ""}`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.labelColor}`}>
                          {config.label}
                        </span>
                        {n.link && (
                          <ExternalLink className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 animate-pulse ${highPriority ? "bg-rose-500" : "bg-primary"}`} />
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
