export function Stepper({
    steps,
    currentIndex,
  }: {
    steps: string[];
    currentIndex: number;
  }) {
    return (
      <ol className="grid gap-2 sm:grid-cols-5">
        {steps.map((s, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <li
              key={s}
              className={
                "rounded-[var(--radius-md)] border px-3 py-2 " +
                (done
                  ? "border-success/25 bg-success/10"
                  : active
                    ? "border-primary/25 bg-primary/10"
                    : "border-border bg-white/60")
              }
            >
              <div className="text-[11px] font-semibold text-muted">Étape {idx + 1}</div>
              <div className="text-sm font-medium text-text">{s}</div>
            </li>
          );
        })}
      </ol>
    );
  }
