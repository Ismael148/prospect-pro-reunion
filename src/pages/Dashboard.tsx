import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, FolderKanban, TrendingUp } from "lucide-react";

const stats = [
  { title: "Clients", value: "0", icon: Users, color: "text-primary" },
  { title: "Prospects", value: "0", icon: Search, color: "text-accent" },
  { title: "Projets actifs", value: "0", icon: FolderKanban, color: "text-warning" },
  { title: "Taux conversion", value: "0%", icon: TrendingUp, color: "text-success" },
];

export default function Dashboard() {
  const { profile, roles } = useAuth();

  const roleLabel = roles.includes("admin")
    ? "Administrateur"
    : roles.includes("commercial_terrain")
    ? "Commercial terrain"
    : roles.includes("agent_telephonique")
    ? "Agent téléphonique"
    : "Utilisateur";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour, {profile?.full_name?.split(" ")[0] || "là"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {roleLabel} — Voici votre tableau de bord
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-md shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Aucune activité pour le moment. Commencez par ajouter des clients ou lancer une prospection.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Tâches à faire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Aucune tâche en attente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
