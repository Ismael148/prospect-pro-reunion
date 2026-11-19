# Architecture rules

- Keep Google video verification guidance separate from postal verification; use official Google demonstration embeds and submit verification footage only through Google's mobile profile flow.
- Build the Chip Tuning verification email preview and send payload with one shared builder, using the existing client-email delivery and history service.

- Quote PDFs use measured table layout with a reserved footer margin and unsplit normal rows; this prevents descriptions and custom notes from being hidden by page footers.
- Quote service cells measure and render title and supporting description separately, allowing natural pagination instead of shrinking typography to fit one page.
- Normalize legacy quote descriptions and obsolete mandatory-deposit conditions at display, save and PDF export boundaries; this applies current presentation rules without rewriting historical records.
- Generate quote email previews and outgoing messages with the same shared builder using the current quote selection; this keeps attachment lists and renewal information consistent.
- Build editable invoice email previews and send payloads with one shared builder; plain-text edits are escaped and the PDF remains generated from invoice data.
- Send edited invoice emails through the existing single-client email service, not the fixed n8n template; this delivers the preview and PDF exactly once and records the invoice association.
- Build invoice attachments with a shared helper; fetch and validate the existing agency RIB only on explicit selection, and abort delivery if it cannot be loaded.
- Do not attach an auto-assignment trigger to project task insertion; only explicit assignee input may assign a new task, keeping generation and manual creation consistent.
- Invoice PDF designs are separate renderers selected by the invoice's stored template id, with unknown ids falling back to the default; every renderer must draw the agency logo.
- GMB step completion lives in one per-client progress map keyed by playbook step id (recurring steps suffixed with the Réunion month); legacy checklist booleans are only mirrored for compatibility, so every view reads progress through the shared step helpers.
- GMB listing analyses are staff-graded criteria stored as dated snapshots with a computed score; the public client dashboard exposes only completion state, scores and client-facing notes, never staff names or internal notes.

- Shared CRM read policies use `public.is_staff(auth.uid())` (any role in user_roles), plus owner-row access where relevant; never `USING (true)` or a signed-in-only check, so role-less accounts see no team data.
- Pack Décollage presentation and support-link emails come from one shared builder per email for preview and send, delivered through the single-client email service; a full-HTML override is sent as edited.
- Email opens/clicks are pulled from the email provider into a staff-readable `email_tracking` snapshot (one row per message, refreshed on demand); the sent-email log stays unchanged and the last snapshot is kept when provider events expire.
- Support ticket tracking (first response, resolution dates, event history) is written by database triggers into `support_tickets` and the read-only `support_ticket_events` table; the UI only reads it through the shared `support-tracking` helpers so every view computes delays the same way.
- Team client comments are read through the shared `team-comments` helpers (threads + unread = written by someone else and not seen); the admin's read state is `admin_seen`, other readers (webmasters) keep their own in `seen_marks` (`team_comment`, last 30 days), so their reading never clears the admin's inbox; the inbox page, menu badge and on-screen alert all use them.
- Task deadlines, agenda buckets and per-client completion use the shared `task-tracking` helpers on Réunion calendar days; tasks of finished or cancelled projects are never "late" and stay out of the agenda.
- Overdue-task reminders are individual emails (one per late task, with its project) sent by the `task-overdue-reminders` function on a managed weekday schedule, capped per member and rotated by least-recently-reminded; each email is one `task_reminder_log` row read through the shared `reminder-tracking` helpers in Support and Stats globales.
- Reminders go only to the member's real address in `team_notification_emails` (admin- or owner-editable), never the login email, because login ids are not real inboxes.
- Client and project responsibles live in their `assigned_to` columns; every change is written by a trigger into the read-only `assignment_history` table, shown in Suivi équipe → Qui gère quoi.
- Per-agent and global statistics are computed by the shared `agent-tracking` helpers on top of `task-tracking` and `support-tracking`, so the Stats globales page and Suivi équipe always agree.
- Resetting a client form goes through the staff-only `reset_client_form` function, which copies prior answers into read-only `client_form_archives` first; client submissions are never discarded.
- Group mentions in client notes (@[Tous les agents], @[Tous les webmasters], @[Toute l'équipe]) are defined once in `MENTION_GROUP_ROLES` (team-comments helpers) and expanded to role members by the `notify_note_mentions` trigger; both names must stay identical.
- On-screen alerts (toast until closed, system notification when the tab is hidden) come from `MentionAlertsWatcher` listening to the member's own mention/reply and client-form notifications; public client forms notify admins only through database triggers or submit functions writing `form_submission` notifications linked to the client page; "Mes mentions" uses the shared `mentionsViewer` helper.
