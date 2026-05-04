-- Add parent_id to expenses for grouping (parent module + sub-expenses)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS employee_name text,
ADD COLUMN IF NOT EXISTS employee_role text;

CREATE INDEX IF NOT EXISTS idx_expenses_parent_id ON public.expenses(parent_id);

-- Salary advances table
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'en_cours',
  reimbursed_at timestamp with time zone,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_advances_expense_id ON public.salary_advances(expense_id);

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage salary advances"
ON public.salary_advances
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_salary_advances_updated_at
BEFORE UPDATE ON public.salary_advances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();