"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NotificationItem = {
  id: string;
  user: { id: string; fullName: string; email: string };
  role: "DEMANDEUR" | "PRO";
  priority: "CRITICAL" | "IMPORTANT" | "INFO";
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

type ResponsePayload = {
  canAct: boolean;
  items: NotificationItem[];
  unavailable?: boolean;
};

type TemplateItem = {
  id: string;
  role: "DEMANDEUR" | "PRO";
  priority: "CRITICAL" | "IMPORTANT" | "INFO";
  type: string;
  title: string;
  message: string;
  link: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string;
  updatedByAdminId: string | null;
};

type TemplatesResponsePayload = {
  canAct: boolean;
  items: TemplateItem[];
  unavailable?: boolean;
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const roleOptions = ["", "DEMANDEUR", "PRO"] as const;
const priorityOptions = ["", "CRITICAL", "IMPORTANT", "INFO"] as const;
const readOptions = ["", "unread", "read"] as const;
const templateStatusOptions = ["", "ACTIVE", "ARCHIVED"] as const;

function priorityLabel(p: NotificationItem["priority"]) {
  return p === "CRITICAL" ? "Critique" : p === "IMPORTANT" ? "Important" : "Info";
}

function templateStatusLabel(archivedAt: string | null) {
  return archivedAt ? "Archivé" : "Actif";
}

export function AdminNotificationsPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  // Templates
  const [tplQ, setTplQ] = useState("");
  const [tplRole, setTplRole] = useState<(typeof roleOptions)[number]>("");
  const [tplStatus, setTplStatus] = useState<(typeof templateStatusOptions)[number]>("");

  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplUnavailable, setTplUnavailable] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [tplBusyById, setTplBusyById] = useState<Record<string, boolean>>({});

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<Exclude<(typeof roleOptions)[number], "">>("DEMANDEUR");
  const [formPriority, setFormPriority] = useState<Exclude<(typeof priorityOptions)[number], "">>("INFO");
  const [formType, setFormType] = useState("GENERIC");
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formLink, setFormLink] = useState("/notifications");

  const [tplInfo, setTplInfo] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setTplLoading(true);
    setTplError(null);
    setTplInfo(null);

    try {
      const params = new URLSearchParams();
      if (tplQ.trim()) params.set("q", tplQ.trim());
      if (tplRole) params.set("role", tplRole);
      if (tplStatus) params.set("status", tplStatus);
      const url = params.toString()
        ? `/api/admin/notifications/templates?${params.toString()}`
        : "/api/admin/notifications/templates";

      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as TemplatesResponsePayload & { error?: string };

      if (!res.ok) {
        setTplError(data.error ?? "Erreur serveur.");
        setTplUnavailable(false);
        setTemplates([]);
        return;
      }

      setTplUnavailable(!!data.unavailable);
      setTemplates(data.items ?? []);
    } catch {
      setTplError("Erreur réseau.");
      setTplUnavailable(false);
      setTemplates([]);
    } finally {
      setTplLoading(false);
    }
  }, [tplQ, tplRole, tplStatus]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setFormRole("DEMANDEUR");
    setFormPriority("INFO");
    setFormType("GENERIC");
    setFormTitle("");
    setFormMessage("");
    setFormLink("/notifications");
  }

  function startEditTemplate(t: TemplateItem) {
    setEditingTemplateId(t.id);
    setFormRole(t.role);
    setFormPriority(t.priority);
    setFormType(t.type);
    setFormTitle(t.title);
    setFormMessage(t.message);
    setFormLink(t.link);
    setTplInfo(null);
  }

  async function submitTemplate() {
    if (!canAct) return;
    setTplError(null);
    setTplInfo(null);

    const payload = {
      role: formRole,
      priority: formPriority,
      type: formType.trim(),
      title: formTitle.trim(),
      message: formMessage.trim(),
      link: formLink.trim(),
    };

    if (!payload.type || !payload.title || !payload.message || !payload.link) {
      setTplError("Champs requis: type, title, message, link.");
      return;
    }

    try {
      if (!editingTemplateId) {
        const res = await fetch("/api/admin/notifications/templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
        if (!res.ok) {
          setTplError(data.error ?? "Erreur serveur.");
          return;
        }
        setTplInfo("Template créé.");
        resetTemplateForm();
        await loadTemplates();
        return;
      }

      setTplBusyById((p) => ({ ...p, [editingTemplateId]: true }));
      const res = await fetch(`/api/admin/notifications/templates/${editingTemplateId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "UPDATE", ...payload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setTplError(data.error ?? "Erreur serveur.");
        return;
      }
      setTplInfo("Template mis à jour.");
      resetTemplateForm();
      await loadTemplates();
    } catch {
      setTplError("Erreur réseau.");
    } finally {
      if (editingTemplateId) setTplBusyById((p) => ({ ...p, [editingTemplateId]: false }));
    }
  }

  async function doTemplateAction(templateId: string, action: "ARCHIVE" | "RESTORE") {
    if (!canAct) return;

    setTplError(null);
    setTplInfo(null);
    setTplBusyById((p) => ({ ...p, [templateId]: true }));

    try {
      const res = await fetch(`/api/admin/notifications/templates/${templateId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setTplError(data.error ?? "Erreur serveur.");
        return;
      }
      setTplInfo(action === "ARCHIVE" ? "Template archivé." : "Template restauré.");
      if (editingTemplateId === templateId) resetTemplateForm();
      await loadTemplates();
    } catch {
      setTplError("Erreur réseau.");
    } finally {
      setTplBusyById((p) => ({ ...p, [templateId]: false }));
    }
  }

  // Envoi
  const [sendUserId, setSendUserId] = useState("");
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [sendOverrideType, setSendOverrideType] = useState("");
  const [sendOverrideTitle, setSendOverrideTitle] = useState("");
  const [sendOverrideMessage, setSendOverrideMessage] = useState("");
  const [sendOverrideLink, setSendOverrideLink] = useState("");
  const [sendOverridePriority, setSendOverridePriority] = useState<(typeof priorityOptions)[number]>("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendInfo, setSendInfo] = useState<string | null>(null);

  const activeTemplates = useMemo(() => templates.filter((t) => !t.archivedAt), [templates]);
  const selectedTemplate = useMemo(
    () => activeTemplates.find((t) => t.id === sendTemplateId) ?? null,
    [activeTemplates, sendTemplateId],
  );

  useEffect(() => {
    if (sendTemplateId && !selectedTemplate) {
      setSendTemplateId("");
    }
  }, [sendTemplateId, selectedTemplate]);

  async function sendNotification() {
    if (!canAct) return;
    setSendBusy(true);
    setSendError(null);
    setSendInfo(null);

    try {
      const payload: any = {
        userId: sendUserId.trim(),
        templateId: sendTemplateId.trim(),
      };

      const overrides: any = {};
      if (sendOverrideType.trim()) overrides.type = sendOverrideType.trim();
      if (sendOverrideTitle.trim()) overrides.title = sendOverrideTitle.trim();
      if (sendOverrideMessage.trim()) overrides.message = sendOverrideMessage.trim();
      if (sendOverrideLink.trim()) overrides.link = sendOverrideLink.trim();
      if (sendOverridePriority) overrides.priority = sendOverridePriority;
      if (Object.keys(overrides).length) payload.overrides = overrides;

      if (!payload.userId) {
        setSendError("userId requis.");
        return;
      }
      if (!payload.templateId) {
        setSendError("templateId requis.");
        return;
      }

      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; notificationId?: string; error?: string };
      if (!res.ok) {
        setSendError(data.error ?? "Erreur serveur.");
        return;
      }

      setSendInfo(`Notification envoyée (id: ${data.notificationId}).`);
      setSendOverrideType("");
      setSendOverrideTitle("");
      setSendOverrideMessage("");
      setSendOverrideLink("");
      setSendOverridePriority("");
      await load();
    } catch {
      setSendError("Erreur réseau.");
    } finally {
      setSendBusy(false);
    }
  }

  // Historique
  const [q, setQ] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("");
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]>("");
  const [read, setRead] = useState<(typeof readOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (role) params.set("role", role);
      if (priority) params.set("priority", priority);
      if (read) params.set("read", read);

      const url = params.toString() ? `/api/admin/notifications?${params.toString()}` : "/api/admin/notifications";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ResponsePayload & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        setUnavailable(false);
        setItems([]);
        return;
      }

      setUnavailable(!!data.unavailable);
      setItems(data.items ?? []);
    } catch {
      setError("Erreur réseau.");
      setUnavailable(false);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, role, priority, read]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Création et gestion de templates (V1).{!canAct && " Lecture seule (MODERATOR)."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-muted">
              {tplLoading ? "Chargement…" : `${templates.length} template(s)`}
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <div className="w-full lg:w-[320px]">
                <Input value={tplQ} onChange={(e) => setTplQ(e.target.value)} placeholder="Rechercher (titre, type, id)…" />
              </div>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[170px]"
                value={tplRole}
                onChange={(e) => setTplRole(e.target.value as (typeof roleOptions)[number])}
                aria-label="Filtrer rôle template"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r || "Tous rôles"}
                  </option>
                ))}
              </select>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
                value={tplStatus}
                onChange={(e) => setTplStatus(e.target.value as (typeof templateStatusOptions)[number])}
                aria-label="Filtrer statut template"
              >
                {templateStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "" ? "Actifs + archivés" : s === "ACTIVE" ? "Actifs" : "Archivés"}
                  </option>
                ))}
              </select>

              <Button variant="outline" onClick={() => void loadTemplates()} disabled={tplLoading}>
                Rafraîchir
              </Button>
            </div>
          </div>

          {tplUnavailable ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
              Templates indisponibles (migration en attente / DB non à jour).
            </div>
          ) : null}

          {tplError ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">{tplError}</div>
          ) : null}

          {tplInfo ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">{tplInfo}</div>
          ) : null}

          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-navy">
              {editingTemplateId ? "Modifier un template" : "Créer un template"}
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                aria-label="Rôle template"
                disabled={!canAct}
              >
                <option value="DEMANDEUR">DEMANDEUR</option>
                <option value="PRO">PRO</option>
              </select>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as any)}
                aria-label="Priorité template"
                disabled={!canAct}
              >
                <option value="INFO">INFO</option>
                <option value="IMPORTANT">IMPORTANT</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>

              <Input value={formType} onChange={(e) => setFormType(e.target.value)} placeholder="type (ex: JOB_STATUS)" disabled={!canAct} />
              <Input value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="link (ex: /notifications)" disabled={!canAct} />
            </div>

            <div className="mt-2 grid gap-2">
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="title" disabled={!canAct} />
              <Textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} placeholder="message" disabled={!canAct} />
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="primary" onClick={() => void submitTemplate()} disabled={!canAct}>
                {editingTemplateId ? "Enregistrer" : "Créer"}
              </Button>

              {editingTemplateId ? (
                <Button variant="outline" onClick={() => resetTemplateForm()}>
                  Annuler
                </Button>
              ) : null}

              {!canAct ? <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div> : null}
            </div>
          </div>

          {!tplLoading && !tplUnavailable && templates.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">Aucun template.</div>
          ) : null}

          <div className="space-y-2">
            {templates.map((t) => {
              const busy = tplBusyById[t.id] === true;
              const when = new Date(t.createdAt).toLocaleString();
              const status = templateStatusLabel(t.archivedAt);

              return (
                <div key={t.id} className="rounded-[var(--radius-md)] border border-border bg-white p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="text-sm font-semibold text-navy">{t.title}</div>
                    <div className="text-xs text-muted">{when}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {status} · {t.role} · {priorityLabel(t.priority)} · {t.type}
                  </div>
                  <div className="mt-2 text-sm text-muted">{t.message}</div>
                  <div className="mt-1 text-xs text-muted">Lien: {t.link}</div>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => startEditTemplate(t)} disabled={!canAct || busy}>
                      Modifier
                    </Button>

                    {!t.archivedAt ? (
                      <Button variant="outline" onClick={() => void doTemplateAction(t.id, "ARCHIVE")} disabled={!canAct || busy}>
                        Archiver
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => void doTemplateAction(t.id, "RESTORE")} disabled={!canAct || busy}>
                        Restaurer
                      </Button>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-muted">Template ID: {t.id}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envois</CardTitle>
          <CardDescription>
            Envoyer une notification à un utilisateur depuis un template (V1).{!canAct && " Lecture seule (MODERATOR)."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {sendError ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">{sendError}</div>
          ) : null}

          {sendInfo ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">{sendInfo}</div>
          ) : null}

          <div className="grid gap-2 lg:grid-cols-2">
            <Input value={sendUserId} onChange={(e) => setSendUserId(e.target.value)} placeholder="userId cible" disabled={!canAct || sendBusy} />

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text"
              value={sendTemplateId}
              onChange={(e) => setSendTemplateId(e.target.value)}
              aria-label="Choisir template"
              disabled={!canAct || sendBusy}
            >
              <option value="">Choisir un template…</option>
              {activeTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.type})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-navy">Overrides (optionnel)</div>
            <div className="grid gap-2 lg:grid-cols-2">
              <Input value={sendOverrideType} onChange={(e) => setSendOverrideType(e.target.value)} placeholder={`type (défaut: ${selectedTemplate?.type ?? "—"})`} disabled={!canAct || sendBusy} />
              <Input value={sendOverrideLink} onChange={(e) => setSendOverrideLink(e.target.value)} placeholder={`link (défaut: ${selectedTemplate?.link ?? "—"})`} disabled={!canAct || sendBusy} />
              <Input value={sendOverrideTitle} onChange={(e) => setSendOverrideTitle(e.target.value)} placeholder={`title (défaut: ${selectedTemplate?.title ?? "—"})`} disabled={!canAct || sendBusy} />
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text"
                value={sendOverridePriority}
                onChange={(e) => setSendOverridePriority(e.target.value as (typeof priorityOptions)[number])}
                aria-label="Override priorité"
                disabled={!canAct || sendBusy}
              >
                <option value="">priority (défaut: {selectedTemplate?.priority ?? "—"})</option>
                <option value="INFO">INFO</option>
                <option value="IMPORTANT">IMPORTANT</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div className="mt-2">
              <Textarea
                value={sendOverrideMessage}
                onChange={(e) => setSendOverrideMessage(e.target.value)}
                placeholder={`message (défaut: ${selectedTemplate ? selectedTemplate.message.slice(0, 120) + (selectedTemplate.message.length > 120 ? "…" : "") : "—"})`}
                disabled={!canAct || sendBusy}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="primary" onClick={() => void sendNotification()} disabled={!canAct || sendBusy}>
              Envoyer
            </Button>
            {!canAct ? <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>
            Notifications envoyées / générées (V1).{!canAct && " Lecture seule (MODERATOR)."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} notification(s)`}</div>

            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <div className="w-full lg:w-[320px]">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (user, titre, type, id)…" />
              </div>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[170px]"
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof roleOptions)[number])}
                aria-label="Filtrer rôle"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r || "Tous rôles"}
                  </option>
                ))}
              </select>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
                value={priority}
                onChange={(e) => setPriority(e.target.value as (typeof priorityOptions)[number])}
                aria-label="Filtrer priorité"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p || "Toutes priorités"}
                  </option>
                ))}
              </select>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
                value={read}
                onChange={(e) => setRead(e.target.value as (typeof readOptions)[number])}
                aria-label="Filtrer lu/non-lu"
              >
                {readOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === "" ? "Lu + non-lu" : r === "unread" ? "Non lues" : "Lues"}
                  </option>
                ))}
              </select>

              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                Rafraîchir
              </Button>
            </div>
          </div>

          {unavailable ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
              Notifications indisponibles (migration en attente / DB non à jour).
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">{error}</div>
          ) : null}

          {!loading && !unavailable && rows.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
              Aucune notification.
            </div>
          ) : null}

          <div className="space-y-3">
            {rows.map((n) => {
              const when = new Date(n.createdAt).toLocaleString();
              const isRead = !!n.readAt;

              return (
                <Card key={n.id} className="hover:translate-y-0">
                  <CardHeader>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <CardTitle className="text-base">
                        {n.title}{" "}
                        {!isRead ? <span className="text-xs font-semibold text-primary">(Non lue)</span> : null}
                      </CardTitle>
                      <div className="text-xs text-muted">{when}</div>
                    </div>
                    <CardDescription>
                      {priorityLabel(n.priority)} · {n.role} · {n.type}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted">{n.message}</div>

                    <div className="text-sm text-muted">
                      User: {" "}
                      <Link className="text-primary hover:underline" href={`/admin/users/${n.user.id}`}>
                        {n.user.fullName}
                      </Link>
                      <span className="text-muted"> · {n.user.email}</span>
                    </div>

                    {n.link ? (
                      <div className="text-sm">
                        Lien: {" "}
                        <Link className="text-primary hover:underline" href={n.link}>
                          {n.link}
                        </Link>
                      </div>
                    ) : null}

                    <div className="text-xs text-muted">Notification ID: {n.id}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
