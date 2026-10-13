import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, ShieldCheck, Smartphone, Video, CheckCircle2, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GOOGLE_VIDEO_HELP, GOOGLE_VIDEO_RULES, GOOGLE_VERIFICATION_VIDEOS } from "@/lib/gmb-video-guide";

const steps = ["Avant de commencer", "Ce qu’il faut filmer", "Exemple en vidéo", "Enregistrer et envoyer", "Après l’envoi"];
const preparations = [
  "Je suis sur place avec mon téléphone connecté à Internet et le compte Google qui gère ma fiche.",
  "J’ai préparé un parcours continu montrant l’emplacement, l’activité et mon accès professionnel.",
  "Je peux filmer sans visages d’autres personnes ni informations privées ou sensibles.",
];

export default function TutoGmbVideo() {
  const [params] = useSearchParams();
  const company = params.get("entreprise");
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<"storefront" | "service">("storefront");
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [play, setPlay] = useState(false);
  const video = GOOGLE_VERIFICATION_VIDEOS[kind];
  const move = (next: number) => { setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); };

  return (
    <div className="tuto-light gmb-video-tutorial min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <img src="/images/logo-adamkom-black.png" alt="Adamkom by JJP" className="h-14 w-28 object-contain object-left" />
          <span className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Validation Google</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        <div className="border-b border-border pb-10 pt-10 text-center sm:pb-12 sm:pt-14">
          <p className="mb-5 break-words text-xs font-semibold uppercase text-primary">Pack Chip Tuning{company ? ` · ${company}` : ""}</p>
          <h1 className="gmb-guide-title mx-auto font-bold">
            <span className="block">Validez votre fiche<span className="hidden sm:inline"> Google</span></span>
            <span className="block text-primary"><span className="sm:hidden">Google </span>avec une vidéo</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground">Votre entreprise, votre téléphone, une seule prise.<br className="hidden sm:block" /> Montrez à Google le lieu, votre activité et votre accès professionnel.</p>
          <div className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-medium">
            <span className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> 30 secondes minimum</span>
            <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Sur votre téléphone</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Guide officiel Google</span>
          </div>
        </div>
        <div className="grid min-w-0 gap-8 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:pt-10">
          <nav aria-label="Étapes du tutoriel" className="min-w-0">
            <div className="lg:sticky lg:top-8">
              <p className="mb-5 text-xs font-semibold uppercase text-muted-foreground">Votre parcours</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {steps.map((label, index) => <Button key={label} variant="ghost" onClick={() => move(index)} aria-current={index === step ? "step" : undefined} className={`gmb-step h-auto min-h-14 w-full justify-start whitespace-normal rounded-lg px-3 py-3 text-left text-sm leading-5 ${index === step ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
                  <span className={`mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${index === step ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>{index < step ? <CheckCircle2 className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">{label}</span>{index === step && <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                </Button>)}
              </div>
              <div className="mt-6 hidden border-t border-border pt-5 lg:block">
                <p className="text-sm font-medium">Besoin d’un coup de main ?</p>
                <a href="tel:0262666876" className="mt-2 inline-block text-sm text-primary">0262 66 68 76</a>
              </div>
            </div>
          </nav>
          <div className="min-w-0">
        <section aria-labelledby="step-title" className="min-w-0">
          <div className="mb-7 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold text-primary">{String(step + 1).padStart(2, "0")}</span>
            <div className="min-w-0"><p className="text-xs font-medium uppercase text-muted-foreground">Étape {step + 1} sur {steps.length}</p>
            <h2 id="step-title" className="mt-1 text-2xl font-bold leading-snug">{steps[step]}</h2></div>
          </div>
          {step === 0 && <div className="space-y-6">
            <Notice title="Google choisit la méthode de validation">Ce guide concerne l’option « Vidéo sur votre établissement ». Si elle n’apparaît pas, suivez la méthode proposée sur votre fiche. Une activité exclusivement en ligne, sans contact en personne avec ses clients, n’est pas éligible à une fiche Google Business Profile.</Notice>
            <h3 className="text-lg font-semibold">Préparez votre téléphone et votre parcours</h3>
            {preparations.map((label, index) => <label key={label} className="flex cursor-pointer items-start gap-3 border-b border-border pb-4"><Checkbox className="mt-1 shrink-0" checked={Boolean(checks[index])} onCheckedChange={(value) => setChecks((previous) => ({ ...previous, [index]: value === true }))} /><span className="min-w-0 text-base leading-7">{label}</span></label>)}
            <Notice title="Une seule prise, au moins 30 secondes">La vidéo doit être unique, complète, sans interruption et sans montage. Enregistrez-la et envoyez-la depuis votre fiche Google sur un appareil mobile. Une vidéo préenregistrée, filmée hors connexion ou importée depuis votre galerie n’est pas acceptée.</Notice>
          </div>}
          {(step === 1 || step === 2) && <div className="space-y-6">
            <Tabs value={kind} onValueChange={(value) => { if (value === "storefront" || value === "service") { setKind(value); setPlay(false); } }}>
              <TabsList className="grid h-auto w-full grid-cols-1 gap-1 bg-muted p-1.5 sm:grid-cols-2"><TabsTrigger value="storefront" className="h-full whitespace-normal px-4 py-3 text-sm leading-5">J’accueille mes clients sur place</TabsTrigger><TabsTrigger value="service" className="h-full whitespace-normal px-4 py-3 text-sm leading-5">Je me déplace chez mes clients</TabsTrigger></TabsList>
            </Tabs>
            {step === 1 ? <>
              <Evidence icon={MapPin} title="L’emplacement" text="Commencez par la rue : plaque de rue, numéro de bâtiment, commerces voisins ou repères identifiables. Ils doivent permettre de situer l’adresse de votre établissement, pas seulement montrer un terrain sans repères." />
              <Evidence icon={Video} title="Votre activité" text={kind === "storefront" ? "Filmez votre devanture, showroom et enseigne permanente. Le nom sur le panneau, le mur ou la vitrine doit correspondre au nom de votre fiche Google. Montrez ensuite votre activité à l’intérieur." : "Montrez vos outils, machines, produits, espace de travail, cartes de visite ou véhicule aux couleurs de votre entreprise. Par exemple, pour un garage mobile : matériel de diagnostic et équipement professionnel."} />
              <Evidence icon={ShieldCheck} title="La preuve que vous gérez l’entreprise" text={kind === "storefront" ? "Montrez un accès réservé au personnel : ouvrez avec vos clés une réserve, accédez à un atelier réservé, une caisse ou un système de point de vente. Une simple vue de l’entrée publique ne suffit pas." : "Déverrouillez votre véhicule professionnel identifié, accédez à vos ressources de travail ou montrez-vous en train de réaliser un service. Google accepte aussi un permis d’exploitation, une facture client ou de charge courante au nom de l’entreprise : masquez les informations sensibles."} />
              <Notice title={kind === "storefront" ? "Votre enseigne doit être permanente" : "Vous n’accueillez pas de public à votre adresse ?"}>{kind === "storefront" ? "Sans enseigne permanente sur site, Google demande de déclarer un établissement de services de proximité plutôt qu’un établissement physique. Un établissement mixte, qui accueille et se déplace, suit les exigences des établissements physiques." : "N’affichez pas cette adresse professionnelle sur la fiche : utilisez une zone de service. Si vous travaillez depuis votre domicile, filmez les panneaux de rue et repères du quartier pour confirmer votre localisation."}</Notice>
            </> : <>
              <p className="leading-7 text-muted-foreground">Démonstration officielle Google adaptée à votre situation. La voix est en anglais ; les explications de ce guide sont entièrement en français.</p>
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-accent">
                {play ? <iframe key={video} title="Démonstration officielle Google de validation vidéo" src={`https://www.youtube-nocookie.com/embed/${video}?cc_load_policy=1&cc_lang_pref=fr&hl=fr&rel=0`} className="h-full w-full border-0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen /> : <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-primary shadow-soft"><Play className="ml-1 h-7 w-7" /></span><Button onClick={() => setPlay(true)} className="h-auto whitespace-normal">Afficher la vidéo officielle Google</Button></div>}
              </div>
              <Button asChild variant="outline" className="h-auto whitespace-normal"><a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4 shrink-0" /> Voir aussi sur YouTube</a></Button>
              <Notice title="Pour regarder avec des sous-titres français">Activez les sous-titres du lecteur, puis ouvrez les paramètres → « Sous-titres ». Sélectionnez « Français » ou « Traduire automatiquement » → « Français » si YouTube propose cette option. Si elle n’apparaît pas ici, essayez le lien « Voir aussi sur YouTube ».</Notice>
              <Notice title="Ne reproduisez pas une vidéo publicitaire">Ces exemples montrent les preuves attendues. Votre propre vidéo doit être filmée sur place depuis votre fiche : pas de diaporama, de montage ou de vidéo envoyée à Adamkom.</Notice>
            </>}
          </div>}
          {step === 3 && <div className="space-y-6">
            <Evidence icon={Smartphone} title="Ouvrez votre fiche sur votre téléphone" text="Connectez-vous au bon compte Google et retrouvez votre entreprise dans la recherche Google ou Google Maps. Appuyez sur « Valider ». Si Google le demande, saisissez votre numéro de téléphone, puis « Suivant »." />
            <Evidence icon={Video} title="Choisissez « Vidéo sur votre établissement »" text="Appuyez sur « Suivant », lisez les exigences et autorisez si demandé la localisation, la caméra et le micro. Appuyez sur « Démarrer l’enregistrement », puis sur le bouton d’enregistrement." />
            <Evidence icon={MapPin} title="Filmez tout le parcours sans couper" text="Montrez dans une seule prise les repères de la rue, votre activité et votre accès professionnel. Gardez les inscriptions lisibles et vérifiez que les preuves se voient clairement. Ne montrez aucun visage d’une autre personne, numéro bancaire, fiscal, pièce d’identité ou information privée." />
            <Evidence icon={CheckCircle2} title="Vérifiez puis envoyez à Google" text="Arrêtez l’enregistrement quand toutes les preuves sont montrées. Relisez la vidéo et utilisez « Réessayer » s’il manque quelque chose. Appuyez ensuite sur « Mettre en ligne la vidéo » et laissez l’envoi se terminer." />
            <Button asChild className="h-auto whitespace-normal"><a href="https://business.google.com/" target="_blank" rel="noopener noreferrer">Ouvrir ma fiche Google <ExternalLink className="ml-2 h-4 w-4 shrink-0" /></a></Button>
          </div>}
          {step === 4 && <div className="space-y-6">
            <Notice title={`L’examen peut prendre jusqu’à ${GOOGLE_VIDEO_RULES.reviewBusinessDays} jours ouvrés`}>L’envoi ne signifie pas que votre fiche est validée. Attendez le résultat de Google : vous recevrez une notification si votre établissement est accepté.</Notice>
            <Evidence icon={Video} title="Si Google refuse la vidéo" text="Ouvrez votre fiche puis « Examiner les problèmes ». Lisez les raisons indiquées. Enregistrez une nouvelle vidéo complète, avec les preuves déjà présentes ET les éléments manquants. Envoyez cette nouvelle prise à Google." />
            <Evidence icon={Smartphone} title="Si la mise en ligne échoue" text="Google indique de tenter à nouveau la mise en ligne. Vérifiez votre connexion. Si vous restez bloqué ou qu’aucune méthode ne fonctionne, utilisez l’aide Google depuis votre fiche et contactez Adamkom pour être accompagné." />
            <Notice title="Vos données et la suppression de la vidéo">Google permet de supprimer la vidéo via « Plus » → « Paramètres de la fiche d’établissement » → « Paramètres avancés » → « Vidéos mises en ligne » → « Supprimer les vidéos ». Sinon, Google la supprimera ultérieurement. Une modification de votre fiche peut entraîner une nouvelle demande de validation.</Notice>
            <p className="leading-7">Prévenez Adamkom en répondant au mail reçu : précisez « vidéo envoyée », « fiche validée » ou le problème rencontré. Ne joignez ni vidéo ni mot de passe.</p>
          </div>}
        </section>
        <div className="mt-9 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
          <Button variant="outline" disabled={step === 0} onClick={() => move(step - 1)}><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Button>
          {step < steps.length - 1 && <Button onClick={() => move(step + 1)}>Continuer <ArrowRight className="ml-2 h-4 w-4" /></Button>}
        </div>
          </div>
        </div>
        <footer className="mt-10 space-y-3 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
          <p>Source : documentation officielle Google, consultée le 13 octobre 2026. Les options disponibles sur votre fiche font foi ; Google peut faire évoluer ses exigences.</p>
          <a href={GOOGLE_VIDEO_HELP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-primary underline">Lire toutes les exigences Google <ExternalLink className="h-4 w-4" /></a>
          <p>Adamkom by JJP · <a href="tel:0262666876" className="text-foreground">0262 66 68 76</a> · <a href="mailto:contact@adamkom.com" className="break-words text-foreground">contact@adamkom.com</a></p>
        </footer>
      </main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return <aside className="border-l-2 border-primary bg-muted/60 px-5 py-5"><h3 className="mb-2 font-semibold leading-6 text-foreground">{title}</h3><p className="text-sm leading-7 text-muted-foreground">{children}</p></aside>;
}

function Evidence({ icon: Icon, title, text }: { icon: typeof Video; title: string; text: string }) {
  return <div className="flex items-start gap-4 border-b border-border pb-6"><Icon className="mt-1 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><h3 className="mb-2 text-lg font-semibold leading-7">{title}</h3><p className="text-base leading-7 text-muted-foreground">{text}</p></div></div>;
}