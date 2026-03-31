
-- Allow users assigned to a task to update that task
CREATE POLICY "Task assignees can update their tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);
