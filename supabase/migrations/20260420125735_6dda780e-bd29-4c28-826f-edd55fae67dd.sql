INSERT INTO public.deliverables (project_id, name, description, status)
SELECT DISTINCT p.id, 'Vidéo Influenceur Réseaux Sociaux', 'Vidéo influenceur prête à poster sur Facebook, Instagram & TikTok', 'en_attente'::deliverable_status
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.deliverables d
  WHERE d.project_id = p.id
    AND d.name = 'Vidéo Influenceur Réseaux Sociaux'
);