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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Clients", icon: Users, path: "/clients" },
  { title: "Prospection", icon: Search, path: "/prospection" },
  { title: "Pipeline", icon: FolderKanban, path: "/pipeline" },
  { title: "Projets", icon: Briefcase, path: "/projets" },
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
    : roles.includes("commercial_terrain")
    ? "Commercial"
    : roles.includes("agent_telephonique")
    ? "Agent tél."
    : "Utilisateur";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Adamkom" className="w-9 h-9 object-contain" />
          <div>
            <h2 className="font-semibold text-sm tracking-tight font-[Space_Grotesk]">Adamkom</h2>
            <p className="text-xs text-sidebar-foreground/60">Gestion & CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
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
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
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
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "Utilisateur"}</p>
            <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4 text-sidebar-foreground/60" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
