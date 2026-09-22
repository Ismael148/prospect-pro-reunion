import { useSearchParams, Link } from "react-router-dom";
import { BarChart3, ExternalLink, Copy, CheckCircle2, ShieldCheck, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";
import { TutoFAQ, type FAQItem } from "@/components/tuto/TutoFAQ";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary font-medium hover:underline inline-flex items-center gap-1"
    >
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

const FAQ: FAQItem[] = [
  {
    q: "Qu'est-ce que Google Analytics exactement ?",
    a: "C'est l'outil <strong>gratuit de Google</strong> qui vous dit combien de personnes visitent votre site, d'où elles viennent (Google, Facebook, Instagram…), quelles pages elles regardent et combien de temps elles restent.",
  },
  {
    q: "Ai-je besoin d'un compte spécial ?",
    a: "Non. Votre <strong>adresse Gmail habituelle suffit</strong>. Google Analytics est directement relié à votre compte Google : vous vous connectez avec votre Gmail et c'est tout.",
  },
  {
    q: "Dois-je vous donner mon mot de passe Gmail ?",
    a: "<strong>Jamais.</strong> Vous restez propriétaire du compte. Si vous souhaitez qu'on vous aide, vous nous ajoutez simplement comme <strong>utilisateur</strong> avec notre email — et vous pouvez nous retirer à tout moment.",
  },
  {
    q: "C'est quoi l'identifiant de mesure « G-XXXXXXX » ?",
    a: "C'est le code unique de votre site. C'est la <strong>seule information</strong> dont nous avons besoin pour brancher les statistiques sur votre site internet. Copiez-le et envoyez-le nous.",
  },
  {
    q: "Combien de temps avant de voir mes premiers chiffres ?",
    a: "Les visites en direct apparaissent en <strong>quelques minutes</strong> dans le rapport « Temps réel ». Les rapports complets se remplissent sous <strong>24 à 48h</strong>.",
  },
  {
    q: "Est-ce que c'est payant ?",
    a: "Non, Google Analytics 4 est <strong>100% gratuit</strong> pour une utilisation normale d'entreprise.",
  },
  {
    q: "Puis-je consulter mes statistiques depuis mon téléphone ?",
    a: "Oui. Téléchargez l'application <strong>Google Analytics</strong> sur l'App Store ou Google Play et connectez-vous avec le même Gmail.",
  },
];

export default function TutoGoogleAnalytics() {
  const [params] = useSearchParams();
  const site = params.get("site") || "";
  const company = params.get("company") || "";

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Connectez-vous avec votre adresse Gmail",
      body: (
        <>
          Ouvrez <Ext href="https://analytics.google.com/">analytics.google.com</Ext> et connectez-vous
          avec <strong>votre adresse Gmail habituelle</strong> (celle que vous utilisez tous les jours).
          Si vous n'avez pas encore de compte Google, créez-le gratuitement sur{" "}
          <Ext href="https://accounts.google.com/signup">accounts.google.com</Ext>.
        </>
      ),
    },
    {
      title: "Créez votre compte Analytics",
      body: (
        <>
          Cliquez sur <strong>Commencer la mesure</strong> (ou <strong>Admin → Créer → Compte</strong>).
          Dans « Nom du compte », mettez le nom de votre entreprise
          {company ? ` : ${company}` : ""}. Laissez les cases de partage de données cochées par défaut,
          puis <strong>Suivant</strong>.
        </>
      ),
    },
    {
      title: "Renseignez votre propriété",
      body: (
        <>
          Nom de la propriété : le nom de votre site. Choisissez <strong>Fuseau horaire : (GMT+04:00) La Réunion</strong>{" "}
          et <strong>Devise : Euro (€)</strong>. Puis renseignez votre secteur d'activité et la taille de
          l'entreprise.
        </>
      ),
    },
    {
      title: "Choisissez « Web » comme plateforme",
      body: (
        <>
          À l'étape « Commencer à collecter des données », cliquez sur <strong>Web</strong>. Indiquez
          l'adresse de votre site {site ? <strong>{site}</strong> : <em>(ex : monentreprise.re)</em>} et
          donnez un nom au flux (ex : « Site principal »), puis <strong>Créer le flux</strong>.
        </>
      ),
    },
    {
      title: "Copiez votre identifiant de mesure",
      body: (
        <>
          Google affiche alors un identifiant du type <strong>G-XXXXXXXXXX</strong> en haut à droite.
          <strong> Copiez-le</strong> : c'est la seule information à nous transmettre pour que les
          statistiques fonctionnent sur votre site.
        </>
      ),
    },
    {
      title: "Envoyez-nous l'identifiant (et l'accès si vous voulez)",
      body: (
        <>
          Répondez simplement à notre email avec votre identifiant <strong>G-…</strong>. Si vous
          souhaitez qu'on suive vos statistiques avec vous, ajoutez-nous dans{" "}
          <strong>Admin → Gestion des accès</strong> → <strong>+ Ajouter des utilisateurs</strong> →{" "}
          <code>contact@adamkom.com</code> avec le rôle <strong>Lecteur</strong> ou{" "}
          <strong>Éditeur</strong>.
        </>
      ),
    },
    {
      title: "Vérifiez que ça fonctionne",
      body: (
        <>
          Ouvrez votre site sur votre téléphone, puis dans Analytics allez dans{" "}
          <strong>Rapports → Temps réel</strong>. Vous devez voir « 1 utilisateur actif ». Bravo, votre
          suivi est en place 🎉
        </>
      ),
    },
  ];

  return (
    <div className="tuto-light min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Adamkom" className="h-8 w-auto" />
            <span className="font-display font-bold text-lg hidden sm:inline">Adamkom</span>
          </Link>
          <Badge variant="secondary" className="gap-1">
            <BarChart3 className="h-3 w-3" />
            Google Analytics
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Créez votre Google Analytics en 10 minutes
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Suivez les visites de votre site {site ? <strong>{site}</strong> : "internet"} depuis votre
            propre compte Gmail. Gratuit, et vous en restez le seul propriétaire.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 mb-8 flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Aucun mot de passe à nous communiquer. Vous créez le compte avec votre Gmail, vous nous
            envoyez uniquement l'identifiant <strong>G-XXXXXXXXXX</strong>, et vous pouvez nous donner
            (ou retirer) l'accès en 2 clics quand vous le souhaitez.
          </p>
        </div>

        <ol className="space-y-3 mb-10">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 sm:p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {i + 1}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold mb-1">{s.title}</h2>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 sm:p-7 mb-10">
          <h2 className="text-xl font-display font-bold mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Ce que vous devez nous envoyer
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Copiez ce modèle de réponse, complétez-le et envoyez-le à contact@adamkom.com.
          </p>
          <pre className="rounded-xl bg-muted/50 p-4 text-xs sm:text-sm whitespace-pre-wrap">
{`Bonjour,

Mon compte Google Analytics est créé.
Identifiant de mesure : G-..........
Email Gmail utilisé : ..........@gmail.com
${site ? `Site concerné : ${site}` : "Site concerné : .........."}

Merci !`}
          </pre>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                navigator.clipboard.writeText(
                  `Bonjour,\n\nMon compte Google Analytics est créé.\nIdentifiant de mesure : G-..........\nEmail Gmail utilisé : ..........@gmail.com\nSite concerné : ${site || ".........."}\n\nMerci !`
                );
                toast.success("Modèle copié");
              }}
            >
              <Copy className="h-4 w-4" /> Copier le modèle
            </Button>
            <Button asChild className="gap-2">
              <a href="mailto:contact@adamkom.com?subject=Mon%20identifiant%20Google%20Analytics">
                <Mail className="h-4 w-4" /> Nous envoyer l'identifiant
              </a>
            </Button>
          </div>
        </div>

        <TutoFAQ items={FAQ} />
      </main>

      <footer className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          Besoin d'aide ? Contactez-nous à{" "}
          <a href="mailto:contact@adamkom.com" className="text-primary hover:underline">
            contact@adamkom.com
          </a>{" "}
          — 0262 66 68 76
        </p>
      </footer>
    </div>
  );
}
