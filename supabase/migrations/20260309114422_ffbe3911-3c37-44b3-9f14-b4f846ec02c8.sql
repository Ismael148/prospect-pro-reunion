-- Add access_token and token_expires_at columns to social_accounts for OAuth
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone;