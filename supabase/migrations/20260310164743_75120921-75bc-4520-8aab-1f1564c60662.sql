
-- Commissions table
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL, -- format: '2026-03'
  role text NOT NULL, -- 'agent_telephonique' or 'commercial_terrain'
  pack_type text NOT NULL, -- 'star_bizness_numerik', 'star_bizness_nfc', 'autre'
  base_amount numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'en_attente', -- en_attente, valide, paye
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commissions" ON public.commissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own commissions" ON public.commissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate commissions when client status changes to contrat_signe
CREATE OR REPLACE FUNCTION public.generate_commissions_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month text;
  agent_id uuid;
  commercial_id uuid;
  client_pack text;
  monthly_count integer;
  commercial_base numeric;
  commercial_bonus numeric;
BEGIN
  -- Only trigger when status changes TO contrat_signe
  IF NEW.pipeline_status = 'contrat_signe' AND (OLD.pipeline_status IS DISTINCT FROM 'contrat_signe') THEN
    current_month := to_char(now(), 'YYYY-MM');
    agent_id := NEW.assigned_to;
    commercial_id := NEW.signed_by;
    client_pack := COALESCE(NEW.pack_type::text, 'autre');

    -- Agent commission: 50€ flat per signed contract
    IF agent_id IS NOT NULL THEN
      -- Check if commission already exists for this client
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = agent_id) THEN
        INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
        VALUES (agent_id, NEW.id, current_month, 'agent_telephonique', client_pack, 50, 0, 50);
      END IF;
    END IF;

    -- Commercial commission
    IF commercial_id IS NOT NULL THEN
      -- Check if commission already exists for this client
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = commercial_id) THEN
        IF client_pack = 'star_bizness_nfc' THEN
          -- NFC: fixed 79.90€
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (commercial_id, NEW.id, current_month, 'commercial_terrain', client_pack, 79.90, 0, 79.90);
        ELSE
          -- Site: progressive scale based on monthly count
          -- Count how many site contracts this commercial signed this month (including current)
          SELECT COUNT(*) + 1 INTO monthly_count
          FROM commissions
          WHERE user_id = commercial_id
            AND month_year = current_month
            AND role = 'commercial_terrain'
            AND pack_type != 'star_bizness_nfc';

          -- Determine base rate
          CASE monthly_count
            WHEN 1 THEN commercial_base := 250;
            WHEN 2 THEN commercial_base := 300;
            WHEN 3 THEN commercial_base := 350;
            ELSE commercial_base := 400;
          END CASE;

          -- Bonus for 5+ contracts
          IF monthly_count > 4 THEN
            commercial_bonus := 100;
          ELSE
            commercial_bonus := 0;
          END IF;

          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (commercial_id, NEW.id, current_month, 'commercial_terrain', client_pack, commercial_base, commercial_bonus, commercial_base + commercial_bonus);

          -- Recalculate all commissions for this commercial this month (retroactive rate adjustment)
          -- When count changes, all previous site commissions need rate update
          IF monthly_count >= 2 THEN
            UPDATE commissions
            SET base_amount = CASE
              WHEN monthly_count >= 4 THEN 400
              WHEN monthly_count = 3 THEN 350
              WHEN monthly_count = 2 THEN 300
              ELSE base_amount
            END,
            bonus_amount = CASE WHEN monthly_count > 4 THEN 100 ELSE 0 END,
            total_amount = CASE
              WHEN monthly_count >= 4 THEN 400
              WHEN monthly_count = 3 THEN 350
              WHEN monthly_count = 2 THEN 300
              ELSE base_amount
            END + CASE WHEN monthly_count > 4 THEN 100 ELSE 0 END
            WHERE user_id = commercial_id
              AND month_year = current_month
              AND role = 'commercial_terrain'
              AND pack_type != 'star_bizness_nfc';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on clients table for commission generation
CREATE TRIGGER trg_generate_commissions
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_commissions_on_signature();
