-- Drop old unique constraint that limits to 1 account per platform per client
ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_client_platform_unique;

-- Add new unique constraint allowing multiple pages but preventing duplicates by page_id
ALTER TABLE public.social_accounts ADD CONSTRAINT social_accounts_client_platform_page_unique UNIQUE (client_id, platform, page_id);