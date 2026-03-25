import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DELIVERABLE_STATUS_LABELS, PACK_DELIVERABLES,
} from "@/lib/constants";
import { Plus, Loader2, Package, CheckCircle2, Circle, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"];
type Deliverable = Tables<"deliverables">;

interface Props {
  projectId: string;
  packType: string;
  deliverables: Deliverable[] | undefined;
  clientEmail?: string | null;
  clientName?: string | null;
  onAdd: (d: TablesInsert<"deliverables">) => Promise<void>;
  onStatusChange: (id: string, status: DeliverableStatus) => Promise<void>;
  onAutoCreate: () => Promise<void>;
  isCreating: boolean;
}

export default function ProjectDeliverables({
  projectId, packType, deliverables, clientEmail, clientName, onAdd, onStatusChange, onAutoCreate, isCreating,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    await onAdd({ project_id: projectId, name: form.name, description: form.description || null });
    setOpen(false);
    setForm({ name: "", description: "" });
  };

  const handleSendDesign = async (deliverable: Deliverable) => {
    navigate(`/projets/${projectId}/livrables/${deliverable.id}/envoyer`);
  };

  return (
    <Card className="border-0 shadow-md shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5" /> Livrables</CardTitle>
        <div className="flex gap-2">
          {!deliverables?.length && PACK_DELIVERABLES[packType]?.length > 0 && (
            <Button size="sm" variant="outline" onClick={onAutoCreate} disabled={isCreating}>
              Générer depuis le pack
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau livrable</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <Button onClick={handleAdd} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!deliverables?.length ? (
          <p className="text-muted-foreground text-sm text-center py-4">Aucun livrable</p>
        ) : (
          <div className="space-y-2">
            {deliverables.map((d) => {
              const StatusIcon = d.status === "approuve" ? CheckCircle2 : d.status === "rejete" ? AlertTriangle : Circle;
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <StatusIcon className={`w-5 h-5 shrink-0 ${
                    d.status === "approuve" ? "text-success" : d.status === "rejete" ? "text-destructive" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        Voir le fichier
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleSendDesign(d)}
                    title={`Préparer l'email pour ${clientName || clientEmail || "ce client"}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Envoyer</span>
                  </Button>
                  <Select value={d.status} onValueChange={(v) => onStatusChange(d.id, v as DeliverableStatus)}>
                    <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DELIVERABLE_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
