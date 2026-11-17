// Pack Décollage presentation email: one builder shared by the preview and the sent message.
import { BRAND_COLOR, type EmailBrandingConfig } from "@/lib/email-template";

export const DECOLLAGE_PACK = "pack_decollage";
export const DECOLLAGE_SITE_URL = "https://decollage.adamkom.com/";
export const DECOLLAGE_ASSETS = "https://decollage.adamkom.com/assets/email";
export const DECOLLAGE_EXAMPLE_URL = "https://trou-beach.adamkom.com/";
export const DECOLLAGE_EMAIL_TRIGGER = "pack_decollage";
export const DECOLLAGE_SUPPORT_TRIGGER = "support_link";
export const AGENCY_PHONE = "0262 66 68 76";
export const AGENCY_EMAIL = "contact@adamkom.com";
const WHATSAPP_DISPLAY = "06 93 80 22 01";
const WHATSAPP_URL = "https://wa.me/262693802201?text=Bonjour%20Adamkom%20by%20JJP%2C%20je%20souhaite%20lancer%20mon%20essai%20Pack%20D%C3%A9collage.";

export const DECOLLAGE_SERVICES = [
  { title: "Page de conversion", text: "Prix, offres du mois, promotions : une page qui vend." },
  { title: "Appels sortants", text: "Démarchage, relance des devis, rappel de vos clients." },
  { title: "Support client", text: "Une voix pour vos voyageurs, avant et après le départ." },
  { title: "Contenus réseaux", text: "Posts et vidéos qui donnent envie de réserver. Nous ne gérons pas vos comptes." },
  { title: "Fiche Google", text: "Optimisée pour donner envie d'appeler." },
  { title: "Visibilité IA", text: "Remonter sur Google et dans les réponses des assistants IA." },
  { title: "Entreprises 974", text: "Référencement parmi plus de 550 entreprises réunionnaises." },
  { title: "Carte NFC", text: "Votre carte de visite intelligente.", badge: "Offerte" },
];

export interface DecollageEmailFields {
  name?: string | null;
  subject?: string;
  kicker: string;
  intro: string;
  ctaLabel: string;
  presentationUrl: string;
  note?: string;
  price: string;
  priceText: string;
  questions: string;
  footer: string;
  includeWhatsapp?: boolean;
}

export const defaultDecollageSubject = (name?: string | null) =>
  name?.trim() ? `${name.trim()}, la présentation Pack Décollage que vous avez demandée` : "La présentation Pack Décollage que vous avez demandée";

export const DECOLLAGE_DEFAULTS: Omit<DecollageEmailFields, "name" | "subject"> = {
  kicker: "Comme convenu",
  intro: "Merci de votre intérêt. Voici Pack Décollage, notre forfait tout-en-un pensé pour les agences de voyage : votre page de vente, les appels clients, les contenus et votre visibilité, réunis chez un seul partenaire. Fini les plateformes complexes et les tâches qui avalent vos journées.",
  ctaLabel: "Découvrir la présentation →",
  presentationUrl: DECOLLAGE_SITE_URL,
  note: "",
  price: "2 250 €",
  priceText: "15 jours d'essai pour voir concrètement comment nous optimisons tout pour vous. Carte NFC offerte avec le forfait.",
  questions: "Des questions ? Écrivez-nous sur WhatsApp, répondez à cet e-mail ou appelez-nous. On s'occupe de lancer vos 15 jours d'essai.",
  footer: "Pack Décollage est un service Adamkom by JJP. Prix TTC, tout inclus. Offre d'essai de 15 jours.",
  includeWhatsapp: true,
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
/** Only http(s) links are kept; anything else falls back to the presentation page. */
export const safeUrl = (u: string, fallback = DECOLLAGE_SITE_URL) => (/^https?:\/\/\S+$/i.test(u.trim()) ? esc(u.trim()) : fallback);
const paragraphs = (text: string, style: string) =>
  text.trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="${style}">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'Courier New',Courier,monospace";

function serviceCell(i: number) {
  const s = DECOLLAGE_SERVICES[i];
  const left = i % 2 === 0;
  const badge = s.badge ? ` <span style="background:#D10866;color:#ffffff;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border-radius:10px;vertical-align:2px;">${s.badge}</span>` : "";
  return `<td class="col col-pad" width="50%" valign="top" style="padding:${left ? "0 14px 18px 0" : "0 0 18px 14px"};">
<span style="font-family:${MONO};font-size:12px;color:#D10866;">${String(i + 1).padStart(2, "0")}</span><br>
<strong style="font-size:16px;letter-spacing:-.3px;">${s.title}${badge}</strong><br>
<span style="font-size:14px;line-height:20px;color:#55555a;">${s.text}</span></td>`;
}

function supportBlock(link: string, branding?: EmailBrandingConfig) {
  const title = branding?.support_cta_title || "📋 Besoin d'une modification ?";
  const text = branding?.support_cta_text || "Chez <strong>Adamkom</strong>, toutes vos demandes de modifications passent par notre système de ticket support. C'est le moyen le plus rapide et le plus efficace pour être pris en charge.";
  const button = branding?.support_cta_button || "📋 Ouvrir un ticket support";
  return `<!-- SUPPORT DECOLLAGE -->
<tr><td class="px" bgcolor="#F3EFE8" style="background:#F3EFE8;padding:0 44px 36px 44px;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #ecd5df;border-radius:14px;">
<tr><td style="padding:22px 24px;">
<p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0A0A0B;">${title}</p>
<p style="margin:0 0 16px 0;font-size:14px;line-height:21px;color:#55555a;">${text}</p>
<a href="${esc(link)}" target="_blank" style="display:inline-block;background:#D10866;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:700;line-height:44px;height:44px;padding:0 26px;border-radius:30px;">${button}</a>
</td></tr></table>
</td></tr>`;
}

export function buildDecollageEmail(f: DecollageEmailFields, opts: { supportLink?: string | null; includeSupport?: boolean; branding?: EmailBrandingConfig } = {}) {
  const name = f.name?.trim();
  const url = safeUrl(f.presentationUrl);
  const subject = f.subject?.trim() || defaultDecollageSubject(name);
  const body = "margin:0 0 14px 0;font-size:16px;line-height:25px;color:#26262a;";
  const rows = [0, 2, 4, 6].map((i) => `<tr>${serviceCell(i)}${serviceCell(i + 1)}</tr>`).join("\n");
  const contactLine = f.includeWhatsapp
    ? `<a href="tel:+262262666876" style="color:#26262a;text-decoration:none;">${AGENCY_PHONE}</a> &middot; <a href="https://wa.me/262693802201" style="color:#26262a;text-decoration:none;">WhatsApp ${WHATSAPP_DISPLAY}</a>`
    : `<a href="tel:+262262666876" style="color:#26262a;text-decoration:none;">${AGENCY_PHONE}</a>`;
  const contactButton = f.includeWhatsapp
    ? `<a href="${WHATSAPP_URL}" target="_blank" class="btn-full" style="display:inline-block;background:#25D366;color:#06280f;font-family:${FONT};font-size:16px;font-weight:700;line-height:54px;height:54px;padding:0 30px;border-radius:30px;text-align:center;">Écrire sur WhatsApp &middot; ${WHATSAPP_DISPLAY}</a>`
    : `<a href="tel:+262262666876" class="btn-full" style="display:inline-block;background:#0A0A0B;color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;line-height:54px;height:54px;padding:0 30px;border-radius:30px;text-align:center;">Appeler le ${AGENCY_PHONE}</a>`;
  const support = opts.includeSupport && opts.supportLink ? supportBlock(opts.supportLink, opts.branding) : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Pack Décollage — Le forfait tout-en-un des agences de voyage</title>
<style>
  body{margin:0!important;padding:0!important;width:100%!important;background:#0A0A0B}
  table{border-collapse:collapse}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
  a{text-decoration:none}
  @media only screen and (max-width:620px){
    .wrap{width:100%!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .col{display:block!important;width:100%!important}
    .col-pad{padding:0 0 14px 0!important}
    .h1{font-size:30px!important;line-height:34px!important}
    .price{font-size:52px!important}
    .btn-full{width:100%!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0A0A0B;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#0A0A0B;">Page de conversion, appels, contenus, Google, IA, carte NFC offerte : ${esc(f.price)} TTC tout inclus, 15 jours d'essai.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0A0B" style="background:#0A0A0B;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<tr><td style="padding:0;background:#0A0A0B;">
<a href="${url}" target="_blank" style="display:block;"><img src="${DECOLLAGE_ASSETS}/banner.gif" width="600" alt="Pack Décollage — par Adamkom by JJP. Pour les agences de voyage." style="display:block;width:100%;max-width:600px;height:auto;background:#0A0A0B;color:#F3EFE8;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;"></a>
</td></tr>

<tr><td class="px" bgcolor="#F3EFE8" style="background:#F3EFE8;padding:44px 44px 12px 44px;font-family:${FONT};color:#0A0A0B;">
${f.kicker.trim() ? `<p style="margin:0 0 14px 0;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D10866;">&mdash;&nbsp; ${esc(f.kicker.trim())}</p>` : ""}
<h1 class="h1" style="margin:0 0 22px 0;font-family:${FONT};font-size:38px;line-height:40px;font-weight:700;letter-spacing:-1.5px;color:#0A0A0B;">Vous vendez le voyage.<br><span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:400;letter-spacing:-.5px;color:#D10866;">On s'occupe du reste.</span></h1>
<p style="${body}">Bonjour${name ? ` ${esc(name)}` : ""},</p>
${paragraphs(f.intro, body)}
${f.note?.trim() ? paragraphs(f.note, body) : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 10px 0;"><tr><td>
<a href="${url}" target="_blank" class="btn-full" style="display:inline-block;background:#D10866;color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;line-height:54px;height:54px;padding:0 32px;border-radius:30px;text-align:center;">${esc(f.ctaLabel.trim() || DECOLLAGE_DEFAULTS.ctaLabel)}</a>
</td></tr></table>
<p style="margin:0 0 40px 0;font-size:13px;line-height:20px;color:#6b6b70;">Une page animée, 2 minutes de lecture. Ouvrez-la sur ordinateur ou sur mobile.</p>
</td></tr>

<tr><td class="px" bgcolor="#F3EFE8" style="background:#F3EFE8;padding:0 44px 14px 44px;font-family:${FONT};color:#0A0A0B;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #0A0A0B;"><tr><td style="padding:14px 0 18px 0;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b6b70;">Tout est dans le forfait &mdash; 8 prestations</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows}
</table>
<p style="margin:6px 0 34px 0;font-size:14px;line-height:21px;color:#55555a;">Un exemple de page de conversion, en ligne&nbsp;: <a href="${DECOLLAGE_EXAMPLE_URL}" target="_blank" style="color:#D10866;font-weight:700;text-decoration:underline;">voir la page The Trou Beach Hotel</a>.</p>
</td></tr>

<tr><td class="px" bgcolor="#0A0A0B" style="background:#0A0A0B;padding:40px 44px;font-family:${FONT};color:#F3EFE8;border-top:4px solid #D10866;">
<p style="margin:0 0 10px 0;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#FF3C94;">Un prix. Tout est dedans.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="price" valign="bottom" style="font-size:64px;line-height:64px;font-weight:700;letter-spacing:-3px;color:#F3EFE8;padding:0 14px 0 0;white-space:nowrap;">${esc(f.price.trim() || DECOLLAGE_DEFAULTS.price).replace(/ /g, "&nbsp;")}</td>
<td valign="bottom" style="font-family:${MONO};font-size:12px;line-height:18px;letter-spacing:1.5px;text-transform:uppercase;color:#bdb9b0;padding:0 0 6px 0;">TTC<br>Tout inclus</td>
</tr></table>
${paragraphs(f.priceText, "margin:20px 0 0 0;font-size:16px;line-height:25px;color:#e4e0d8;")}
</td></tr>

<tr><td class="px" bgcolor="#F3EFE8" style="background:#F3EFE8;padding:40px 44px 36px 44px;font-family:${FONT};color:#0A0A0B;">
${paragraphs(f.questions, "margin:0 0 22px 0;font-size:16px;line-height:25px;color:#26262a;")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;"><tr><td>${contactButton}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px 0;"><tr><td>
<a href="${url}" target="_blank" class="btn-full" style="display:inline-block;background:#F3EFE8;color:#0A0A0B;border:1.5px solid #0A0A0B;font-family:${FONT};font-size:15px;font-weight:700;line-height:47px;height:47px;padding:0 28px;border-radius:30px;text-align:center;">Revoir la présentation</a>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #cfc9bd;"><tr>
<td width="86" valign="middle" style="padding:22px 18px 0 0;"><img src="${DECOLLAGE_ASSETS}/logo-dark-email.png" width="86" alt="Adamkom by JJP" style="display:block;width:86px;height:auto;"></td>
<td valign="middle" style="padding:22px 0 0 0;font-size:14px;line-height:21px;color:#26262a;">
<strong style="font-size:15px;">L'équipe Adamkom by JJP</strong><br>
${contactLine}<br>
<a href="mailto:${AGENCY_EMAIL}" style="color:#D10866;font-weight:700;text-decoration:none;">${AGENCY_EMAIL}</a>
</td></tr></table>
</td></tr>
${support}
<tr><td class="px" bgcolor="#0A0A0B" style="background:#0A0A0B;padding:26px 44px 40px 44px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#8d8a84;text-align:center;">
${esc(f.footer.trim() || DECOLLAGE_DEFAULTS.footer)}<br>
Vous recevez ce message car vous avez demandé notre présentation.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
  return { subject, html };
}

/** Support-link email body (wrapped by the shared branded template, whose support block holds the button). */
export const DEFAULT_SUPPORT_INTRO =
  "Pour toute demande concernant votre Pack Décollage (modification, question, problème), voici votre lien personnel pour nous envoyer un ticket support. Votre demande arrive directement à notre équipe et vous êtes informé de son suivi.";

export function buildDecollageSupportEmail(input: { name?: string | null; intro: string; note?: string }) {
  const name = input.name?.trim();
  const p = "margin:0 0 20px";
  return {
    subject: "Votre lien support — Pack Décollage",
    body: `<p style="${p}">Bonjour${name ? ` <strong>${esc(name)}</strong>` : ""},</p>
${paragraphs(input.intro, p)}
${input.note?.trim() ? paragraphs(input.note, p) : ""}
<p style="margin:0">À très bientôt,<br><strong style="color:${BRAND_COLOR}">L'équipe Adamkom by JJP</strong></p>`,
  };
}
