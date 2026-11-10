ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS design_template text NOT NULL DEFAULT 'signature';
ALTER TABLE public.invoices ADD CONSTRAINT invoices_design_template_check CHECK (design_template IN ('signature','epure','prestige','aurore'));
COMMENT ON COLUMN public.invoices.design_template IS 'PDF design chosen at invoice creation (signature, epure, prestige, aurore).';