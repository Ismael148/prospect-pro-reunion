import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PUBLISHED_URL } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Phone, MapPin, Users, Copy, Check, Key, Monitor, Palette, Camera, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  webmaster: "Webmaster",
  designer: "Designer",
};

const ROLE_ICONS: Record<AppRole, typeof Shield> = {
  admin: Shield,
  agent_telephonique: Phone,
  commercial_terrain: MapPin,
  webmaster: Monitor,
  designer: Palette,
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  agent_telephonique: "bg-accent/10 text-accent-foreground border-accent/20",
  commercial_terrain: "bg-warning/10 text-warning-foreground border-warning/20",
  webmaster: "bg-info/10 text-info border-info/20",
  designer: "bg-success/10 text-success border-success/20",
};

interface InviteResult {
  invite_link: string;
  temp_password: string;
  full_name: string;
  email: string;
  role: AppRole;
}

export default function Team() {
  const { hasRole, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "agent_telephonique" as AppRole });
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
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

  useEffect(() => { fetchMembers(); }, []);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success("Copié !");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    const fileExt = file.name.split(".").pop();
    const filePath = `${uploadTarget}/avatar.${fileExt}`;
    setUploadingFor(uploadTarget);
    try {
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", uploadTarget);
      if (updateError) throw updateError;
      toast.success("Photo mise à jour");
      fetchMembers();
    } catch { toast.error("Erreur lors de l'upload"); }
    finally { setUploadingFor(null); setUploadTarget(null); }
  };

  const triggerUpload = (userId: string) => {
    setUploadTarget(userId);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", { body: inviteForm });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInviteResult({
        invite_link: data.invite_link || "",
        temp_password: data.temp_password || "",
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        role: inviteForm.role,
      });
      toast.success(`${inviteForm.full_name} a été invité avec succès`);
      fetchMembers();
    } catch (err: any) { toast.error(err.message || "Erreur lors de l'invitation"); }
    setInviting(false);
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteResult(null);
    setInviteForm({ email: "", full_name: "", role: "agent_telephonique" });
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) { toast.error("Erreur lors de la mise à jour du rôle"); return; }
    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insertError) { toast.error("Erreur lors de la mise à jour du rôle"); return; }
    toast.success("Rôle mis à jour");
    fetchMembers();
  };

  const handleDeleteMember = async (userId: string, name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${name} a été supprimé de l'équipe`);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className="space-y-8">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Équipe
          </h1>
          <p className="text-muted-foreground mt-1">Gérez les membres de votre équipe et leurs rôles</p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) handleCloseInvite(); else setInviteOpen(true); }}>
          <DialogTrigger asChild>
            <Button><UserPlus className="w-4 h-4 mr-2" />Inviter un membre</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{inviteResult ? "🎉 Invitation créée" : "Inviter un nouveau membre"}</DialogTitle>
            </DialogHeader>

            {inviteResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-2">
                <div className="rounded-lg bg-success/10 border border-success/20 p-4 space-y-2">
                  <p className="text-sm font-medium text-success">{inviteResult.full_name} ({ROLE_LABELS[inviteResult.role]})</p>
                  <p className="text-xs text-muted-foreground">{inviteResult.email}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Partagez ces identifiants avec le membre pour qu'il puisse se connecter :</p>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email de connexion</Label>
                    <div className="flex gap-2">
                      <Input value={inviteResult.email} readOnly className="text-sm bg-muted" />
                      <Button size="icon" variant="outline" onClick={() => handleCopy(inviteResult.email, "email")}>
                        {copied === "email" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Key className="w-3 h-3" /> Mot de passe temporaire</Label>
                    <div className="flex gap-2">
                      <Input value={inviteResult.temp_password} readOnly className="text-sm bg-muted font-mono" />
                      <Button size="icon" variant="outline" onClick={() => handleCopy(inviteResult.temp_password, "password")}>
                        {copied === "password" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => handleCopy(
                    `Bonjour ${inviteResult.full_name} !\n\nVoici tes accès à la plateforme Adamkom :\n\n🔗 Lien : ${PUBLISHED_URL}/auth\n📧 Email : ${inviteResult.email}\n🔑 Mot de passe : ${inviteResult.temp_password}\n\nConnecte-toi et change ton mot de passe dès que possible.`,
                    "all"
                  )}>
                    {copied === "all" ? <Check className="w-4 h-4 mr-2 text-success" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copier le message complet
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Le membre pourra se connecter avec ces identifiants.</p>
                </div>
                <Button onClick={handleCloseInvite} className="w-full">Fermer</Button>
              </motion.div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input placeholder="Jean Dupont" value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="jean@exemple.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="agent_telephonique">Agent téléphonique</SelectItem>
                      <SelectItem value="commercial_terrain">Commercial terrain</SelectItem>
                      <SelectItem value="webmaster">Webmaster</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Créer l'invitation
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md shadow-primary/5">
        <CardHeader><CardTitle className="text-lg">Membres ({members.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
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
                          <div className="relative group">
                            <Avatar className="w-9 h-9">
                              {member.avatar_url ? <AvatarImage src={member.avatar_url} alt={member.full_name || ""} /> : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              onClick={() => triggerUpload(member.user_id)}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              {uploadingFor === member.user_id ? (
                                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                              ) : (
                                <Camera className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {member.full_name || "Sans nom"}
                              {isCurrentUser && <span className="text-muted-foreground ml-1">(vous)</span>}
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
                                <Badge key={role} variant="outline" className={`${ROLE_COLORS[role]} gap-1`}>
                                  <Icon className="w-3 h-3" />{ROLE_LABELS[role]}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground text-sm">Aucun rôle</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{member.phone || "—"}</span></TableCell>
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2 justify-end">
                            <Select value={member.roles[0] || ""} onValueChange={(v) => handleRoleChange(member.user_id, v as AppRole)}>
                              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Changer le rôle" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrateur</SelectItem>
                                <SelectItem value="agent_telephonique">Agent téléphonique</SelectItem>
                                <SelectItem value="commercial_terrain">Commercial terrain</SelectItem>
                                <SelectItem value="webmaster">Webmaster</SelectItem>
                                <SelectItem value="designer">Designer</SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer {member.full_name} ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Le compte de ce membre sera définitivement supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteMember(member.user_id, member.full_name || "Ce membre")}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
