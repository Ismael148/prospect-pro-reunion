import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle, Loader2, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ImportTarget = "clients" | "prospects";

// DB fields for each target
const TARGET_FIELDS: Record<ImportTarget, { key: string; label: string; required?: boolean }[]> = {
  clients: [
    { key: "company_name", label: "Nom entreprise", required: true },
    { key: "phone", label: "Téléphone" },
    { key: "email", label: "Email" },
    { key: "website", label: "Site web" },
    { key: "address", label: "Adresse" },
    { key: "city", label: "Ville" },
    { key: "postal_code", label: "Code postal" },
    { key: "sector", label: "Secteur" },
    { key: "siret", label: "SIRET" },
    { key: "notes", label: "Notes" },
    { key: "pack_type", label: "Type de pack" },
    { key: "pack_amount", label: "Montant pack" },
    { key: "payment_method", label: "Mode de paiement" },
    { key: "signature_date", label: "Date de signature" },
    { key: "nfc_quantity", label: "Quantité NFC" },
  ],
  prospects: [
    { key: "business_name", label: "Nom entreprise", required: true },
    { key: "phone", label: "Téléphone" },
    { key: "email", label: "Email" },
    { key: "website", label: "Site web" },
    { key: "address", label: "Adresse" },
    { key: "city", label: "Ville" },
    { key: "postal_code", label: "Code postal" },
    { key: "sector", label: "Secteur" },
    { key: "google_maps_url", label: "Lien Google Maps" },
    { key: "notes", label: "Notes" },
    { key: "source", label: "Source" },
    { key: "rating", label: "Note Google" },
    { key: "reviews_count", label: "Nombre d'avis" },
  ],
};

// Common Notion column name aliases for auto-mapping
const ALIASES: Record<string, string[]> = {
  company_name: ["nom", "entreprise", "société", "societe", "name", "company", "company_name", "nom entreprise", "raison sociale"],
  business_name: ["nom", "entreprise", "société", "societe", "name", "company", "business_name", "nom entreprise", "raison sociale"],
  phone: ["téléphone", "telephone", "tel", "phone", "numéro", "numero", "mobile"],
  email: ["email", "mail", "e-mail", "courriel", "adresse email"],
  website: ["site", "site web", "website", "url", "site internet", "web"],
  address: ["adresse", "address", "rue", "street"],
  city: ["ville", "city", "commune"],
  postal_code: ["code postal", "cp", "postal_code", "zip", "code"],
  sector: ["secteur", "sector", "activité", "activite", "domaine", "industry"],
  siret: ["siret", "siren", "numéro siret"],
  notes: ["notes", "remarques", "commentaires", "description", "observations"],
  pack_type: ["pack", "type pack", "offre", "formule"],
  pack_amount: ["montant", "prix", "amount", "tarif"],
  payment_method: ["paiement", "règlement", "reglement", "payment"],
  signature_date: ["date signature", "signature", "date", "signé le", "signed"],
  nfc_quantity: ["quantité nfc", "nfc", "nombre cartes", "cartes nfc", "qty nfc"],
  google_maps_url: ["google maps", "maps", "lien google", "google_maps_url"],
  source: ["source", "origine", "provenance"],
  rating: ["note", "rating", "évaluation", "evaluation", "avis"],
  reviews_count: ["avis", "reviews", "nombre avis", "reviews_count"],
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some((c) => c));
  return { headers, rows };
}

function autoMap(csvHeaders: string[], target: ImportTarget): Record<number, string> {
  const fields = TARGET_FIELDS[target];
  const mapping: Record<number, string> = {};

  csvHeaders.forEach((header, idx) => {
    const normalized = header.toLowerCase().trim();
    for (const field of fields) {
      const aliases = ALIASES[field.key] || [field.key];
      if (aliases.some((a) => normalized === a || normalized.includes(a) || a.includes(normalized))) {
        // Don't double-map
        if (!Object.values(mapping).includes(field.key)) {
          mapping[idx] = field.key;
          break;
        }
      }
    }
  });

  return mapping;
}

export default function ImportCSV() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [target, setTarget] = useState<ImportTarget>("clients");
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "done">("upload");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.headers.length === 0) {
          toast.error("Fichier CSV vide ou invalide");
          return;
        }
        setCsvData(parsed);
        const auto = autoMap(parsed.headers, target);
        setMapping(auto);
        setStep("mapping");
        const mappedCount = Object.keys(auto).length;
        if (mappedCount > 0) {
          toast.success(`${mappedCount} colonne(s) mappée(s) automatiquement`);
        }
      };
      reader.readAsText(file, "utf-8");
    },
    [target]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handleFile(file);
      } else {
        toast.error("Veuillez déposer un fichier .csv");
      }
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const updateMapping = (csvIndex: number, dbField: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (dbField === "__skip__") {
        delete next[csvIndex];
      } else {
        // Remove any existing mapping for this db field
        for (const k of Object.keys(next)) {
          if (next[Number(k)] === dbField) delete next[Number(k)];
        }
        next[csvIndex] = dbField;
      }
      return next;
    });
  };

  const fields = TARGET_FIELDS[target];
  const requiredFields = fields.filter((f) => f.required).map((f) => f.key);
  const mappedRequired = requiredFields.filter((r) => Object.values(mapping).includes(r));
  const canProceed = mappedRequired.length === requiredFields.length;

  const handleImport = async () => {
    if (!csvData || !user) return;
    setImporting(true);
    let success = 0;
    let errors = 0;

    const batchSize = 50;
    const allRows = csvData.rows.map((row) => {
      const record: Record<string, any> = {};
      Object.entries(mapping).forEach(([csvIdx, dbField]) => {
        const val = row[Number(csvIdx)];
        if (val) {
          if (dbField === "pack_amount" || dbField === "rating") {
            record[dbField] = parseFloat(val) || null;
          } else if (dbField === "reviews_count" || dbField === "nfc_quantity") {
            record[dbField] = parseInt(val) || null;
          } else {
            record[dbField] = val;
          }
        }
      });

      if (target === "clients") {
        record.created_by = user.id;
        // Les anciens clients importés sont déjà signés
        record.pipeline_status = record.pipeline_status || "contrat_signe";
        // Normaliser pack_type
        if (record.pack_type) {
          const pt = String(record.pack_type).toLowerCase().trim();
          if (pt.includes("numerik") || pt.includes("numérik") || pt.includes("web") || pt.includes("site")) {
            record.pack_type = "star_bizness_numerik";
          } else if (pt.includes("nfc") || pt.includes("carte")) {
            record.pack_type = "star_bizness_nfc";
          } else {
            record.pack_type = "autre";
          }
        }
      } else {
        record.created_by = user.id;
        record.status = record.status || "nouveau";
      }

      return record;
    });

    // Filter out rows missing required fields
    const validRows = allRows.filter((r) => {
      const nameField = target === "clients" ? "company_name" : "business_name";
      return r[nameField] && String(r[nameField]).trim();
    });

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const { error } = await supabase.from(target).insert(batch as any);
      if (error) {
        console.error("Import batch error:", error);
        errors += batch.length;
      } else {
        success += batch.length;
      }
    }

    errors += allRows.length - validRows.length;

    setImportResult({ success, errors });
    setStep("done");
    setImporting(false);
    if (success > 0) toast.success(`${success} enregistrement(s) importé(s)`);
    if (errors > 0) toast.error(`${errors} erreur(s) lors de l'import`);
  };

  const reset = () => {
    setCsvData(null);
    setMapping({});
    setStep("upload");
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import CSV</h1>
          <p className="text-sm text-muted-foreground">Importez vos données depuis Notion ou tout fichier CSV</p>
        </div>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Charger un fichier CSV
            </CardTitle>
            <CardDescription>
              Exportez vos données depuis Notion au format CSV, puis glissez-déposez le fichier ici
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium">Importer dans :</p>
              <Select value={target} onValueChange={(v) => setTarget(v as ImportTarget)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="prospects">Prospects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Glissez votre fichier CSV ici</p>
              <p className="text-sm text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Notion → Export → CSV (séparateur virgule ou point-virgule)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && csvData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Correspondance des colonnes</CardTitle>
                <CardDescription>
                  {csvData.rows.length} ligne(s) détectée(s) • Associez les colonnes CSV aux champs de la base
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="w-4 h-4 mr-1" /> Annuler
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Colonne CSV</TableHead>
                    <TableHead className="w-[15%]">Aperçu</TableHead>
                    <TableHead className="w-[10%]" />
                    <TableHead className="w-[35%]">Champ cible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.headers.map((header, idx) => {
                    const preview = csvData.rows[0]?.[idx] || "";
                    const selected = mapping[idx] || "__skip__";
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell className="text-muted-foreground text-xs truncate max-w-[150px]">
                          {preview}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Select value={selected} onValueChange={(v) => updateMapping(idx, v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">
                                <span className="text-muted-foreground">— Ignorer —</span>
                              </SelectItem>
                              {fields.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                  {f.required ? " *" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {!canProceed && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                Champs requis non mappés : {requiredFields.filter((r) => !Object.values(mapping).includes(r)).map((r) => fields.find((f) => f.key === r)?.label).join(", ")}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>Retour</Button>
              <Button onClick={() => setStep("preview")} disabled={!canProceed}>
                Aperçu <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && csvData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Aperçu de l'import</CardTitle>
                <CardDescription>
                  {csvData.rows.length} ligne(s) à importer dans {target === "clients" ? "Clients" : "Prospects"}
                </CardDescription>
              </div>
              <Badge variant="outline">{Object.keys(mapping).length} colonnes mappées</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    {Object.entries(mapping).map(([_, dbField]) => (
                      <TableHead key={dbField}>
                        {fields.find((f) => f.key === dbField)?.label || dbField}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.rows.slice(0, 10).map((row, rIdx) => (
                    <TableRow key={rIdx}>
                      <TableCell className="text-muted-foreground text-xs">{rIdx + 1}</TableCell>
                      {Object.keys(mapping).map((csvIdx) => (
                        <TableCell key={csvIdx} className="text-sm truncate max-w-[200px]">
                          {row[Number(csvIdx)] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvData.rows.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                ... et {csvData.rows.length - 10} ligne(s) supplémentaire(s)
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Modifier le mapping
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Import en cours...</>
                ) : (
                  <>Importer {csvData.rows.length} ligne(s)</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === "done" && importResult && (
        <Card>
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Import terminé !</h2>
            <div className="flex justify-center gap-4">
              <Badge variant="default" className="text-base px-4 py-1">
                ✅ {importResult.success} importé(s)
              </Badge>
              {importResult.errors > 0 && (
                <Badge variant="destructive" className="text-base px-4 py-1">
                  ❌ {importResult.errors} erreur(s)
                </Badge>
              )}
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={reset}>Nouvel import</Button>
              <Button onClick={() => navigate(target === "clients" ? "/clients" : "/prospection")}>
                Voir les {target === "clients" ? "clients" : "prospects"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
