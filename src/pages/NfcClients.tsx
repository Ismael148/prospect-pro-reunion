import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, CreditCard, Loader2, Search, Phone, Mail, MapPin,
  CheckCircle2, AlertCircle, FileSpreadsheet, Users, X, ArrowRightLeft, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// CSV aliases for auto-mapping
const ALIASES: Record<string, string[]> = {
  company_name: ["nom", "entreprise", "société", "societe", "name", "company", "nom entreprise", "raison sociale"],
  manager_name: ["gérant", "gerant", "nom du gérant", "responsable", "contact"],
  phone: ["téléphone", "telephone", "tel", "phone", "numéro", "numero", "mobile"],
  email: ["email", "mail", "e-mail", "courriel"],
  address: ["adresse", "address", "rue"],
  city: ["ville", "city", "commune"],
  postal_code: ["code postal", "cp", "zip", "postal_code"],
  nfc_quantity: ["quantité", "quantite", "qty", "nb cartes", "nombre cartes", "nfc", "cartes"],
};

interface NfcClient {
  id: string;
  company_name: string;
  manager_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  nfc_quantity: number;
}

export default function NfcClients() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"idle" | "mapping" | "preview" | "done">("idle");
  const [importResult, setImportResult] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });

  // List state
  const [nfcClients, setNfcClients] = useState<NfcClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterQty, setFilterQty] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const loadNfcClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name, manager_name, phone, email, address, city, nfc_quantity")
      .gt("nfc_quantity", 0)
      .order("company_name");
    if (!error && data) {
      setNfcClients(data as NfcClient[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadNfcClients(); }, [loadNfcClients]);


  // CSV parsing
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("Le fichier est vide ou n'a pas d'en-tête");
        return;
      }

      const separator = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(separator).map((h) => h.replace(/^"|"$/g, "").trim());
      const rows = lines.slice(1).map((line) =>
        line.split(separator).map((c) => c.replace(/^"|"$/g, "").trim())
      );

      setCsvHeaders(headers);
      setCsvData(rows);

      // Auto-map
      const autoMap: Record<string, string> = {};
      for (const [field, aliases] of Object.entries(ALIASES)) {
        const match = headers.findIndex((h) =>
          aliases.some((a) => h.toLowerCase().includes(a.toLowerCase()))
        );
        if (match >= 0) autoMap[field] = headers[match];
      }
      setMapping(autoMap);
      setStep("mapping");
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleImport = async () => {
    if (!user || !mapping.company_name) {
      toast.error("Le champ 'Nom entreprise' doit être mappé");
      return;
    }

    setImporting(true);
    let success = 0;
    let errors = 0;

    // Build reverse mapping: csvHeader -> dbField
    const reverseMap: Record<string, string> = {};
    for (const [field, csvCol] of Object.entries(mapping)) {
      reverseMap[csvCol] = field;
    }

    const batch: any[] = [];
    for (const row of csvData) {
      const record: Record<string, any> = {
        created_by: user.id,
        pipeline_status: "contrat_signe",
        pack_type: "star_bizness_nfc",
        nfc_quantity: 1,
      };

      csvHeaders.forEach((header, i) => {
        const field = reverseMap[header];
        if (field && row[i]) {
          if (field === "nfc_quantity") {
            record[field] = parseInt(row[i]) || 1;
          } else if (field === "pack_amount") {
            record[field] = parseFloat(row[i]) || null;
          } else {
            record[field] = row[i];
          }
        }
      });

      if (record.company_name?.trim()) {
        batch.push(record);
      }
    }

    // Insert in chunks of 50
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error } = await supabase.from("clients").insert(chunk);
      if (error) {
        console.error("Import error:", error);
        errors += chunk.length;
      } else {
        success += chunk.length;
      }
    }

    setImportResult({ success, errors });
    setStep("done");
    setImporting(false);
    if (success > 0) {
      toast.success(`${success} client(s) NFC importé(s)`);
      loadNfcClients();
    }
  };

  const filteredClients = nfcClients.filter((c) => {
    if (!searchFilter) return true;
    const s = searchFilter.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s) ||
      c.manager_name?.toLowerCase().includes(s)
    );
  });

  const totalCards = nfcClients.reduce((sum, c) => sum + (c.nfc_quantity || 1), 0);

  const handleConvertToClient = async (clientId: string, companyName: string) => {
    const { error } = await supabase
      .from("clients")
      .update({ pack_type: "star_bizness_numerik" })
      .eq("id", clientId);
    if (error) {
      toast.error("Erreur lors de la conversion");
    } else {
      toast.success(`${companyName} converti en client NUMERIK`);
      loadNfcClients();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Cartes NFC
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des clients avec cartes NFC
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-4 h-4" /> Importer CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{nfcClients.length}</p>
              <p className="text-xs text-muted-foreground">Clients NFC</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCards}</p>
              <p className="text-xs text-muted-foreground">Cartes totales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Wizard */}
      {step === "mapping" && (
        <Card className="border-primary/20 shadow-medium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" /> Mapping des colonnes
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setStep("idle")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>{csvData.length} ligne(s) détectée(s) — Associez les colonnes CSV aux champs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(ALIASES).map(([field, _]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-32 shrink-0">
                    {field === "company_name" ? "Nom entreprise *" : field.replace(/_/g, " ")}
                  </span>
                  <select
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={mapping[field] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">— Ignorer —</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="border rounded-lg overflow-auto max-h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((h) => (
                      <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 3).map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j} className="text-xs py-1.5">{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("idle")}>Annuler</Button>
              <Button
                onClick={handleImport}
                disabled={importing || !mapping.company_name}
                className="gap-2"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importer {csvData.length} clients NFC
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="border-success/30">
          <CardContent className="p-6 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <div>
              <p className="font-semibold">Import terminé</p>
              <p className="text-sm text-muted-foreground">
                {importResult.success} importé(s)
                {importResult.errors > 0 && `, ${importResult.errors} erreur(s)`}
              </p>
            </div>
            <Button variant="outline" className="ml-auto" onClick={() => setStep("idle")}>
              Fermer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10 h-9"
          placeholder="Rechercher un client NFC..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
      </div>

      {/* Client list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !filteredClients.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchFilter ? "Aucun résultat" : "Aucun client NFC — Importez un CSV pour commencer"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filteredClients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.01, duration: 0.15 }}
            >
              <Card className="border border-border/50 hover:border-primary/20 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => navigate(`/clients/${client.id}`)}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{client.company_name}</p>
                      <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 shrink-0" variant="outline">
                        {client.nfc_quantity} carte{client.nfc_quantity > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                      {client.manager_name && <span>{client.manager_name}</span>}
                      {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                      {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                      {client.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                          title="Convertir en client NUMERIK"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Convertir en client NUMERIK ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {client.company_name} passera du pack NFC au pack STAR BIZNESS NUMERIK. Un projet web sera automatiquement créé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleConvertToClient(client.id, client.company_name)}>
                            Convertir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}