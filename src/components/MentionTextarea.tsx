import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AtSign } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MentionMember {
  user_id: string;
  full_name: string | null;
  roles?: string[];
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  members: MentionMember[];
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  agent_master: "Agent Master",
  agent_telephonique: "Agent Tél.",
  agent_support: "Support",
  webmaster: "Webmaster",
  designer: "Designer",
  commercial_terrain: "Commercial",
};

export function MentionTextarea({
  value,
  onChange,
  members,
  placeholder,
  rows = 3,
  className,
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<number | null>(null); // index of '@'
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = members
    .filter((m) => (m.full_name || "").toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  const detectMention = (text: string, caret: number) => {
    // find last '@' before caret with no space between
    let i = caret - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@") {
        // ensure preceded by start or whitespace
        if (i === 0 || /\s/.test(text[i - 1])) {
          const sub = text.slice(i + 1, caret);
          // stop if already a completed @[...]
          if (!sub.includes("[") && !sub.includes("]") && !/\s/.test(sub)) {
            return { anchor: i, query: sub };
          }
        }
        return null;
      }
      if (/\s/.test(ch) || ch === "[" || ch === "]") return null;
      i--;
    }
    return null;
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    const caret = e.target.selectionStart || 0;
    const m = detectMention(text, caret);
    if (m) {
      setAnchor(m.anchor);
      setQuery(m.query);
      setOpen(true);
    } else {
      setOpen(false);
      setAnchor(null);
    }
  };

  const insertMention = (member: MentionMember) => {
    if (anchor === null) return;
    const before = value.slice(0, anchor);
    const caret = ref.current?.selectionStart || value.length;
    const after = value.slice(caret);
    const inserted = `@[${member.full_name || "Membre"}] `;
    const next = before + inserted + after;
    onChange(next);
    setOpen(false);
    setAnchor(null);
    setQuery("");
    requestAnimationFrame(() => {
      const pos = (before + inserted).length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const initials = (name: string | null) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        rows={rows}
        className={cn("resize-none", className)}
        autoFocus={autoFocus}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 bottom-full mb-1 z-50 w-72 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-1">
          <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2 bg-muted/30">
            <AtSign className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Mentionner {query && `« ${query} »`}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map((m, idx) => (
              <button
                key={m.user_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                  idx === activeIdx ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(m.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.full_name || "Membre"}
                  </div>
                  {m.roles && m.roles.length > 0 && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {m.roles.map((r) => ROLE_LABELS[r] || r).join(" · ")}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>↑↓ naviguer</span>
            <span>↵ sélectionner</span>
            <span>esc fermer</span>
          </div>
        </div>
      )}
    </div>
  );
}
