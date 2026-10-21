import { useId, useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { applyEmailSupport, type EmailBrandingConfig } from "@/lib/email-template";

export function EmailSupportOption({ checked, onChange, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return <div className="flex items-center gap-2 py-2">
    <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} disabled={disabled} />
    <Label htmlFor={id} className="cursor-pointer">Inclure le bloc « Ouvrir un ticket support »</Label>
  </div>;
}

export function useEmailSupport() {
  const [includeSupport, setIncludeSupport] = useState(true);
  const applySupport = useCallback((html: string, link?: string | null, branding?: EmailBrandingConfig) => applyEmailSupport(html, link, includeSupport, branding), [includeSupport]);
  return { includeSupport, setIncludeSupport, applySupport };
}