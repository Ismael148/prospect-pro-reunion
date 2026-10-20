# Architecture rules

- Keep Google video verification guidance separate from postal verification; use official Google demonstration embeds and submit verification footage only through Google's mobile profile flow.
- Build the Chip Tuning verification email preview and send payload with one shared builder, using the existing client-email delivery and history service.

- Quote PDFs use measured table layout with a reserved footer margin and unsplit normal rows; this prevents descriptions and custom notes from being hidden by page footers.
- Quote service cells measure and render title and supporting description separately, allowing natural pagination instead of shrinking typography to fit one page.
- Normalize legacy quote descriptions and obsolete mandatory-deposit conditions at display, save and PDF export boundaries; this applies current presentation rules without rewriting historical records.
- Generate quote email previews and outgoing messages with the same shared builder using the current quote selection; this keeps attachment lists and renewal information consistent.
- Build editable invoice email previews and send payloads with one shared builder; plain-text edits are escaped and the PDF remains generated from invoice data.
- Send edited invoice emails through the existing single-client email service, not the fixed n8n template; this delivers the preview and PDF exactly once and records the invoice association.
- Do not attach an auto-assignment trigger to project task insertion; only explicit assignee input may assign a new task, keeping generation and manual creation consistent.