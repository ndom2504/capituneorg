"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MaintenanceSetting = {
  enabled: boolean;
  message: string;
};

type FeatureFlagsSetting = {
  community: boolean;
  events: boolean;
  jobs: boolean;
  marketplace: boolean;
  messaging: boolean;
  notifications: boolean;
  presence: boolean;
  proNetwork: boolean;
};

type GetResponse = {
  canAct: boolean;
  viewerRole: "ADMIN" | "MODERATOR";
  maintenance: MaintenanceSetting;
  featureFlags: FeatureFlagsSetting;
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm">
      <span className="font-medium text-navy">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-navy"
      />
    </label>
  );
}

export function AdminPlatformSettingsPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const [flags, setFlags] = useState<FeatureFlagsSetting>({
    community: true,
    events: true,
    jobs: true,
    marketplace: true,
    messaging: true,
    notifications: true,
    presence: true,
    proNetwork: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOkMsg(null);

    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = (await res.json()) as (GetResponse & { error?: string }) | { error?: string };
      if (!res.ok) {
        const err = "error" in data ? data.error : undefined;
        setError(err ?? "Erreur serveur.");
        return;
      }

      const d = data as GetResponse;
      setMaintenanceEnabled(Boolean(d.maintenance?.enabled));
      setMaintenanceMessage(String(d.maintenance?.message ?? ""));
      setFlags({
        community: d.featureFlags?.community !== false,
        events: d.featureFlags?.events !== false,
        jobs: d.featureFlags?.jobs !== false,
        marketplace: d.featureFlags?.marketplace !== false,
        messaging: d.featureFlags?.messaging !== false,
        notifications: d.featureFlags?.notifications !== false,
        presence: d.featureFlags?.presence !== false,
        proNetwork: d.featureFlags?.proNetwork !== false,
      });
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const payload = useMemo(
    () => ({
      maintenance: { enabled: maintenanceEnabled, message: maintenanceMessage },
      featureFlags: flags,
    }),
    [maintenanceEnabled, maintenanceMessage, flags],
  );

  async function save() {
    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      setOkMsg("Enregistré.");
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted">Chargement…</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(error || okMsg) && (
        <Card className="p-4">
          {error ? <div className="text-sm text-red-700">{error}</div> : null}
          {okMsg ? <div className="text-sm text-navy">{okMsg}</div> : null}
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-navy">Maintenance</div>
            <div className="text-xs text-muted">Mode maintenance global (V1).</div>
          </div>

          <Button onClick={save} disabled={!canAct || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <ToggleRow
            label="Activer la maintenance"
            checked={maintenanceEnabled}
            disabled={!canAct || saving}
            onChange={setMaintenanceEnabled}
          />

          <div>
            <div className="text-xs font-semibold text-navy">Message</div>
            <Input
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Ex: Maintenance en cours, retour prévu à 18h."
              disabled={!canAct || saving}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-navy">Feature flags</div>
        <div className="mt-1 text-xs text-muted">Drapeaux plateforme (V1).</div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleRow
            label="Communauté"
            checked={flags.community}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, community: next }))}
          />
          <ToggleRow
            label="Événements"
            checked={flags.events}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, events: next }))}
          />
          <ToggleRow
            label="Emploi"
            checked={flags.jobs}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, jobs: next }))}
          />
          <ToggleRow
            label="Marketplace"
            checked={flags.marketplace}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, marketplace: next }))}
          />
          <ToggleRow
            label="Messagerie"
            checked={flags.messaging}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, messaging: next }))}
          />
          <ToggleRow
            label="Notifications"
            checked={flags.notifications}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, notifications: next }))}
          />
          <ToggleRow
            label="Présence"
            checked={flags.presence}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, presence: next }))}
          />
          <ToggleRow
            label="Réseau pro"
            checked={flags.proNetwork}
            disabled={!canAct || saving}
            onChange={(next) => setFlags((p) => ({ ...p, proNetwork: next }))}
          />
        </div>

        {!canAct ? (
          <div className="mt-3 text-xs text-muted">Lecture seule (MODERATOR).</div>
        ) : null}
      </Card>
    </div>
  );
}
