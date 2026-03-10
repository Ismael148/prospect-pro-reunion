import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useClientFormByToken, useSubmitClientForm, ClientFormData } from "@/hooks/use-client-forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard, Globe, CheckCircle2, Send } from "lucide-react";
import { ImageUpload, GalleryUpload } from "@/components/ImageUpload";
import logo from "@/assets/logo.webp";

const NFC_FIELDS: { key: keyof ClientFormData; label: string; type?: string; placeholder?: string; required?: boolean; multiline?: boolean }[] = [
  { key: "full_name", label: "Nom complet", placeholder: "Jean Dupont", required: true },
  { key: "position", label: "Poste / Fonction", placeholder: "Gérant" },
  { key: "company_name", label: "Nom de l'entreprise", placeholder: "Mon Entreprise", required: true },
  { key: "phone", label: "Téléphone", placeholder: "0692 XX XX XX", required: true },
  { key: "email", label: "Email", type: "email", placeholder: "contact@entreprise.re" },
  { key: "website", label: "Site web", placeholder: "https://mon-site.re" },
  { key: "address", label: "Adresse complète", placeholder: "12 Rue des Flamboyants, 97400 Saint-Denis" },
  { key: "facebook", label: "Facebook (URL)", placeholder: "https://facebook.com/..." },
  { key: "instagram", label: "Instagram (URL)", placeholder: "https://instagram.com/..." },
  { key: "linkedin", label: "LinkedIn (URL)", placeholder: "https://linkedin.com/in/..." },
  { key: "tiktok", label: "TikTok (URL)", placeholder: "https://tiktok.com/@..." },
  { key: "whatsapp", label: "WhatsApp (numéro)", placeholder: "+262692XXXXXX" },
  { key: "google_maps_url", label: "Lien Google Maps", placeholder: "https://maps.google.com/..." },
  { key: "preferred_color", label: "Couleur préférée (hex)", placeholder: "#FF6B00" },
];

const SITE_FIELDS: { key: keyof ClientFormData; label: string; type?: string; placeholder?: string; required?: boolean; multiline?: boolean }[] = [
  { key: "company_name", label: "Nom de l'entreprise", placeholder: "Mon Entreprise", required: true },
  { key: "slogan", label: "Slogan / Accroche", placeholder: "Votre partenaire digital à La Réunion" },
  { key: "company_description", label: "Description de l'activité", placeholder: "Décrivez votre entreprise en quelques lignes...", multiline: true, required: true },
  { key: "services", label: "Services proposés", placeholder: "Service 1, Service 2, Service 3...", multiline: true, required: true },
  { key: "phone", label: "Téléphone", placeholder: "0692 XX XX XX", required: true },
  { key: "email", label: "Email de contact", type: "email", placeholder: "contact@entreprise.re", required: true },
  { key: "address", label: "Adresse", placeholder: "12 Rue des Flamboyants, 97400 Saint-Denis" },
  { key: "opening_hours", label: "Horaires d'ouverture", placeholder: "Lundi-Vendredi: 8h-17h, Samedi: 9h-12h", multiline: true },
  { key: "facebook", label: "Facebook (URL)", placeholder: "https://facebook.com/..." },
  { key: "instagram", label: "Instagram (URL)", placeholder: "https://instagram.com/..." },
  { key: "google_maps_url", label: "Lien Google Maps", placeholder: "https://maps.google.com/..." },
  { key: "target_audience", label: "Public cible", placeholder: "Particuliers, professionnels, entreprises..." },
  { key: "competitors", label: "Concurrents principaux", placeholder: "Listez vos concurrents ou sites de référence..." },
  { key: "preferred_style", label: "Style / Ambiance souhaitée", placeholder: "Moderne, épuré, coloré, professionnel..." },
  { key: "preferred_color", label: "Couleurs préférées", placeholder: "#FF6B00, bleu foncé..." },
  { key: "additional_pages", label: "Pages supplémentaires souhaitées", placeholder: "Galerie, Témoignages, FAQ...", multiline: true },
];

export default function ClientForm() {
  const { token, type } = useParams<{ token: string; type: string }>();
  const formType = type === "nfc" ? "nfc" : "site";
  const { data, isLoading, error } = useClientFormByToken(token!, formType);
  const submitForm = useSubmitClientForm();
  const [formData, setFormData] = useState<ClientFormData>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (data?.form?.form_data) {
      setFormData(data.form.form_data as ClientFormData);
    }
  }, [data]);

  const alreadySubmitted = data?.form?.status === "soumis" || data?.form?.status === "valide";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <p className="text-destructive font-medium">Lien invalide ou expiré</p>
            <p className="text-sm text-muted-foreground mt-2">
              Veuillez contacter votre chargé de compte pour obtenir un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || alreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Formulaire envoyé !</h2>
            <p className="text-sm text-muted-foreground">
              Merci {data.client.company_name} ! Vos informations ont bien été transmises à notre équipe.
              Nous reviendrons vers vous rapidement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields = formType === "nfc" ? NFC_FIELDS : SITE_FIELDS;
  const title = formType === "nfc" ? "Informations Carte NFC" : "Informations Site Internet";
  const description = formType === "nfc"
    ? "Remplissez ce formulaire pour personnaliser votre carte de visite NFC"
    : "Remplissez ce formulaire pour que nous puissions créer votre site internet";

  const handleChange = (key: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = fields.filter((f) => f.required);
    const missing = requiredFields.filter((f) => !formData[f.key]?.toString().trim());
    if (missing.length) {
      toast.error(`Champs requis manquants : ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    try {
      await submitForm.mutateAsync({ token: token!, formType, formData });
      setSubmitted(true);
      toast.success("Formulaire envoyé avec succès !");
    } catch {
      toast.error("Erreur lors de l'envoi du formulaire");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <img src={logo} alt="Adamkom" className="w-6 h-6 object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Adamkom</h1>
            <p className="text-[11px] text-muted-foreground">{data.client.company_name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              {formType === "nfc" ? (
                <CreditCard className="w-6 h-6 text-primary" />
              ) : (
                <Globe className="w-6 h-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      value={(formData[field.key] as string) || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={field.type || "text"}
                      value={(formData[field.key] as string) || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}

              {/* Image uploads */}
              {formType === "nfc" ? (
                <div className="space-y-5 pt-2 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground">📸 Photos & Logo</p>
                  <ImageUpload
                    label="Logo de l'entreprise"
                    value={formData.logo_url || ""}
                    onChange={(url) => handleChange("logo_url", url)}
                    folder={`${data.client.id}/nfc`}
                  />
                  <ImageUpload
                    label="Photo de profil"
                    value={formData.photo_url || ""}
                    onChange={(url) => handleChange("photo_url", url)}
                    folder={`${data.client.id}/nfc`}
                  />
                </div>
              ) : (
                <div className="space-y-5 pt-2 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground">📸 Images du site</p>
                  <ImageUpload
                    label="Logo de l'entreprise"
                    value={formData.logo_url || ""}
                    onChange={(url) => handleChange("logo_url", url)}
                    folder={`${data.client.id}/site`}
                    required
                  />
                  <GalleryUpload
                    label="Galerie photos (locaux, produits, équipe...)"
                    values={formData.gallery_urls || []}
                    onChange={(urls) => setFormData((prev) => ({ ...prev, gallery_urls: urls }))}
                    folder={`${data.client.id}/site`}
                    max={10}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Remarques ou demandes particulières</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Précisez ici toute information complémentaire..."
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitForm.isPending}>
                {submitForm.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer le formulaire
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
