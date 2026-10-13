# Architecture rules

- Quote PDFs use measured table layout with a reserved footer margin and unsplit normal rows; this prevents descriptions and custom notes from being hidden by page footers.
- Quote service cells measure and render title and supporting description separately, allowing natural pagination instead of shrinking typography to fit one page.
- Normalize legacy quote descriptions and obsolete mandatory-deposit conditions at display, save and PDF export boundaries; this applies current presentation rules without rewriting historical records.