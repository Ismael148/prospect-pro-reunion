CREATE OR REPLACE FUNCTION public.generate_commissions_on_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month text;
  v_agent_id uuid;
  v_commercial_id uuid;
  v_ext_commercial_id uuid;
  v_client_pack text;
  v_monthly_count integer;
  v_commercial_base numeric;
  v_commercial_bonus numeric;
BEGIN
  IF NEW.pipeline_status = 'contrat_signe' AND (OLD.pipeline_status IS DISTINCT FROM 'contrat_signe') THEN
    current_month := to_char(now(), 'YYYY-MM');
    v_agent_id := NEW.assigned_to;
    v_commercial_id := NEW.signed_by;
    v_ext_commercial_id := NEW.signed_by_commercial;
    v_client_pack := COALESCE(NEW.pack_type::text, 'autre');

    -- Agent commission: 50€ flat per signed contract
    IF v_agent_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions c WHERE c.client_id = NEW.id AND c.user_id = v_agent_id AND c.role = 'agent_telephonique' AND c.pack_type = v_client_pack) THEN
        INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
        VALUES (v_agent_id, NEW.id, current_month, 'agent_telephonique', v_client_pack, 50, 0, 50);
      END IF;

      -- NFC bonus: additional 20€ for NFC packs
      IF v_client_pack = 'star_bizness_nfc' THEN
        IF NOT EXISTS (SELECT 1 FROM commissions c WHERE c.client_id = NEW.id AND c.user_id = v_agent_id AND c.role = 'agent_telephonique' AND c.pack_type = 'nfc_bonus') THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (v_agent_id, NEW.id, current_month, 'agent_telephonique', 'nfc_bonus', 20, 0, 20);
        END IF;
      END IF;
    END IF;

    -- External commercial commission
    IF v_ext_commercial_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions c WHERE c.client_id = NEW.id AND c.commercial_id = v_ext_commercial_id) THEN
        IF v_client_pack = 'star_bizness_nfc' THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount, commercial_id)
          VALUES (COALESCE(v_commercial_id, NEW.created_by), NEW.id, current_month, 'commercial_terrain', v_client_pack, 79.90, 0, 79.90, v_ext_commercial_id);
        ELSE
          SELECT COUNT(*) + 1 INTO v_monthly_count
          FROM commissions c
          WHERE c.commercial_id = v_ext_commercial_id
            AND c.month_year = current_month
            AND c.role = 'commercial_terrain'
            AND c.pack_type != 'star_bizness_nfc';

          CASE v_monthly_count
            WHEN 1 THEN v_commercial_base := 250;
            WHEN 2 THEN v_commercial_base := 300;
            WHEN 3 THEN v_commercial_base := 350;
            ELSE v_commercial_base := 400;
          END CASE;

          IF v_monthly_count > 4 THEN
            v_commercial_bonus := 100;
          ELSE
            v_commercial_bonus := 0;
          END IF;

          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount, commercial_id)
          VALUES (COALESCE(v_commercial_id, NEW.created_by), NEW.id, current_month, 'commercial_terrain', v_client_pack, v_commercial_base, v_commercial_bonus, v_commercial_base + v_commercial_bonus, v_ext_commercial_id);
        END IF;
      END IF;

    -- Internal commercial (with user account)
    ELSIF v_commercial_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions c WHERE c.client_id = NEW.id AND c.user_id = v_commercial_id AND c.role = 'commercial_terrain') THEN
        IF v_client_pack = 'star_bizness_nfc' THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (v_commercial_id, NEW.id, current_month, 'commercial_terrain', v_client_pack, 79.90, 0, 79.90);
        ELSE
          SELECT COUNT(*) + 1 INTO v_monthly_count
          FROM commissions c
          WHERE c.user_id = v_commercial_id
            AND c.month_year = current_month
            AND c.role = 'commercial_terrain'
            AND c.pack_type != 'star_bizness_nfc';

          CASE v_monthly_count
            WHEN 1 THEN v_commercial_base := 250;
            WHEN 2 THEN v_commercial_base := 300;
            WHEN 3 THEN v_commercial_base := 350;
            ELSE v_commercial_base := 400;
          END CASE;

          IF v_monthly_count > 4 THEN
            v_commercial_bonus := 100;
          ELSE
            v_commercial_bonus := 0;
          END IF;

          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (v_commercial_id, NEW.id, current_month, 'commercial_terrain', v_client_pack, v_commercial_base, v_commercial_bonus, v_commercial_base + v_commercial_bonus);

          IF v_monthly_count >= 2 THEN
            UPDATE commissions c
            SET base_amount = CASE
              WHEN v_monthly_count >= 4 THEN 400
              WHEN v_monthly_count = 3 THEN 350
              WHEN v_monthly_count = 2 THEN 300
              ELSE c.base_amount
            END,
            bonus_amount = CASE WHEN v_monthly_count > 4 THEN 100 ELSE 0 END,
            total_amount = CASE
              WHEN v_monthly_count >= 4 THEN 400
              WHEN v_monthly_count = 3 THEN 350
              WHEN v_monthly_count = 2 THEN 300
              ELSE c.base_amount
            END + CASE WHEN v_monthly_count > 4 THEN 100 ELSE 0 END
            WHERE c.user_id = v_commercial_id
              AND c.month_year = current_month
              AND c.role = 'commercial_terrain'
              AND c.pack_type != 'star_bizness_nfc';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;