import { useState, useMemo } from "react";
import {
  Bell, CheckCheck, UserPlus, ArrowRightLeft, LifeBuoy, FileText,
  Calendar, AlertTriangle, Info, MessageCircle, ExternalLink, CheckCircle,
  Inbox, AtSign, FilePlus2, Filter,
} from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Category = "all" | "urgent" | "support" | "team" | "client" | "system";

interface TypeMeta {
  icon: React.ReactNode;
  bg: string;
  border: string;
  label: string;
  labelColor: string;
  category: Exclude<Category, "all">;
}

const typeConfig: Record<string, TypeMeta> = {
  // URGENT
  deadline: {
    icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
    bg: "bg-destructive/10",
    border: "border-l-destructive",
    label: "⚠️ Deadline",
    labelColor: "bg-destructive/15 text-destructive",
    category: "urgent",
  },
  // SUPPORT
  support: {
    icon: <LifeBuoy className="w-5 h-5 text-rose-600" />,
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-l-rose-500",
    label: "🆘 Support",
    labelColor: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    category: "support",
  },
  discord_reply: {
    icon: <MessageCircle className="w-5 h-5 text-indigo-600" />,
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-l-indigo-500",
    label: "💬 Discord",
    labelColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    category: "support",
  },
  // TEAM
  assignment: {
    icon: <UserPlus className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-l-blue-500",
    label: "Assignation",
    labelColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    category: "team",
  },
  module_complete: {
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-l-green-500",
    label: "Module terminé",
    labelColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    category: "team",
  },
  module_note: {
    icon: <MessageCircle className="w-4 h-4 text-cyan-600" />,
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-l-cyan-500",
    label: "Note module",
    labelColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    category: "team",
  },
  mention: {
    icon: <AtSign className="w-4 h-4 text-fuchsia-600" />,
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    border: "border-l-fuchsia-500",
    label: "Mention",
    labelColor: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
    category: "team",
  },
  note_reply: {
    icon: <MessageCircle className="w-4 h-4 text-cyan-600" />,
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-l-cyan-500",
    label: "Réponse",
    labelColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    category: "team",
  },
  note_seen: {
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-l-emerald-500",
    label: "Note vue",
    labelColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    category: "team",
  },
  // CLIENT
  status_change: {
    icon: <ArrowRightLeft className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-l-amber-500",
    label: "Statut",
    labelColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    category: "client",
  },
  rdv_planifie: {
    icon: <Calendar className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-l-purple-500",
    label: "RDV",
    labelColor: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    category: "client",
  },
  form_submission: {
    icon: <FilePlus2 className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-l-emerald-500",
    label: "Formulaire",
    labelColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    category: "client",
  },
  note: {
    icon: <FileText className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-l-amber-500",
    label: "Note client",
    labelColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    category: "client",
  },
  social_deliverable: {
    icon: <FileText className="w-4 h-4 text-pink-600" />,
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-l-pink-500",
    label: "Livrable RS",
    labelColor: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    category: "client",
  },
};

const defaultConfig: TypeMeta = {
  icon: <Info className="w-4 h-4 text-muted-foreground" />,
  bg: "bg-muted/30",
  border: "border-l-muted-foreground/30",
  label: "Info",
  labelColor: "bg-muted text-muted-foreground",
  category: "system",
};

const URGENT_TYPES = new Set(["deadline", "support", "discord_reply"]);

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "Tout", icon: <Inbox className="w-3.5 h-3.5" /> },
  { id: "urgent", label: "Urgent", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: "support", label: "Support", icon: <LifeBuoy className="w-3.5 h-3.5" /> },
  { id: "team", label: "Équipe", icon: <UserPlus className="w-3.5 h-3.5" /> },
  { id: "client", label: "Client", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "system", label: "Système", icon: <Info className="w-3.5 h-3.5" /> },
];

function getCategory(type: string): Exclude<Category, "all"> {
  if (URGENT_TYPES.has(type)) {
    if (type === "deadline") return "urgent";
    return "support";
  }
  return typeConfig[type]?.category ?? "system";
}

export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();
  const [active, setActive] = useState<Category>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const handleClick = (n: { id: string; read: boolean; link: string | null }) => {
    if (!n.read) markAsRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  // Group by category and compute unread counts
  const { groups, categoryCounts } = useMemo(() => {
    const list = notifications || [];
    const counts: Record<Category, { total: number; unread: number }> = {
      all: { total: list.length, unread: 0 },
      urgent: { total: 0, unread: 0 },
      support: { total: 0, unread: 0 },
      team: { total: 0, unread: 0 },
      client: { total: 0, unread: 0 },
      system: { total: 0, unread: 0 },
    };
    const grouped: Record<Exclude<Category, "all">, typeof list> = {
      urgent: [], support: [], team: [], client: [], system: [],
    };
    for (const n of list) {
      const cat = getCategory(n.type);
      grouped[cat].push(n);
      counts[cat].total += 1;
      if (!n.read) counts[cat].unread += 1;
      if (!n.read) counts.all.unread += 1;
    }
    return { groups: grouped, categoryCounts: counts };
  }, [notifications]);

  const visibleList = useMemo(() => {
    const base = active === "all" ? notifications || [] : groups[active] || [];
    return showUnreadOnly ? base.filter((n) => !n.read) : base;
  }, [active, groups, notifications, showUnreadOnly]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" align="end">
        {/* Header */}
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`text-[11px] h-7 gap-1 ${showUnreadOnly ? "bg-primary/10 text-primary" : ""}`}
              onClick={() => setShowUnreadOnly((v) => !v)}
              title="Afficher seulement les non-lues"
            >
              <Filter className="w-3 h-3" />
              {showUnreadOnly ? "Non lues" : "Toutes"}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </Button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <Tabs value={active} onValueChange={(v) => setActive(v as Category)}>
          <div className="px-2 pt-2 border-b bg-background sticky top-0 z-10">
            <TabsList className="w-full h-auto p-1 bg-muted/40 grid grid-cols-6 gap-0.5">
              {CATEGORIES.map((c) => {
                const counts = categoryCounts[c.id];
                const unread = counts.unread;
                const isUrgent = c.id === "urgent" && unread > 0;
                return (
                  <TabsTrigger
                    key={c.id}
                    value={c.id}
                    className={`flex flex-col items-center gap-0.5 h-auto py-1.5 px-1 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm relative ${
                      isUrgent ? "ring-1 ring-destructive/30" : ""
                    }`}
                  >
                    <span className={`${isUrgent ? "text-destructive" : ""}`}>{c.icon}</span>
                    <span className="font-medium leading-none">{c.label}</span>
                    {unread > 0 && (
                      <span
                        className={`absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-1 rounded-full text-[8px] font-bold flex items-center justify-center ${
                          isUrgent
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value={active} className="m-0">
            <ScrollArea className="h-[440px]">
              {!visibleList.length ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <Bell className="w-8 h-8 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    {showUnreadOnly ? "Aucune notification non lue" : "Aucune notification dans cette catégorie"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {visibleList.map((n) => {
                    const config = typeConfig[n.type] || defaultConfig;
                    const highPriority = URGENT_TYPES.has(n.type);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-all flex gap-3 border-l-[4px] group ${config.border} ${
                          !n.read ? config.bg : "border-l-transparent"
                        } ${highPriority && !n.read ? "ring-1 ring-inset ring-destructive/20" : ""}`}
                      >
                        <div className={`mt-0.5 shrink-0 p-2 rounded-xl ${!n.read ? config.bg : "bg-muted/50"}`}>
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
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 animate-pulse ${highPriority ? "bg-destructive" : "bg-primary"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
