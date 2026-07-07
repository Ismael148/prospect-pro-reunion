import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ClientComboboxOption {
  id: string;
  company_name?: string | null;
  ndi?: string | null;
  city?: string | null;
}

interface Props {
  options: ClientComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function ClientCombobox({
  options,
  value,
  onChange,
  placeholder = "Sélectionner un client…",
  emptyText = "Aucun client trouvé.",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.id === value);
  const normalizeSearch = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  const labelOf = (o: ClientComboboxOption) =>
    `${o.company_name ?? ""}${o.ndi ? ` (${o.ndi})` : ""}${o.city ? ` · ${o.city}` : ""}`.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selected ? labelOf(selected) : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) => {
            return normalizeSearch(value).includes(normalizeSearch(search)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Rechercher (nom, NDI, ville)…" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const label = labelOf(o);
                const searchable = `${o.company_name ?? ""} ${o.ndi ?? ""} ${o.city ?? ""}`;
                return (
                  <CommandItem
                    key={o.id}
                    value={searchable}
                    onSelect={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === o.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
