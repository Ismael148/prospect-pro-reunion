import { afterEach, describe, expect, it, vi } from "vitest";
import { buildQuoteAttachments } from "@/lib/quote-attachments";
import { ADAMKOM_RIB_PATH } from "@/lib/invoice-attachments";

const quotes = [
  { quote_number: "DEV-2026-0001", pdfBase64: "first-quote" },
  { quote_number: "DEV-2026-0002", pdfBase64: "second-quote" },
];

afterEach(() => vi.unstubAllGlobals());

describe("quote RIB selection", () => {
  it("attaches only the selected quotes when RIB is unchecked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await buildQuoteAttachments(quotes, false)).toEqual([
      { name: "Devis_DEV-2026-0001.pdf", content: "first-quote" },
      { name: "Devis_DEV-2026-0002.pdf", content: "second-quote" },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds one Adamkom RIB after all quote PDFs when checked", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4 test RIB");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes.buffer });
    vi.stubGlobal("fetch", fetchMock);

    const attachments = await buildQuoteAttachments(quotes, true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(ADAMKOM_RIB_PATH);
    expect(attachments).toHaveLength(3);
    expect(attachments[2]).toEqual({ name: "RIB_Adamkom_by_JJP.pdf", content: btoa("%PDF-1.4 test RIB") });
  });

  it("stops the quote email if the selected RIB cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(buildQuoteAttachments(quotes, true)).rejects.toThrow("Aucun email");
  });
});
