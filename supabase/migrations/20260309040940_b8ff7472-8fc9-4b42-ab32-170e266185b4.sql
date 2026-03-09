-- Add unique constraint needed for upsert on social_accounts
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_client_platform_unique UNIQUE (client_id, platform);