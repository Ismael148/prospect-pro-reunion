import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GmbVideoGuideSection from "@/components/clients/GmbVideoGuideSection";
import { PUBLISHED_URL } from "@/lib/constants";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/hooks/use-email-branding", () => ({ useEmailBranding: () => ({ data: undefined }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("GMB tutorial email personal support option", () => {
  async function send(includeSupport: boolean) {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    render(<GmbVideoGuideSection clientId="test-client" companyName="Test" email="test@example.com" supportToken="personal-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Aperçu du mail" }));
    if (!includeSupport) fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer l’envoi" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    return invoke.mock.calls[0][1].body;
  }

  it("sends the client's personal support URL when selected by default", async () => {
    const payload = await send(true);
    const urls = Array.from(payload.htmlContent.matchAll(/href="([^"]+)"/g), (match: RegExpMatchArray) => match[1]);
    expect(urls.filter((url) => url === `${PUBLISHED_URL}/s/personal-token`)).toHaveLength(1);
    expect(payload.client_id).toBe("test-client");
  });

  it("does not send the personal support URL when deselected", async () => {
    const payload = await send(false);
    expect(payload.htmlContent).not.toContain(`${PUBLISHED_URL}/s/personal-token`);
  });
});