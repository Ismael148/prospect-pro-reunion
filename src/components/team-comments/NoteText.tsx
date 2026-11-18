export function NoteText({ text }: { text: string | null }) {
  if (!text) return null;
  const parts = text.split(/(#resolu|#en_cours|#ticket|@\[[^\]]+\])/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (/^#resolu$/i.test(part)) return <span key={i} className="mx-0.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Résolu</span>;
        if (/^#en_cours$/i.test(part)) return <span key={i} className="mx-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">En cours</span>;
        if (/^#ticket$/i.test(part)) return <span key={i} className="mx-0.5 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">Ticket</span>;
        const m = part.match(/^@\[([^\]]+)\]$/);
        if (m) return <span key={i} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">@{m[1]}</span>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
