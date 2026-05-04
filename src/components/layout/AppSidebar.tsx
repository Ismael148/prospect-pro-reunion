import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Search,
  FolderKanban,
  Settings,
  LogOut,
  UserCircle,
  Briefcase,
  Monitor,
  Coins,
  Calculator,
  LifeBuoy,
  FileText,
  Mail,
  CreditCard,
  Globe,
  Trash2,
  Share2,
  Inbox,
  CalendarDays,
} from "lucide-react";
import logo from "@/assets/logo.webp";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";

const ROLE_ACCESS: Record<string, string[]> = {
  admin: ["/", "/clients", "/prospection", "/pipeline", "/projets", "/webmaster", "/commissions", "/comptabilite", "/facturation", "/renouvellements-ndd", "/support", "/campagnes", "/emails", "/paiements", "/equipe", "/parametres", "/cartes-nfc", "/corbeille", "/acces-partenaire", "/gmb", "/onboarding-fb", "/calendrier"],
  agent_master: ["/", "/agent-master", "/prospection", "/clients", "/pipeline", "/projets", "/commissions", "/support", "/cartes-nfc", "/acces-partenaire", "/gmb", "/onboarding-fb", "/calendrier"],
  agent_telephonique: ["/", "/prospection", "/clients", "/pipeline", "/projets", "/commissions", "/support", "/cartes-nfc", "/onboarding-fb", "/calendrier"],
  agent_support: ["/", "/clients", "/support", "/projets", "/cartes-nfc", "/onboarding-fb", "/calendrier"],
  commercial_terrain: ["/", "/projets", "/commissions", "/calendrier"],
  webmaster: ["/", "/clients", "/projets", "/webmaster", "/support", "/acces-partenaire", "/gmb", "/calendrier"],
  designer: ["/", "/projets", "/webmaster", "/support", "/calendrier"],
};

const allMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Agent Master", icon: Users, path: "/agent-master" },
  { title: "Clients 2.0", icon: Users, path: "/clients" },
  { title: "Clients 1.0", icon: CreditCard, path: "/cartes-nfc" },
  { title: "Prospection", icon: Search, path: "/prospection" },
  { title: "Pipeline", icon: FolderKanban, path: "/pipeline" },
  { title: "Projets", icon: Briefcase, path: "/projets" },
  { title: "Calendrier", icon: CalendarDays, path: "/calendrier" },
  { title: "Commissions", icon: Coins, path: "/commissions" },
  { title: "Comptabilité", icon: Calculator, path: "/comptabilite" },
  { title: "Facturation", icon: FileText, path: "/facturation" },
  { title: "Renouv. NDD", icon: Globe, path: "/renouvellements-ndd" },
  { title: "Support", icon: LifeBuoy, path: "/support" },
  { title: "Webmaster", icon: Monitor, path: "/webmaster" },
  { title: "Accès Partenaire", icon: Share2, path: "/acces-partenaire" },
  { title: "Gestion GMB", icon: Globe, path: "/gmb" },
  { title: "Onboarding clients", icon: Inbox, path: "/onboarding-fb" },
  { title: "Campagnes", icon: Mail, path: "/campagnes" },
  { title: "Notifications · Emails", icon: Inbox, path: "/emails" },
  { title: "Moyens de paiement", icon: CreditCard, path: "/paiements" },
];

const adminItems = [
  { title: "Équipe", icon: UserCircle, path: "/equipe" },
  { title: "Corbeille", icon: Trash2, path: "/corbeille" },
  { title: "Paramètres", icon: Settings, path: "/parametres" },
];

export function AppSidebar() {
  const { profile, roles, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const roleLabel = roles.includes("admin")
    ? "Admin"
    : roles.includes("agent_master")
    ? "Agent Master"
    : roles.includes("agent_support")
    ? "Agent Support"
    : roles.includes("webmaster")
    ? "Webmaster"
    : roles.includes("designer")
    ? "Designer"
    : roles.includes("commercial_terrain")
    ? "Commercial"
    : roles.includes("agent_telephonique")
    ? "Agent tél."
    : "Utilisateur";

  const accessiblePaths = useMemo(() => {
    if (hasRole("admin")) return new Set(ROLE_ACCESS.admin);
    const paths = new Set<string>(["/"]);
    roles.forEach((role) => {
      ROLE_ACCESS[role]?.forEach((p) => paths.add(p));
    });
    paths.add("/parametres");
    return paths;
  }, [roles, hasRole]);

  const menuItems = allMenuItems.filter((item) => accessiblePaths.has(item.path));

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarHeader className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <img src={logo} alt="Adamkom" className="w-6 h-6 object-contain brightness-0 invert" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-tight font-[Space_Grotesk]">Adamkom</h2>
            <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">CRM Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-5 font-semibold">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    className="transition-all duration-150 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[13px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole("admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-5 font-semibold">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      className="transition-all duration-150 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-[13px]">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30">
          <Avatar className="w-8 h-8">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">{profile?.full_name || "Utilisateur"}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{roleLabel}</p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
