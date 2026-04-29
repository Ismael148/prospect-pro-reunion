-- Configuration du chatbot IA par client
CREATE TABLE public.chatbot_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  platforms TEXT[] NOT NULL DEFAULT ARRAY['facebook','instagram']::TEXT[],
  system_prompt TEXT NOT NULL DEFAULT 'Tu es l''assistant virtuel de cette entreprise. Réponds de manière polie, professionnelle et concise. Utilise les informations fournies pour répondre aux questions des clients.',
  business_info TEXT,
  fallback_message TEXT NOT NULL DEFAULT 'Merci pour votre message ! Un membre de notre équipe vous répondra dans les plus brefs délais.',
  escalation_keywords TEXT[] DEFAULT ARRAY['humain','conseiller','rdv','rendez-vous','urgent','plainte','remboursement']::TEXT[],
  ai_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  max_messages_per_conversation INTEGER NOT NULL DEFAULT 5,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_configs_client ON public.chatbot_configs(client_id);

ALTER TABLE public.chatbot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chatbot configs"
  ON public.chatbot_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Webmaster/agent_master manage chatbot configs"
  ON public.chatbot_configs FOR ALL
  USING (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role));

CREATE POLICY "Authenticated view chatbot configs"
  ON public.chatbot_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Journal des conversations chatbot
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  platform TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  incoming_message TEXT NOT NULL,
  ai_response TEXT,
  status TEXT NOT NULL DEFAULT 'auto_replied',
  tokens_used INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_conv_client ON public.chatbot_conversations(client_id, created_at DESC);
CREATE INDEX idx_chatbot_conv_sender ON public.chatbot_conversations(sender_id);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chatbot convs"
  ON public.chatbot_conversations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Webmaster/agent_master view chatbot convs"
  ON public.chatbot_conversations FOR SELECT
  USING (has_role(auth.uid(), 'webmaster'::app_role) OR has_role(auth.uid(), 'agent_master'::app_role));

CREATE POLICY "System can insert chatbot convs"
  ON public.chatbot_conversations FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER trg_chatbot_configs_updated
  BEFORE UPDATE ON public.chatbot_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();