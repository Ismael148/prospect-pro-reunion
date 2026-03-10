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

// Role-based access: which paths each role can see
const ROLE_ACCESS: Record<string, string[]> = {
  admin: ["/", "/clients", "/prospection", "/pipeline", "/projets", "/webmaster", "/commissions", "/equipe", "/parametres"],
  agent_telephonique: ["/", "/prospection", "/clients", "/pipeline", "/projets", "/commissions"],
  commercial_terrain: ["/", "/prospection", "/clients", "/pipeline", "/commissions"],
  webmaster: ["/", "/projets", "/webmaster"],
  designer: ["/", "/projets", "/webmaster"],
};

const allMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Clients", icon: Users, path: "/clients" },
  { title: "Prospection", icon: Search, path: "/prospection" },
  { title: "Pipeline", icon: FolderKanban, path: "/pipeline" },
  { title: "Projets", icon: Briefcase, path: "/projets" },
  { title: "Commissions", icon: Coins, path: "/commissions" },
  { title: "Webmaster", icon: Monitor, path: "/webmaster" },
];

const adminItems = [
  { title: "Équipe", icon: UserCircle, path: "/equipe" },
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
    : roles.includes("webmaster")
    ? "Webmaster"
    : roles.includes("designer")
    ? "Designer"
    : roles.includes("commercial_terrain")
    ? "Commercial"
    : roles.includes("agent_telephonique")
    ? "Agent tél."
    : "Utilisateur";

  // Build accessible paths based on user roles
  const accessiblePaths = useMemo(() => {
    if (hasRole("admin")) return new Set(ROLE_ACCESS.admin);
    const paths = new Set<string>(["/"]); // Dashboard always accessible
    roles.forEach((role) => {
      ROLE_ACCESS[role]?.forEach((p) => paths.add(p));
    });
    // Always allow settings for self
    paths.add("/parametres");
    return paths;
  }, [roles, hasRole]);

  const menuItems = allMenuItems.filter((item) => accessiblePaths.has(item.path));

  return (
    <Sidebar>
      <SidebarHeader className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <img src={logo} alt="Adamkom" className="w-6 h-6 object-contain brightness-0 invert" />
          </div>
          <div>
            <h2 className="font-semibold text-sm tracking-tight font-[Space_Grotesk]">Adamkom</h2>
            <p className="text-[11px] text-sidebar-foreground/50 tracking-wide uppercase">CRM Pro</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-5">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    className="transition-all duration-200"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole("admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-5">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      className="transition-all duration-200"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/50">
          <Avatar className="w-9 h-9">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} /> : null}
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "Utilisateur"}</p>
            <p className="text-[11px] text-sidebar-foreground/50">{roleLabel}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors duration-200"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4 text-sidebar-foreground/50" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
