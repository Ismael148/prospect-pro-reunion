
-- Project status enum
CREATE TYPE public.project_status AS ENUM (
  'en_attente',
  'en_cours',
  'en_revision',
  'termine',
  'annule'
);

-- Task status enum
CREATE TYPE public.task_status AS ENUM (
  'a_faire',
  'en_cours',
  'en_revision',
  'termine'
);

-- Task priority enum
CREATE TYPE public.task_priority AS ENUM (
  'basse',
  'moyenne',
  'haute',
  'urgente'
);

-- Deliverable status enum
CREATE TYPE public.deliverable_status AS ENUM (
  'en_attente',
  'en_cours',
  'soumis',
  'approuve',
  'rejete'
);

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pack_type public.pack_type NOT NULL,
  status project_status NOT NULL DEFAULT 'en_attente',
  start_date DATE,
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Project tasks
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'a_faire',
  priority task_priority NOT NULL DEFAULT 'moyenne',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Deliverables
CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status deliverable_status NOT NULL DEFAULT 'en_attente',
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Authenticated users can view all projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Assigned users and admins can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (
    auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for tasks (linked to project access)
CREATE POLICY "Authenticated users can view all tasks" ON public.project_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage tasks" ON public.project_tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id
        AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Authenticated users can update tasks" ON public.project_tasks
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id
        AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can delete tasks" ON public.project_tasks
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for deliverables
CREATE POLICY "Authenticated users can view all deliverables" ON public.deliverables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage deliverables" ON public.deliverables
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id
        AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Authenticated users can update deliverables" ON public.deliverables
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id
        AND (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can delete deliverables" ON public.deliverables
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_tasks_status ON public.project_tasks(status);
CREATE INDEX idx_deliverables_project_id ON public.deliverables(project_id);

-- Triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
