"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type RequestItem = {
  id: string;
  createdAt: string;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  from: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

type PartnershipItem = {
  id: string;
  createdAt: string;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  from: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  to: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

export function ProRequestsManager({
  contactReceived,
  partnershipReceived,
  partnershipSent,
  partnershipActive,
}: {
  contactReceived: RequestItem[];
  partnershipReceived: RequestItem[];
  partnershipSent?: PartnershipItem[];
  partnershipActive?: PartnershipItem[];
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RequestsSection
          title="Demandes de contact"
          kind="contact"
          items={contactReceived}
          emptyLabel="Aucune demande de contact en attente."
          onDone={() => router.refresh()}
        />
        <RequestsSection
          title="Demandes de partenariat"
          kind="partnership"
          items={partnershipReceived}
          emptyLabel="Aucune demande de partenariat en attente."
          onDone={() => router.refresh()}
        />

        {partnershipSent ? (
          <SentSection title="Mes demandes envoyées" items={partnershipSent} />
        ) : null}

        {partnershipActive ? (
          <ActiveSection title="Mes partenariats actifs" items={partnershipActive} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function RequestsSection({
  title,
  kind,
  items,
  emptyLabel,
  onDone,
}: {
  title: string;
  kind: "contact" | "partnership";
  items: RequestItem[];
  emptyLabel: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-navy">{title}</div>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <RequestRow key={item.id} kind={kind} item={item} onDone={onDone} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({
  kind,
  item,
  onDone,
}: {
  kind: "contact" | "partnership";
  item: RequestItem;
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState<null | "accept" | "reject">(null);
  const [error, setError] = React.useState<string | null>(null);

  async function act(action: "ACCEPT" | "REJECT") {
    setError(null);
    setBusy(action === "ACCEPT" ? "accept" : "reject");
    try {
      const res = await fetch(`/api/relationships/${kind}/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok) {
        setError(payload?.error ?? "Action impossible.");
        return;
      }
      onDone();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full border border-border bg-white p-1">
            {item.from.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.from.avatarUrl}
                alt="Avatar"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
                <span className="text-sm font-bold">
                  {item.from.fullName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-navy">
              {item.from.fullName}
            </div>
            <div className="truncate text-xs text-muted">{item.from.email}</div>
            {item.message ? (
              <div className="mt-1 line-clamp-2 text-xs text-text">
                {item.message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <span
            className={cn(
              "self-start rounded-full border border-border bg-white/70 px-2 py-1 text-[11px] font-semibold",
              item.status === "PENDING" && "text-navy",
              item.status === "ACCEPTED" && "text-green-700",
              item.status === "REJECTED" && "text-red-700",
            )}
          >
            {item.status === "PENDING"
              ? "En attente"
              : item.status === "ACCEPTED"
                ? "Acceptée"
                : "Refusée"}
          </span>

          {item.status === "PENDING" ? (
            <>
              <Button
                size="sm"
                className="h-9 bg-navy text-xs text-white hover:bg-navy/90"
                disabled={busy !== null}
                onClick={() => act("ACCEPT")}
              >
                {busy === "accept" ? "Acceptation…" : "Accepter"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 bg-white/70 text-xs text-navy hover:bg-white"
                disabled={busy !== null}
                onClick={() => act("REJECT")}
              >
                {busy === "reject" ? "Refus…" : "Refuser"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

function SentSection({ title, items }: { title: string; items: PartnershipItem[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-navy">{title}</div>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
          Aucune demande envoyée.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <SentRow key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function SentRow({ item }: { item: PartnershipItem }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
      <div className="text-sm font-semibold text-navy">À: {item.to.fullName}</div>
      <div className="text-xs text-muted">{item.to.email}</div>
      {item.message ? (
        <div className="mt-2 whitespace-pre-line text-xs text-text">{item.message}</div>
      ) : null}
      <div className="mt-2 text-xs font-semibold text-muted">
        Statut: {item.status === "PENDING" ? "Envoyée" : item.status === "ACCEPTED" ? "Acceptée" : "Refusée"}
      </div>
    </div>
  );
}

function ActiveSection({ title, items }: { title: string; items: PartnershipItem[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-navy">{title}</div>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
          Aucun partenariat actif.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <ActiveRow key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveRow({ item }: { item: PartnershipItem }) {
  const other = item.to;
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
      <div className="text-sm font-semibold text-navy">{other.fullName}</div>
      <div className="text-xs text-muted">{other.email}</div>
      {item.message ? (
        <div className="mt-2 whitespace-pre-line text-xs text-text">{item.message}</div>
      ) : null}
      <div className="mt-2 text-xs font-semibold text-green-700">Actif</div>
      <div className="mt-1 text-xs text-muted">MVP: fin de partenariat & notes internes à venir.</div>
    </div>
  );
}
