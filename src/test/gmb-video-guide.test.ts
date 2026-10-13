import { describe, it, expect } from "vitest";
import { hasGmbVideoGuide, GOOGLE_VIDEO_RULES, gmbVideoGuideUrl } from "@/lib/gmb-video-guide";

describe("GMB video guide rules", () => {
  it("is available only for Chip Tuning clients", () => {
    expect(hasGmbVideoGuide("star_bizness_tuning")).toBe(true);
    expect(hasGmbVideoGuide("star_bizness_nfc")).toBe(false);
    expect(hasGmbVideoGuide("star_bizness_numerik")).toBe(false);
    expect(hasGmbVideoGuide(null)).toBe(false);
  });
  it("uses Google's minimum 30-second recording requirement", () => {
    expect(GOOGLE_VIDEO_RULES.minimumSeconds).toBe(30);
  });
  it("uses Google's review period of up to five business days", () => {
    expect(GOOGLE_VIDEO_RULES.reviewBusinessDays).toBe(5);
  });
  it("preserves a company name containing URL delimiters", () => {
    expect(new URL(gmbVideoGuideUrl("Garage A&B #32")).searchParams.get("entreprise")).toBe("Garage A&B #32");
  });
});