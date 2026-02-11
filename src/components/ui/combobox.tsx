"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export interface ComboboxProps {
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyLabel = "Aucun résultat.",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Handle click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "h-10 w-full justify-between rounded-[var(--radius-md)] border border-border bg-white px-3 text-sm font-normal text-text shadow-sm transition-colors hover:bg-white hover:text-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        type="button"
      >
        {value ? value : <span className="text-muted">{placeholder}</span>}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-[100] mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-white p-1 text-text shadow-lg ring-1 ring-black/5">
          <div className="sticky top-0 z-10 bg-white p-1">
            <input
              ref={inputRef}
              className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted">
                {emptyLabel}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 hover:text-navy cursor-pointer",
                    value === option && "bg-slate-100 font-medium"
                  )}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
