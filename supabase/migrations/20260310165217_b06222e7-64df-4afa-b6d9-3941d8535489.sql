
-- Expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'charges_sociales',
  'abonnement_plateforme',
  'salaire',
  'loyer',
  'marketing',
  'materiel',
  'autre'
);

-- Recurring frequency
CREATE TYPE public.expense_frequency AS ENUM (
  'ponctuel',
  'mensuel',
  'trimestriel',
  'annuel'
);

-- Expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category expense_category NOT NULL DEFAULT 'autre',
  amount numeric NOT NULL DEFAULT 0,
  frequency expense_frequency NOT NULL DEFAULT 'ponctuel',
  month_year text, -- for one-time expenses: '2026-03'
  start_date date, -- for recurring: when it starts
  end_date date, -- for recurring: optional end date
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
