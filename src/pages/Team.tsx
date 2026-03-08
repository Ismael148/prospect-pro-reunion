import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Phone, MapPin, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface TeamMember {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  roles: AppRole[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  agent_telephonique: "Agent téléphonique",
  commercial_terrain: "Commercial terrain",
};

const ROLE_ICONS: Record<AppRole, typeof Shield> = {
  admin: Shield,
  agent_telephonique: Phone,
  commercial_terrain: MapPin,
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  agent_telephonique: "bg-accent/10 text-accent-foreground border-accent/20",
  commercial_terrain: "bg-warning/10 text-warning-foreground border-warning/20",
};

export default function Team() {
  const { hasRole, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "agent_telephonique" as AppRole });
  const isAdmin = hasRole("admin");

  const fetchMembers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: allRoles } = await supabase.from("user_roles").select("*");

    if (profiles && allRoles) {
      const mapped: TeamMember[] = profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        avatar_url: p.avatar_url,
        roles: allRoles.filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
      setMembers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: inviteForm,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${inviteForm.full_name} a été invité avec succès`);
      setInviteOpen(false);
      setInviteForm({ email: "", full_name: "", role: "agent_telephonique" });
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'invitation");
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // Remove existing roles then add new one
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (deleteError) {
      toast.error("Erreur lors de la mise à jour du rôle");
      return;
    }
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });
    if (insertError) {
      toast.error("Erreur lors de la mise à jour du rôle");
      return;
    }
    toast.success("Rôle mis à jour");
    fetchMembers();
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Équipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les membres de votre équipe et leurs rôles
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un nouveau membre</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input
                  placeholder="Jean Dupont"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="jean@exemple.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="agent_telephonique">Agent téléphonique</SelectItem>
                    <SelectItem value="commercial_terrain">Commercial terrain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={inviting}>
                {inviting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Envoyer l'invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">
            Membres ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {member.full_name || "Sans nom"}
                              {isCurrentUser && (
                                <span className="text-muted-foreground ml-1">(vous)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {member.roles.length > 0 ? (
                            member.roles.map((role) => {
                              const Icon = ROLE_ICONS[role];
                              return (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`${ROLE_COLORS[role]} gap-1`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {ROLE_LABELS[role]}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground text-sm">Aucun rôle</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {member.phone || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <Select
                            value={member.roles[0] || ""}
                            onValueChange={(v) => handleRoleChange(member.user_id, v as AppRole)}
                          >
                            <SelectTrigger className="w-[180px] ml-auto">
                              <SelectValue placeholder="Changer le rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="agent_telephonique">Agent téléphonique</SelectItem>
                              <SelectItem value="commercial_terrain">Commercial terrain</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
