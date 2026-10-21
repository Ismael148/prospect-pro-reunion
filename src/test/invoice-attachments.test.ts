import { afterEach, describe, expect, it, vi } from "vitest";
import { ADAMKOM_RIB_PATH, buildInvoiceAttachments } from "@/lib/invoice-attachments";

afterEach(() => vi.unstubAllGlobals());

describe("invoice RIB selection", () => {
  it("attaches only the invoice when RIB is unchecked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await buildInvoiceAttachments("FAC-2026-0097", "invoice-pdf", false)).toEqual([
      { name: "Facture_FAC-2026-0097.pdf", content: "invoice-pdf" },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("attaches the Adamkom RIB as a second PDF when checked", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4 test RIB");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes.buffer });
    vi.stubGlobal("fetch", fetchMock);
    const attachments = await buildInvoiceAttachments("FAC-2026-0097", "invoice-pdf", true);
    expect(fetchMock).toHaveBeenCalledWith(ADAMKOM_RIB_PATH);
    expect(attachments).toHaveLength(2);
    expect(attachments[1]).toEqual({ name: "RIB_Adamkom_by_JJP.pdf", content: btoa("%PDF-1.4 test RIB") });
  });

  it("stops sending if the selected RIB is unavailable or not a PDF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(buildInvoiceAttachments("FAC-1", "pdf", true)).rejects.toThrow("Aucun email");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new TextEncoder().encode("<html>").buffer }));
    await expect(buildInvoiceAttachments("FAC-1", "pdf", true)).rejects.toThrow("Aucun email");
  });
});