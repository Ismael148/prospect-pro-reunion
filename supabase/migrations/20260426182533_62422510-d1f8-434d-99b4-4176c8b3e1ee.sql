-- Table de suivi des renouvellements de noms de domaine
CREATE TABLE public.domain_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  registered_date DATE,
  renewal_date DATE NOT NULL,
  next_renewal_date DATE,
  status TEXT NOT NULL DEFAULT 'a_renouveler', -- a_renouveler | facture_envoyee | paye | en_retard | annule
  invoice_id UUID,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domain_renewals_client ON public.domain_renewals(client_id);
CREATE INDEX idx_domain_renewals_renewal_date ON public.domain_renewals(renewal_date);
CREATE INDEX idx_domain_renewals_status ON public.domain_renewals(status);

ALTER TABLE public.domain_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view domain renewals"
  ON public.domain_renewals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage domain renewals"
  ON public.domain_renewals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_domain_renewals_updated_at
  BEFORE UPDATE ON public.domain_renewals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Historique des relances envoyées
CREATE TABLE public.domain_renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES public.domain_renewals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'email', -- email | facture | sms
  subject TEXT,
  message TEXT,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_by UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_reminders_renewal ON public.domain_renewal_reminders(renewal_id);
CREATE INDEX idx_renewal_reminders_client ON public.domain_renewal_reminders(client_id);

ALTER TABLE public.domain_renewal_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view renewal reminders"
  ON public.domain_renewal_reminders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert renewal reminders"
  ON public.domain_renewal_reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "Admins can manage renewal reminders"
  ON public.domain_renewal_reminders FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));