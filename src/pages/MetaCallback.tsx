import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMetaOAuth } from "@/hooks/use-meta-oauth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function MetaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { exchangeCode, savePage } = useMetaOAuth();

  const [status, setStatus] = useState<"loading" | "select_page" | "saving" | "done" | "error">("loading");
  const [pages, setPages] = useState<any[]>([]);
  const [expiresIn, setExpiresIn] = useState(5184000);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const code = searchParams.get("code");
    const stateStr = searchParams.get("state");
    const storedClientId = localStorage.getItem("meta_oauth_client_id");

    let cId = "";
    try {
      const state = JSON.parse(decodeURIComponent(stateStr || "{}"));
      cId = state.client_id || storedClientId || "";
    } catch {
      cId = storedClientId || "";
    }

    setClientId(cId);

    if (!code) {
      const errorReason = searchParams.get("error_reason") || "Autorisation refusée";
      setError(errorReason);
      setStatus("error");
      return;
    }

    if (!cId) {
      setError("Client ID manquant");
      setStatus("error");
      return;
    }

    exchangeCode(code, cId)
      .then((data) => {
        setPages(data.pages || []);
        setExpiresIn(data.expires_in || 5184000);
        if (data.pages?.length === 0) {
          setError("Aucune page Facebook trouvée. Assurez-vous d'avoir les permissions sur au moins une page.");
          setStatus("error");
        } else {
          setStatus("select_page");
        }
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, []);

  const togglePage = (pageId: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map((p) => p.id)));
    }
  };

  const handleSaveSelected = async () => {
    const pagesToSave = pages.filter((p) => selectedPages.has(p.id));
    if (pagesToSave.length === 0) {
      toast.error("Sélectionnez au moins une page");
      return;
    }

    setStatus("saving");
    try {
      for (const page of pagesToSave) {
        await savePage(clientId, page, "facebook", expiresIn);
      }
      queryClient.invalidateQueries({ queryKey: ["social_accounts", clientId] });
      localStorage.removeItem("meta_oauth_client_id");
      setStatus("done");
      const igCount = pagesToSave.filter((p) => p.instagram).length;
      toast.success(`${pagesToSave.length} page${pagesToSave.length > 1 ? "s" : ""} Facebook${igCount > 0 ? ` et ${igCount} Instagram` : ""} connectée${pagesToSave.length > 1 ? "s" : ""} !`);
      setTimeout(() => navigate(`/clients/${clientId}`), 1500);
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  // Legacy single-page select (click directly)
  const handleSelectPage = async (page: any) => {
    setSelectedPages(new Set([page.id]));
    setStatus("saving");
    try {
      await savePage(clientId, page, "facebook", expiresIn);
      queryClient.invalidateQueries({ queryKey: ["social_accounts", clientId] });
      localStorage.removeItem("meta_oauth_client_id");
      setStatus("done");
      toast.success("Comptes Facebook" + (page.instagram ? " et Instagram" : "") + " connectés !");
      setTimeout(() => navigate(`/clients/${clientId}`), 1500);
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center">Connexion Meta</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Récupération de vos pages...</p>
            </div>
          )}

          {status === "select_page" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {pages.length} page{pages.length > 1 ? "s" : ""} trouvée{pages.length > 1 ? "s" : ""}
                </p>
                {pages.length > 1 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={handleSelectAll}>
                    {selectedPages.size === pages.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                )}
              </div>

              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => togglePage(page.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    selectedPages.has(page.id)
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    selectedPages.has(page.id) ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedPages.has(page.id) && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center text-lg">
                    𝐟
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{page.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Page ID: {page.id}
                      {page.instagram && ` · Instagram: @${page.instagram.username || page.instagram.id}`}
                    </p>
                  </div>
                </button>
              ))}

              <Button
                className="w-full mt-4"
                onClick={handleSaveSelected}
                disabled={selectedPages.size === 0}
              >
                Connecter {selectedPages.size > 0 ? `${selectedPages.size} page${selectedPages.size > 1 ? "s" : ""}` : "les pages sélectionnées"}
              </Button>
            </div>
          )}

          {status === "saving" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enregistrement...</p>
            </div>
          )}

          {status === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-10 h-10 text-success" />
              <p className="text-sm font-medium">Comptes connectés avec succès !</p>
              <p className="text-xs text-muted-foreground">Redirection...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-destructive font-medium">Erreur</p>
              <p className="text-xs text-muted-foreground text-center">{error}</p>
              <Button variant="outline" onClick={() => navigate(clientId ? `/clients/${clientId}` : "/clients")}>
                Retour
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
