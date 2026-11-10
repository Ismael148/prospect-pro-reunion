ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invoice_template text;
ALTER TABLE public.clients ADD CONSTRAINT clients_invoice_template_check CHECK (invoice_template IS NULL OR invoice_template IN ('signature','epure','prestige','aurore'));
COMMENT ON COLUMN public.clients.invoice_template IS 'Preferred invoice PDF design for this client; NULL means agency default.';