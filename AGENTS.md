# Architecture rules

- Keep Google video verification guidance separate from postal verification; use official Google demonstration embeds and submit verification footage only through Google's mobile profile flow.
- Build the Chip Tuning verification email preview and send payload with one shared builder, using the existing client-email delivery and history service.

- Quote PDFs use measured table layout with a reserved footer margin and unsplit normal rows; this prevents descriptions and custom notes from being hidden by page footers.
- Quote service cells measure and render title and supporting description separately, allowing natural pagination instead of shrinking typography to fit one page.
- Normalize legacy quote descriptions and obsolete mandatory-deposit conditions at display, save and PDF export boundaries; this applies current presentation rules without rewriting historical records.
- Generate quote email previews and outgoing messages with the same shared builder using the current quote selection; this keeps attachment lists and renewal information consistent.