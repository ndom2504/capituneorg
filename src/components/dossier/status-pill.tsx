import { PillIntent, pillStyles } from "@/lib/dossier/utils";

export function StatusPill({ label, intent }: { label: string; intent: PillIntent }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${pillStyles(
        intent,
      )}`}
    >
      {label}
    </span>
  );
}
