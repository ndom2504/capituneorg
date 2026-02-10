"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";

type SenderRole = "REQUESTER" | "PROFESSIONAL" | "SYSTEM";

type MessageKind = "TEXT" | "STATUS_UPDATE" | "MEETING" | "FILE";

type Message = {
  id: string;
  senderRole: SenderRole;
  kind: MessageKind;
  body: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

type Item = {
  id: string;
  status: "PENDING" | "NEEDS_INFO" | "ACCEPTED" | "REJECTED";
  statusLabel: string;
  topicLabel: string;
  urgency: string | null;
  preferredTimeframe: string | null;
  createdAt: string;
  lastActivityAt: string;
  professional: { id: string; fullName: string; avatarUrl: string | null };
  meeting:
    | { id: string; startsAt: string; durationMin: number; locationUrl: string | null }
    | null;
  payment:
    | null
    | {
        orderId: string;
        status: "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELED" | "REFUNDED";
        amountCents: number;
        currency: string;
        service: { id: string; title: string; description: string | null };
        lastPayment: null | { status: "CREATED" | "SUCCEEDED" | "FAILED" | "REFUNDED"; paidAt: string | null };
      };
  messages: Message[];
};

type ApiResponse = { item: Item };

type EngagementDto = {
  id: string;
  status:
    | "DRAFT"
    | "CONTRACT_SENT"
    | "SIGNED"
    | "PAYMENT_REQUESTED"
    | "PAID"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELED";
  contractTitle: string;
  contractBody: string;
  contractSentAt: string | null;
  signedAt: string | null;
  signedByName: string | null;
  paymentRequestedAt: string | null;
  paidAt: string | null;
  milestone: "ANALYSE" | "DOSSIER" | "SOUMISSION";
  analyseDoneAt: string | null;
  dossierDoneAt: string | null;
  soumissionDoneAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
};

type EngagementApi = {
  request: { id: string; status: Item["status"] };
  engagement: EngagementDto | null;
  payment:
    | null
    | {
        orderId: string;
        status: "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELED" | "REFUNDED";
        amountCents: number;
        currency: string;
        paidAt: string | null;
        service: { id: string; title: string };
        createdAt: string;
      };
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function bubbleClass(sender: SenderRole) {
  if (sender === "REQUESTER") return "bg-primary/12 border-primary/20";
  if (sender === "PROFESSIONAL") return "bg-white/70 border-border";
  return "bg-surface border-border";
}

function senderLabel(sender: SenderRole) {
  if (sender === "REQUESTER") return "Vous";
  if (sender === "PROFESSIONAL") return "Professionnel";
  return "Système";
}

export function MyRequestThread({ requestId }: { requestId: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [engagement, setEngagement] = useState<EngagementDto | null>(null);
  const [engLoading, setEngLoading] = useState(false);
  const [engError, setEngError] = useState<string | null>(null);
  const [signName, setSignName] = useState("");
  const [signBusy, setSignBusy] = useState(false);

  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/my-requests/${requestId}`, { cache: "no-cache" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ApiResponse;
      setItem(data.item);

      // Prestation (best-effort)
      void loadEngagement();

      // mark read (best-effort)
      fetch(`/api/marketplace/my-requests/${requestId}`, { method: "POST" }).catch(() => null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function loadEngagement() {
    setEngLoading(true);
    setEngError(null);
    try {
      const res = await fetch(`/api/marketplace/my-requests/${requestId}/engagement`, { cache: "no-cache" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as EngagementApi;
      setEngagement(data.engagement ?? null);
    } catch (e) {
      setEngError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setEngLoading(false);
    }
  }

  async function signContract() {
    setSignBusy(true);
    setEngError(null);
    try {
      const res = await fetch(`/api/marketplace/my-requests/${requestId}/engagement/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-cache",
        body: JSON.stringify({ fullName: signName.trim() || undefined }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      setSignName("");
      await loadEngagement();
      await refresh();
    } catch (e) {
      setEngError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSignBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const sortedMessages = useMemo(() => {
    if (!item) return [] as Message[];
    return [...item.messages].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, [item]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/my-requests/${requestId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-cache",
        body: JSON.stringify({
          body: text.trim() || undefined,
          fileUrl: fileUrl.trim() || undefined,
          fileName: fileName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      setText("");
      setFileUrl("");
      setFileName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function money(amountCents: number, currency: string) {
    const amount = amountCents / 100;
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  async function payNow(orderId: string) {
    setPayBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPayBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted">Chargement…</div>
      </Card>
    );
  }

  if (error || !item) {
    return (
      <Card className="p-6">
        <div className="text-sm font-medium text-danger">Erreur</div>
        <div className="mt-1 text-sm text-text">{error ?? "Demande introuvable."}</div>
        <div className="mt-4">
          <Link href="/marketplace/mes-demandes">
            <Button variant="outline">Retour</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/marketplace/mes-demandes" className="text-sm text-muted">
            ← Retour
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <AvatarBubble name={item.professional.fullName} url={item.professional.avatarUrl} size="xxl" />
            <div className="min-w-0">
              <div className="text-xl font-semibold text-navy">{item.professional.fullName}</div>
              <div className="mt-1 text-sm text-muted">
                Statut: <span className="font-medium text-text">{item.statusLabel}</span> • Besoin: {item.topicLabel}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">ID</div>
          <div className="mt-1 font-mono text-xs text-text">{item.id}</div>
        </div>
      </div>

      {item.payment ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-navy">Paiement</div>
              <div className="mt-1 text-sm text-text">
                {item.payment.service.title} • {money(item.payment.amountCents, item.payment.currency)}
              </div>
              {item.payment.service.description ? (
                <div className="mt-1 text-sm text-muted">{item.payment.service.description}</div>
              ) : null}
            </div>

            <div className="text-right">
              {item.payment.status === "PAID" ? (
                <div className="text-sm font-semibold text-navy">Payé</div>
              ) : item.payment.status === "PENDING_PAYMENT" ? (
                <div className="text-sm font-semibold text-navy">Paiement requis</div>
              ) : (
                <div className="text-sm font-semibold text-navy">{item.payment.status}</div>
              )}
              {item.payment.lastPayment?.paidAt ? (
                <div className="mt-1 text-xs text-muted">{formatDateTime(item.payment.lastPayment.paidAt)}</div>
              ) : null}
            </div>
          </div>

          {item.payment.status === "PENDING_PAYMENT" ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="outline" disabled={payBusy} onClick={refresh}>
                Actualiser
              </Button>
              <Button disabled={payBusy} onClick={() => payNow(item.payment!.orderId)}>
                Payer maintenant
              </Button>
            </div>
          ) : null}

          {item.payment.status === "PAID" ? (
            <div className="mt-3 text-sm text-muted">
              Paiement confirmé. Le rendez-vous et le suivi sont débloqués selon la prestation.
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-navy">Prestation</div>
            <div className="mt-1 text-xs text-muted">Contrat obligatoire + jalons de progression.</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Statut</div>
            <div className="mt-0.5 text-xs font-semibold text-text">
              {engagement ? engagement.status : engLoading ? "…" : "Aucune"}
            </div>
          </div>
        </div>

        {engError ? <div className="mt-2 whitespace-pre-wrap text-xs text-danger">{engError}</div> : null}

        {!engagement ? (
          <div className="mt-3 text-sm text-muted">Aucune prestation pour le moment.</div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-semibold text-muted">Contrat</div>
              <div className="mt-2 rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-text">{engagement.contractTitle}</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-text">
                  {engagement.contractBody || "(Contrat vide)"}
                </div>
              </div>
            </div>

            {engagement.status === "CONTRACT_SENT" ? (
              <div className="grid gap-2">
                <div className="text-xs text-muted">Signature requise pour démarrer la prestation.</div>
                <Input
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  placeholder="Nom complet (optionnel)"
                  disabled={signBusy}
                />
                <div className="flex justify-end">
                  <Button disabled={signBusy} onClick={() => void signContract()}>
                    Signer le contrat
                  </Button>
                </div>
              </div>
            ) : null}

            {engagement.signedAt ? (
              <div className="text-xs text-muted">
                Signé: {formatDateTime(engagement.signedAt)}
                {engagement.signedByName ? ` • ${engagement.signedByName}` : ""}
              </div>
            ) : null}

            {engagement.status === "SIGNED" ||
            engagement.status === "PAYMENT_REQUESTED" ||
            engagement.status === "PAID" ||
            engagement.status === "IN_PROGRESS" ||
            engagement.status === "COMPLETED" ? (
              <div className="space-y-1 text-sm">
                <div className="text-xs font-semibold text-muted">Jalons</div>
                <div className="text-sm text-text">
                  Analyse: {engagement.analyseDoneAt ? formatDateTime(engagement.analyseDoneAt) : "—"}
                </div>
                <div className="text-sm text-text">
                  Dossier: {engagement.dossierDoneAt ? formatDateTime(engagement.dossierDoneAt) : "—"}
                </div>
                <div className="text-sm text-text">
                  Soumission: {engagement.soumissionDoneAt ? formatDateTime(engagement.soumissionDoneAt) : "—"}
                </div>
              </div>
            ) : null}

            {engagement.paymentRequestedAt ? (
              <div className="text-xs text-muted">
                Paiement demandé: {formatDateTime(engagement.paymentRequestedAt)}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {item.meeting ? (
        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Rendez-vous</div>
          <div className="mt-1 text-sm text-text">
            {formatDateTime(item.meeting.startsAt)} • {item.meeting.durationMin} min
          </div>
          {item.meeting.locationUrl ? (
            <div className="mt-1 text-sm">
              <a className="text-primary underline" href={item.meeting.locationUrl} target="_blank" rel="noreferrer">
                Ouvrir le lien
              </a>
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted">Lien à venir.</div>
          )}
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="text-sm font-semibold text-navy">Boîte de réception</div>
        <div className="mt-3 space-y-2">
          {sortedMessages.length ? (
            sortedMessages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-(--radius-md) border p-3",
                  bubbleClass(m.senderRole),
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted">{senderLabel(m.senderRole)}</div>
                  <div className="text-xs text-muted">{formatDateTime(m.createdAt)}</div>
                </div>
                {m.kind === "FILE" && m.fileUrl ? (
                  <div className="mt-2 text-sm">
                    <a className="text-primary underline" href={m.fileUrl} target="_blank" rel="noreferrer">
                      {m.fileName ?? "Document"}
                    </a>
                  </div>
                ) : null}
                {m.body ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-text">{m.body}</div>
                ) : null}
                {!m.body && m.kind !== "FILE" ? (
                  <div className="mt-2 text-sm text-muted">({m.kind})</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted">Aucun message pour l’instant.</div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-navy">Envoyer un message</div>
        <div className="mt-3 grid gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Votre message (sans email/numéro si possible — l’échange reste encadré)."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Nom du document (optionnel)"
            />
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="URL upload (ex: /uploads/...)"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={refresh}>
              Actualiser
            </Button>
            <Button disabled={busy} onClick={send}>
              Envoyer
            </Button>
          </div>
          <div className="text-xs text-muted">
            MVP: l’envoi de document se fait via une URL locale (`/uploads/...`).
          </div>
          {error ? <div className="text-xs text-danger">{error}</div> : null}
        </div>
      </Card>
    </div>
  );
}
