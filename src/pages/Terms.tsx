import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => {
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
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Conditions Générales d'Utilisation</h1>
        </div>

        <p className="text-muted-foreground mb-6">
          Dernière mise à jour : 22 mars 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès
              et l'utilisation de la plateforme <strong>Adamkom</strong>, éditée par la société{" "}
              <strong>Adamkom by JJP</strong>, accessible à l'adresse{" "}
              <a href="https://ai.adamkom.com" className="text-primary underline">ai.adamkom.com</a>.
            </p>
            <p className="mt-2">
              La plateforme est un outil de gestion commerciale et de marketing digital permettant
              la gestion de clients, projets, facturation, prospection et réseaux sociaux.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Acceptation des CGU</h2>
            <p>
              L'accès et l'utilisation de la plateforme impliquent l'acceptation pleine et entière
              des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser
              la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Inscription et compte utilisateur</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>L'accès à la plateforme nécessite la création d'un compte utilisateur.</li>
              <li>Vous devez fournir des informations exactes et à jour lors de votre inscription.</li>
              <li>Vous êtes responsable de la confidentialité de vos identifiants de connexion.</li>
              <li>Tout accès à votre compte avec vos identifiants est réputé effectué par vous.</li>
              <li>Vous devez nous informer immédiatement de toute utilisation non autorisée de votre compte.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Services proposés</h2>
            <p>La plateforme offre les fonctionnalités suivantes :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Gestion de clients :</strong> suivi du pipeline commercial, fiches clients détaillées.</li>
              <li><strong>Gestion de projets :</strong> suivi des tâches, livrables et échéances.</li>
              <li><strong>Prospection :</strong> recherche et qualification de prospects.</li>
              <li><strong>Facturation :</strong> création et gestion de factures.</li>
              <li><strong>Réseaux sociaux :</strong> connexion et gestion de pages Facebook et Instagram
                via les API Meta, programmation de publications.</li>
              <li><strong>Support client :</strong> gestion de tickets de support.</li>
              <li><strong>Commissions :</strong> calcul et suivi des commissions commerciales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Utilisation des API Meta (Facebook/Instagram)</h2>
            <p>En utilisant les fonctionnalités liées à Facebook et Instagram, vous acceptez :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>De respecter les{" "}
                <a
                  href="https://developers.facebook.com/terms/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Conditions d'utilisation de la plateforme Meta
                </a>.
              </li>
              <li>De ne pas utiliser les données collectées à des fins non autorisées.</li>
              <li>Que l'accès aux pages est accordé par le propriétaire légitime de ces pages.</li>
              <li>Que nous agissons en tant que mandataire pour la gestion de vos pages.</li>
              <li>Que vous pouvez révoquer l'accès à tout moment via les paramètres Facebook.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Obligations de l'utilisateur</h2>
            <p>L'utilisateur s'engage à :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Utiliser la plateforme conformément aux lois en vigueur.</li>
              <li>Ne pas tenter d'accéder aux données d'autres utilisateurs.</li>
              <li>Ne pas utiliser la plateforme pour diffuser du contenu illicite, diffamatoire ou trompeur.</li>
              <li>Ne pas effectuer d'actions susceptibles de compromettre la sécurité de la plateforme.</li>
              <li>Respecter les droits de propriété intellectuelle de tiers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments de la plateforme (design, code, textes, logos, fonctionnalités)
              sont la propriété exclusive d'<strong>Adamkom by JJP</strong> et sont protégés par le
              droit de la propriété intellectuelle. Toute reproduction, même partielle, est interdite
              sans autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Responsabilité</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>La plateforme est fournie « en l'état ». Nous ne garantissons pas un fonctionnement
                ininterrompu ou exempt d'erreurs.</li>
              <li>Nous ne sommes pas responsables des dommages résultant de l'utilisation ou de
                l'impossibilité d'utiliser la plateforme.</li>
              <li>Nous ne sommes pas responsables du contenu publié par les utilisateurs sur les
                réseaux sociaux via notre plateforme.</li>
              <li>Nous nous réservons le droit de suspendre ou interrompre le service pour maintenance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Tarification</h2>
            <p>
              Les conditions tarifaires sont communiquées séparément. La Société se réserve le droit
              de modifier ses tarifs à tout moment, avec un préavis raisonnable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Résiliation</h2>
            <p>
              L'utilisateur peut demander la suppression de son compte à tout moment en contactant
              le support. La Société se réserve le droit de suspendre ou résilier un compte en cas
              de violation des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Droit applicable et juridiction</h2>
            <p>
              Les présentes CGU sont régies par le droit français. Tout litige relatif à
              l'interprétation ou l'exécution des présentes sera soumis aux tribunaux compétents
              de La Réunion (France).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <ul className="list-none space-y-1">
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

export default Terms;
