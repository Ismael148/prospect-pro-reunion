-- Add link_url to project_tasks for webmasters to submit work links
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Add site_type to projects for vitrine vs e-commerce choice
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS site_type TEXT DEFAULT 'vitrine';

-- Add has_gmb to clients for GMB tracking
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS has_gmb BOOLEAN DEFAULT false;