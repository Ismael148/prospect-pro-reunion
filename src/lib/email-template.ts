// ── Shared Adamkom branded email template ──────────────────────────────
// Used across ALL email sending: campaigns, client emails, deliverables, invoices

export const BRAND_COLOR = "#ff006e";
export const BRAND_DARK = "#b8004a";
export const LOGO_URL = "https://ai.adamkom.com/lovable-uploads/d6c24753-6c76-49a3-8a6d-fe0dd4a898be.png";

export interface EmailBrandingConfig {
  logo_url?: string;
  slogan?: string;
  brand_color?: string;
  footer_company?: string;
  footer_tagline?: string;
  footer_phone?: string;
  footer_copyright?: string;
  support_cta_title?: string;
  support_cta_text?: string;
  support_cta_button?: string;
}

/**
 * Wraps any email body HTML in the unified Adamkom branded template.
 * @param bodyHtml - The inner content of the email
 * @param supportLink - Optional client support ticket URL
 * @param branding - Optional branding overrides from DB
 */
export function wrapInBrandedTemplate(bodyHtml: string, supportLink?: string, branding?: EmailBrandingConfig): string {
  const logoUrl = branding?.logo_url || LOGO_URL;
  const slogan = branding?.slogan || "La performance digitale pour votre entreprise";
  const color = branding?.brand_color || BRAND_COLOR;
  const dark = darkenColor(color);
  const footerCompany = branding?.footer_company || "Adamkom";
  const footerTagline = branding?.footer_tagline || "La performance digitale";
  const footerPhone = branding?.footer_phone || "0262 66 68 76";
  const footerCopyright = branding?.footer_copyright || "Adamkom by JJP — La Réunion 🇷🇪";
  const ctaTitle = branding?.support_cta_title || "📋 Besoin d'une modification ?";
  const ctaText = branding?.support_cta_text || "Chez <strong>Adamkom</strong>, toutes vos demandes de modifications passent par notre système de ticket support. C'est le moyen le plus rapide et le plus efficace pour être pris en charge.";
  const ctaButton = branding?.support_cta_button || "📋 Ouvrir un ticket support";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06)">
  <!-- HEADER -->
  <div style="padding:40px 40px 32px;text-align:center;background:#ffffff">
    <img src="${logoUrl}" alt="${footerCompany}" style="height:72px;width:auto;display:block;margin:0 auto 12px" />
    <p style="margin:0;font-size:13px;color:#71717a;letter-spacing:0.5px">${slogan}</p>
  </div>
  <!-- ACCENT BAR -->
  <div style="height:3px;background:linear-gradient(90deg,${color},#ff5c8a,${color})"></div>
  <!-- BODY -->
  <div style="padding:40px 40px 32px;line-height:1.8;font-size:15px;color:#27272a">
    ${bodyHtml}
  </div>
  <!-- SUPPORT SECTION -->
  ${supportLink ? `<div style="margin:0 40px 32px;padding:24px;background:#fff0f6;border-radius:12px;border:1px solid #ffe0ec">
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${dark}">${ctaTitle}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.6">${ctaText}</p>
    <div style="text-align:center">
      <a href="${supportLink}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(255,0,110,0.3)">${ctaButton}</a>
    </div>
  </div>` : ''}
  <!-- FOOTER -->
  <div style="padding:28px 40px;border-top:1px solid #f0f0f0;background:#fafafa;text-align:center">
    <p style="margin:0 0 8px;font-size:14px;color:${dark}"><strong>${footerCompany}</strong> — ${footerTagline}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#71717a">📞 <a href="tel:${footerPhone.replace(/\s/g, '')}" style="color:${color};text-decoration:none;font-weight:600">${footerPhone}</a></p>
    <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa">© ${new Date().getFullYear()} ${footerCopyright}</p>
  </div>
</div>`;
}

/**
 * Creates a styled CTA button for use inside email body content.
 */
export function makeCta(text: string, url: string, brandColor?: string): string {
  const color = brandColor || BRAND_COLOR;
  return `<div style="text-align:center;margin:28px 0">
    <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(255,0,110,0.3)">${text}</a>
  </div>`;
}

/** Simple hex color darkener */
function darkenColor(hex: string): string {
  try {
    const h = hex.replace("#", "");
    const r = Math.max(0, parseInt(h.substring(0, 2), 16) - 40);
    const g = Math.max(0, parseInt(h.substring(2, 4), 16) - 40);
    const b = Math.max(0, parseInt(h.substring(4, 6), 16) - 40);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return BRAND_DARK;
  }
}
