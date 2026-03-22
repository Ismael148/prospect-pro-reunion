import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Politique de Confidentialité</h1>
        </div>

        <p className="text-muted-foreground mb-6">
          Dernière mise à jour : 22 mars 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p>
              La société <strong>Adamkom by JJP</strong> (ci-après « nous », « notre » ou « la Société »),
              éditrice de la plateforme accessible à l'adresse{" "}
              <a href="https://ai.adamkom.com" className="text-primary underline">ai.adamkom.com</a>,
              s'engage à protéger la vie privée de ses utilisateurs et des clients dont les données
              sont traitées via notre plateforme.
            </p>
            <p className="mt-2">
              La présente politique de confidentialité décrit les types de données que nous collectons,
              comment nous les utilisons, les stockons et les protégeons, conformément au{" "}
              <strong>Règlement Général sur la Protection des Données (RGPD)</strong> et à la{" "}
              <strong>loi n° 78-17 du 6 janvier 1978</strong> relative à l'informatique, aux fichiers et aux libertés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Données collectées</h2>
            <p>Nous collectons les catégories de données suivantes :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Données d'identification :</strong> nom, prénom, adresse e-mail, numéro de téléphone.</li>
              <li><strong>Données d'entreprise :</strong> raison sociale, SIRET, adresse, secteur d'activité.</li>
              <li><strong>Données de réseaux sociaux :</strong> identifiants de pages Facebook et Instagram,
                jetons d'accès (tokens), noms d'utilisateur, statistiques publiques des pages.</li>
              <li><strong>Données de navigation :</strong> adresse IP, type de navigateur, pages consultées.</li>
              <li><strong>Données de support :</strong> messages, pièces jointes envoyées via les formulaires de support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Utilisation des données Facebook et Instagram</h2>
            <p>
              Lorsque vous connectez vos comptes Facebook et/ou Instagram via notre plateforme,
              nous accédons aux données suivantes avec votre consentement explicite :
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Liste de vos pages Facebook</strong> (permission <code>pages_show_list</code>)</li>
              <li><strong>Statistiques d'engagement</strong> de vos pages (permission <code>pages_read_engagement</code>)</li>
              <li><strong>Publication de contenu</strong> sur vos pages (permission <code>pages_manage_posts</code>)</li>
              <li><strong>Accès basique à Instagram</strong> (permission <code>instagram_basic</code>)</li>
              <li><strong>Publication sur Instagram</strong> (permission <code>instagram_content_publish</code>)</li>
            </ul>
            <p className="mt-3">
              Ces données sont utilisées <strong>exclusivement</strong> pour :
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Gérer et programmer des publications sur vos pages au nom de votre entreprise.</li>
              <li>Afficher les statistiques de vos pages dans votre tableau de bord.</li>
              <li>Connecter des chatbots IA à vos pages pour améliorer votre service client.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Stockage et sécurité des données</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Les données sont stockées sur des serveurs sécurisés hébergés par notre fournisseur cloud.</li>
              <li>Les jetons d'accès Facebook/Instagram sont chiffrés et stockés de manière sécurisée.</li>
              <li>Les tokens expirent automatiquement après 60 jours et nécessitent une réautorisation.</li>
              <li>L'accès aux données est restreint aux utilisateurs authentifiés de notre plateforme.</li>
              <li>Nous utilisons le chiffrement TLS/SSL pour toutes les communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Partage des données</h2>
            <p>
              Nous ne vendons, ne louons et ne partageons <strong>aucune donnée personnelle</strong> avec
              des tiers à des fins commerciales. Les données peuvent être partagées uniquement avec :
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Meta Platforms, Inc.</strong> : dans le cadre de l'utilisation des API Facebook et Instagram.</li>
              <li><strong>Nos prestataires techniques</strong> : hébergement et infrastructure (sous contrat de sous-traitance conforme au RGPD).</li>
              <li><strong>Autorités compétentes</strong> : en cas d'obligation légale.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes.</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données.</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données.</li>
              <li><strong>Droit de retrait du consentement :</strong> retirer votre consentement à tout moment.</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, contactez-nous à :{" "}
              <a href="mailto:contact@adamkom.com" className="text-primary underline">contact@adamkom.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Suppression des données</h2>
            <p>
              Vous pouvez à tout moment révoquer l'accès de notre application à vos comptes Facebook
              et Instagram depuis les paramètres de votre compte Facebook :{" "}
              <a
                href="https://www.facebook.com/settings?tab=business_tools"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Paramètres &gt; Applications et sites web
              </a>.
            </p>
            <p className="mt-2">
              Suite à la révocation, nous supprimerons vos jetons d'accès et données associées
              dans un délai de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p>
              Notre plateforme utilise des cookies strictement nécessaires au fonctionnement du service
              (authentification, session utilisateur). Aucun cookie publicitaire ou de suivi n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
            <p>
              Pour toute question relative à cette politique de confidentialité :
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li><strong>Société :</strong> Adamkom by JJP</li>
              <li><strong>E-mail :</strong>{" "}
                <a href="mailto:contact@adamkom.com" className="text-primary underline">contact@adamkom.com</a>
              </li>
              <li><strong>Site :</strong>{" "}
                <a href="https://ai.adamkom.com" className="text-primary underline">ai.adamkom.com</a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Adamkom by JJP — Tous droits réservés
        </div>
      </div>
    </div>
  );
};

export default Privacy;
