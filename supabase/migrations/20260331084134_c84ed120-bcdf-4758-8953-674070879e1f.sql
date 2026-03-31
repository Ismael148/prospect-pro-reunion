CREATE OR REPLACE FUNCTION public.generate_commissions_on_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month text;
  agent_id uuid;
  commercial_id uuid;
  ext_commercial_id uuid;
  client_pack text;
  monthly_count integer;
  commercial_base numeric;
  commercial_bonus numeric;
BEGIN
  IF NEW.pipeline_status = 'contrat_signe' AND (OLD.pipeline_status IS DISTINCT FROM 'contrat_signe') THEN
    current_month := to_char(now(), 'YYYY-MM');
    agent_id := NEW.assigned_to;
    commercial_id := NEW.signed_by;
    ext_commercial_id := NEW.signed_by_commercial;
    client_pack := COALESCE(NEW.pack_type::text, 'autre');

    -- Agent commission: 50€ flat per signed contract
    IF agent_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = agent_id AND role = 'agent_telephonique' AND pack_type = client_pack) THEN
        INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
        VALUES (agent_id, NEW.id, current_month, 'agent_telephonique', client_pack, 50, 0, 50);
      END IF;

      -- NFC bonus: additional 20€ for NFC packs
      IF client_pack = 'star_bizness_nfc' THEN
        IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = agent_id AND role = 'agent_telephonique' AND pack_type = 'nfc_bonus') THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (agent_id, NEW.id, current_month, 'agent_telephonique', 'nfc_bonus', 20, 0, 20);
        END IF;
      END IF;
    END IF;

    -- External commercial commission
    IF ext_commercial_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND commercial_id = ext_commercial_id) THEN
        IF client_pack = 'star_bizness_nfc' THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount, commercial_id)
          VALUES (COALESCE(commercial_id, NEW.created_by), NEW.id, current_month, 'commercial_terrain', client_pack, 79.90, 0, 79.90, ext_commercial_id);
        ELSE
          SELECT COUNT(*) + 1 INTO monthly_count
          FROM commissions
          WHERE commercial_id = ext_commercial_id
            AND month_year = current_month
            AND role = 'commercial_terrain'
            AND pack_type != 'star_bizness_nfc';

          CASE monthly_count
            WHEN 1 THEN commercial_base := 250;
            WHEN 2 THEN commercial_base := 300;
            WHEN 3 THEN commercial_base := 350;
            ELSE commercial_base := 400;
          END CASE;

          IF monthly_count > 4 THEN
            commercial_bonus := 100;
          ELSE
            commercial_bonus := 0;
          END IF;

          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount, commercial_id)
          VALUES (COALESCE(commercial_id, NEW.created_by), NEW.id, current_month, 'commercial_terrain', client_pack, commercial_base, commercial_bonus, commercial_base + commercial_bonus, ext_commercial_id);
        END IF;
      END IF;

    -- Internal commercial (with user account)
    ELSIF commercial_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM commissions WHERE client_id = NEW.id AND user_id = commercial_id AND role = 'commercial_terrain') THEN
        IF client_pack = 'star_bizness_nfc' THEN
          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (commercial_id, NEW.id, current_month, 'commercial_terrain', client_pack, 79.90, 0, 79.90);
        ELSE
          SELECT COUNT(*) + 1 INTO monthly_count
          FROM commissions
          WHERE user_id = commercial_id
            AND month_year = current_month
            AND role = 'commercial_terrain'
            AND pack_type != 'star_bizness_nfc';

          CASE monthly_count
            WHEN 1 THEN commercial_base := 250;
            WHEN 2 THEN commercial_base := 300;
            WHEN 3 THEN commercial_base := 350;
            ELSE commercial_base := 400;
          END CASE;

          IF monthly_count > 4 THEN
            commercial_bonus := 100;
          ELSE
            commercial_bonus := 0;
          END IF;

          INSERT INTO commissions (user_id, client_id, month_year, role, pack_type, base_amount, bonus_amount, total_amount)
          VALUES (commercial_id, NEW.id, current_month, 'commercial_terrain', client_pack, commercial_base, commercial_bonus, commercial_base + commercial_bonus);

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
$function$;