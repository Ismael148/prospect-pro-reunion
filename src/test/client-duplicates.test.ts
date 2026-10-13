import { describe, it, expect } from "vitest";
import { findDuplicateIds } from "@/lib/client-duplicates";
describe("findDuplicateIds", () => {
  it("flags 2.0 fiche matching a 1.0 by phone, not unrelated ones", () => {
    const ids = findDuplicateIds([
      { id: "a", company_name: "Le Jardin Fleuri", phone: "+262 692 00 65 53", pack_type: "star_bizness_nfc" },
      { id: "b", company_name: "Jardin", phone: "0692 00 65 53", pack_type: "star_bizness_numerik" },
      { id: "c", company_name: "Autre", phone: "0692 11 11 11", pack_type: "star_bizness_numerik" },
    ]);
    expect([...ids]).toEqual(["b"]);
  });
});
