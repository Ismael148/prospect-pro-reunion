type C = { id: string; company_name?: string | null; email?: string | null; phone?: string | null; pack_type?: string | null };

const OTHER_LISTS = ["star_bizness_nfc", "star_bizness_tuning"];

export const normName = (s?: string | null) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const normEmail = (s?: string | null) => (s || "").trim().toLowerCase();
export const normPhone = (s?: string | null) => {
  const d = (s || "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
};

/** IDs of 2.0 clients that duplicate a 1.0 (NFC) or Chip Tuning record by name, email or phone. */
export function findDuplicateIds(clients: C[]): Set<string> {
  const names = new Set<string>(), emails = new Set<string>(), phones = new Set<string>();
  for (const c of clients) {
    if (!OTHER_LISTS.includes(c.pack_type || "")) continue;
    const n = normName(c.company_name), e = normEmail(c.email), p = normPhone(c.phone);
    if (n) names.add(n); if (e) emails.add(e); if (p) phones.add(p);
  }
  const dup = new Set<string>();
  for (const c of clients) {
    if (OTHER_LISTS.includes(c.pack_type || "")) continue;
    const n = normName(c.company_name), e = normEmail(c.email), p = normPhone(c.phone);
    if ((n && names.has(n)) || (e && emails.has(e)) || (p && phones.has(p))) dup.add(c.id);
  }
  return dup;
}
