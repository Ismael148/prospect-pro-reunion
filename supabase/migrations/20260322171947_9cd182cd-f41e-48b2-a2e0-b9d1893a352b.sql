-- Delete all dependent data first, then clients
DELETE FROM social_publications;
DELETE FROM social_accounts;
DELETE FROM support_tickets;
DELETE FROM client_forms;
DELETE FROM client_activities;
DELETE FROM deliverables;
DELETE FROM project_tasks;
DELETE FROM projects;
DELETE FROM commissions;
DELETE FROM contacts;
DELETE FROM invoices;
DELETE FROM notifications;
DELETE FROM prospects WHERE converted_client_id IS NOT NULL;
DELETE FROM clients;