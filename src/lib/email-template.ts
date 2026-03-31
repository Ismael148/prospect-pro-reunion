// ── Shared Adamkom branded email template ──────────────────────────────
// Used across ALL email sending: campaigns, client emails, deliverables, invoices

export const BRAND_COLOR = "#ff006e";
export const BRAND_DARK = "#b8004a";
export const LOGO_URL = "https://ai.adamkom.com/lovable-uploads/d6c24753-6c76-49a3-8a6d-fe0dd4a898be.png";

/**
 * Wraps any email body HTML in the unified Adamkom branded template.
 * @param bodyHtml - The inner content of the email
 * @param supportLink - Optional client support ticket URL
 */
export function wrapInBrandedTemplate(bodyHtml: string, supportLink?: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06)">
  <!-- HEADER -->
  <div style="padding:40px 40px 32px;text-align:center;background:#ffffff">
    <img src="${LOGO_URL}" alt="Adamkom" style="height:72px;width:auto;display:block;margin:0 auto 12px" />
    <p style="margin:0;font-size:13px;color:#71717a;letter-spacing:0.5px">La performance digitale pour votre entreprise</p>
  </div>
  <!-- ACCENT BAR -->
  <div style="height:3px;background:linear-gradient(90deg,${BRAND_COLOR},#ff5c8a,${BRAND_COLOR})"></div>
  <!-- BODY -->
  <div style="padding:40px 40px 32px;line-height:1.8;font-size:15px;color:#27272a">
    ${bodyHtml}
  </div>
  <!-- SUPPORT SECTION -->
  ${supportLink ? `<div style="margin:0 40px 32px;padding:24px;background:#fff0f6;border-radius:12px;border:1px solid #ffe0ec">
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${BRAND_DARK}">📋 Besoin d'une modification ?</p>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.6">Chez <strong>Adamkom</strong>, toutes vos demandes de modifications passent par notre système de ticket support. C'est le moyen le plus rapide et le plus efficace pour être pris en charge.</p>
    <div style="text-align:center">
      <a href="${supportLink}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(255,0,110,0.3)">📋 Ouvrir un ticket support</a>
    </div>
  </div>` : ''}
  <!-- FOOTER -->
  <div style="padding:28px 40px;border-top:1px solid #f0f0f0;background:#fafafa;text-align:center">
    <p style="margin:0 0 8px;font-size:14px;color:${BRAND_DARK}"><strong>Adamkom</strong> — La performance digitale</p>
    <p style="margin:0 0 4px;font-size:13px;color:#71717a">📞 <a href="tel:0262666876" style="color:${BRAND_COLOR};text-decoration:none;font-weight:600">0262 66 68 76</a></p>
    <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa">© ${new Date().getFullYear()} Adamkom by JJP — La Réunion 🇷🇪</p>
  </div>
</div>`;
}

/**
 * Creates a styled CTA button for use inside email body content.
 */
export function makeCta(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0">
    <a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(255,0,110,0.3)">${text}</a>
  </div>`;
}
