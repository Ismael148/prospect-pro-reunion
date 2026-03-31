import { useState } from "react";
import { useSavedTemplates, useSaveTemplate, useDeleteTemplate, SavedTemplate } from "@/hooks/use-email-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, FolderOpen, Trash2, FileText, Loader2 } from "lucide-react";

interface EmailTemplateSaverProps {
  subject: string;
  body: string;
  category?: string;
  onLoad: (template: SavedTemplate) => void;
}

export default function EmailTemplateSaver({ subject, body, category, onLoad }: EmailTemplateSaverProps) {
  const { data: templates, isLoading } = useSavedTemplates();
  const saveTemplate = useSaveTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) { toast.error("Donnez un nom au modèle"); return; }
    if (!subject.trim() && !body.trim()) { toast.error("Le modèle est vide"); return; }
    saveTemplate.mutate({ name, subject, body, category }, {
      onSuccess: () => { setShowSave(false); setName(""); },
    });
  };

  return (
    <>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowLoad(true)}
        >
          <FolderOpen className="w-3.5 h-3.5" /> Modèles
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowSave(true)}
          disabled={!subject.trim() && !body.trim()}
        >
          <Save className="w-3.5 h-3.5" /> Sauvegarder
        </Button>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" /> Sauvegarder le modèle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nom du modèle (ex: Relance NDD, Bienvenue...)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Objet : <strong className="text-foreground">{subject || "—"}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSave(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saveTemplate.isPending} className="gap-1.5">
              {saveTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoad} onOpenChange={setShowLoad}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" /> Modèles sauvegardés
            </DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : !templates?.length ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Aucun modèle sauvegardé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer group"
                  onClick={() => { onLoad(tpl); setShowLoad(false); toast.success(`Modèle "${tpl.name}" chargé`); }}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
                    {tpl.category && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">{tpl.category}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(tpl.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate.mutate(tpl.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
