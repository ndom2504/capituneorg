"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  consumeGoogleRedirectResult,
  formatFirebaseAuthError,
  shouldFallbackToRedirect,
  signInWithGooglePopup,
  startGoogleRedirect,
  signInWithMicrosoftPopup,
  startMicrosoftRedirect,
  consumeMicrosoftRedirectResult,
  signInWithLinkedInPopup,
  startLinkedInRedirect,
  consumeLinkedInRedirectResult,
} from "@/lib/firebase/client";

type Mode = "login" | "signup";

type AccountType = "USER" | "PROFESSIONAL";

type SignupState = {
  accountType: AccountType;
  firstName: string;
  lastName: string;
  email: string;
  password: string;

  // USER
  countryOfResidence: string;
  language: "FRANCAIS" | "ANGLAIS" | "AUTRE";
  mainObjective:
    | ""
    | "ETUDIER"
    | "TRAVAILLER"
    | "ENTREPRENDRE"
    | "FAMILLE"
    | "EXPLORER";
  budgetRange:
    | ""
    | "MOINS_3000"
    | "ENTRE_3000_7000"
    | "ENTRE_7000_15000"
    | "PLUS_15000"
    | "JE_NE_SAIS_PAS";
  primaryNeed: "" | "ORIENTATION" | "DOCUMENTS" | "PROFESSIONNEL" | "FORMATIONS";

  // PRO
  country: string;
  city: string;
  languages: string;
  profession:
    | ""
    | "IMMIGRATION_CONSULTANT"
    | "IMMIGRATION_LAWYER"
    | "ORIENTATION_COUNSELOR"
    | "ACADEMIC_COUNSELOR"
    | "EMPLOYMENT_COUNSELOR"
    | "CASE_MANAGER"
    | "CERTIFIED_TRANSLATOR"
    | "INTEGRATION_COACH"
    | "COMMUNITY_ORG";
  organization: string;
  websiteUrl: string;
  linkedinUrl: string;
  licenseNumber: string;
  licenseAuthority: string;
  proofUrl: string;
  bioShort: string;
  complianceAccepted: boolean;
  accuracyConfirmed: boolean;
};

type AuthApiResponse = {
  ok?: boolean;
  accountType?: "USER" | "PROFESSIONAL" | "ADMIN";
  isNewUser?: boolean;
  hasMarketplaceProfile?: boolean;
  error?: string;
};

function isProfessionalAccount(accountType: AuthApiResponse["accountType"] | string | undefined) {
  return accountType === "PROFESSIONAL" || accountType === "ADMIN";
}

function selectClassName() {
  return cn(
    "h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text",
    "placeholder:text-muted transition-[box-shadow,border-color,background-color]",
    "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  );
}

export default function AuthPage() {
  const handledRedirectRef = useRef(false);

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signup, setSignup] = useState<SignupState>({
    accountType: "USER",
    firstName: "",
    lastName: "",
    email: "",
    password: "",

    countryOfResidence: "",
    language: "FRANCAIS",
    mainObjective: "",
    budgetRange: "",
    primaryNeed: "",

    country: "",
    city: "",
    languages: "Français",
    profession: "",
    organization: "",
    websiteUrl: "",
    linkedinUrl: "",
    licenseNumber: "",
    licenseAuthority: "",
    proofUrl: "",
    bioShort: "",
    complianceAccepted: false,
    accuracyConfirmed: false,
  });

  const proLanguages = useMemo(() => {
    return signup.languages
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [signup.languages]);

  const exchangeGoogleToken = useCallback(async (idToken: string, accountType?: "USER" | "PROFESSIONAL") => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken, accountType }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthApiResponse;
    if (!res.ok) {
      setError(data.error ?? "Connexion Google impossible.");
      return;
    }

    const resolvedAccountType = data.accountType ?? "USER";
    const isNewUser = data.isNewUser ?? false;
    const hasMarketplaceProfile = data.hasMarketplaceProfile ?? false;

    // Déterminer la cible de redirection
    let target: string;
    if (isProfessionalAccount(resolvedAccountType)) {
      // Professionnel : première connexion OU pas de profil marketplace → marketplace-profil
      // Sinon → accueil
      target = isNewUser || !hasMarketplaceProfile ? "/clients/marketplace-profil" : "/accueil";
    } else {
      // Demandeur : première connexion → mon-parcours, sinon → accueil
      target = isNewUser ? "/mon-parcours" : "/accueil";
    }

    window.location.assign(target);
  }, []);

  const exchangeMicrosoftToken = useCallback(async (idToken: string, accountType?: "USER" | "PROFESSIONAL") => {
    const res = await fetch("/api/auth/microsoft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken, accountType }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthApiResponse;
    if (!res.ok) {
      setError(data.error ?? "Connexion Microsoft impossible.");
      return;
    }

    const resolvedAccountType = data.accountType ?? "USER";
    const isNewUser = data.isNewUser ?? false;
    const hasMarketplaceProfile = data.hasMarketplaceProfile ?? false;

    let target: string;
    if (isProfessionalAccount(resolvedAccountType)) {
      target = isNewUser || !hasMarketplaceProfile ? "/clients/marketplace-profil" : "/accueil";
    } else {
      target = isNewUser ? "/mon-parcours" : "/accueil";
    }

    window.location.assign(target);
  }, []);

  const exchangeLinkedInToken = useCallback(async (idToken: string, accountType?: "USER" | "PROFESSIONAL") => {
    const res = await fetch("/api/auth/linkedin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken, accountType }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthApiResponse;
    if (!res.ok) {
      setError(data.error ?? "Connexion LinkedIn impossible.");
      return;
    }

    const resolvedAccountType = data.accountType ?? "USER";
    const isNewUser = data.isNewUser ?? false;
    const hasMarketplaceProfile = data.hasMarketplaceProfile ?? false;

    let target: string;
    if (isProfessionalAccount(resolvedAccountType)) {
      target = isNewUser || !hasMarketplaceProfile ? "/clients/marketplace-profil" : "/accueil";
    } else {
      target = isNewUser ? "/mon-parcours" : "/accueil";
    }

    window.location.assign(target);
  }, []);

  useEffect(() => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;

    (async () => {
      try {
        const result = await consumeGoogleRedirectResult();
        if (!result) return;
        setError(null);
        setLoading(true);

        const desired = sessionStorage.getItem("capitune_google_accountType") ?? "";
        sessionStorage.removeItem("capitune_google_accountType");
        const accountType = desired === "PROFESSIONAL" || desired === "USER" ? desired : undefined;
        await exchangeGoogleToken(result.idToken, accountType);
      } catch (e) {
        setError(formatFirebaseAuthError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [exchangeGoogleToken]);

  useEffect(() => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;

    (async () => {
      try {
        const result = await consumeMicrosoftRedirectResult();
        if (!result) return;
        setError(null);
        setLoading(true);

        const desired = sessionStorage.getItem("capitune_microsoft_accountType") ?? "";
        sessionStorage.removeItem("capitune_microsoft_accountType");
        const accountType = desired === "PROFESSIONAL" || desired === "USER" ? desired : undefined;
        await exchangeMicrosoftToken(result.idToken, accountType);
      } catch (e) {
        setError(formatFirebaseAuthError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [exchangeMicrosoftToken]);

  useEffect(() => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;

    (async () => {
      try {
        const result = await consumeLinkedInRedirectResult();
        if (!result) return;
        setError(null);
        setLoading(true);

        const desired = sessionStorage.getItem("capitune_linkedin_accountType") ?? "";
        sessionStorage.removeItem("capitune_linkedin_accountType");
        const accountType = desired === "PROFESSIONAL" || desired === "USER" ? desired : undefined;
        await exchangeLinkedInToken(result.idToken, accountType);
      } catch (e) {
        setError(formatFirebaseAuthError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [exchangeLinkedInToken]);

  async function onGoogle() {
    setError(null);
    setLoading(true);
    try {
      const desiredAccountType = mode === "signup" ? signup.accountType : undefined;
      sessionStorage.setItem("capitune_google_accountType", desiredAccountType ?? "");

      const { idToken } = await signInWithGooglePopup();
      await exchangeGoogleToken(idToken, desiredAccountType);
    } catch (e) {
      if (shouldFallbackToRedirect(e)) {
        await startGoogleRedirect();
        return;
      }
      setError(formatFirebaseAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onMicrosoft() {
    setError(null);
    setLoading(true);
    try {
      const desiredAccountType = mode === "signup" ? signup.accountType : undefined;
      sessionStorage.setItem("capitune_microsoft_accountType", desiredAccountType ?? "");

      const { idToken } = await signInWithMicrosoftPopup();
      await exchangeMicrosoftToken(idToken, desiredAccountType);
    } catch (e) {
      if (shouldFallbackToRedirect(e)) {
        await startMicrosoftRedirect();
        return;
      }
      setError(formatFirebaseAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onLinkedIn() {
    setError(null);
    setLoading(true);
    try {
      const desiredAccountType = mode === "signup" ? signup.accountType : undefined;
      sessionStorage.setItem("capitune_linkedin_accountType", desiredAccountType ?? "");

      const { idToken } = await signInWithLinkedInPopup();
      await exchangeLinkedInToken(idToken, desiredAccountType);
    } catch (e) {
      if (shouldFallbackToRedirect(e)) {
        await startLinkedInRedirect();
        return;
      }
      setError(formatFirebaseAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as AuthApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        return;
      }

      const accountType = data.accountType ?? "USER";
      const hasMarketplaceProfile = data.hasMarketplaceProfile ?? false;

      // Déterminer la cible de redirection
      let target: string;
      if (isProfessionalAccount(accountType)) {
        // Professionnel : pas de profil marketplace → marketplace-profil, sinon → accueil
        target = !hasMarketplaceProfile ? "/clients/marketplace-profil" : "/accueil";
      } else {
        // Demandeur : au login, ils sont déjà inscrits → accueil
        target = "/accueil";
      }

      window.location.assign(target);
    } finally {
      setLoading(false);
    }
  }

  async function onSignupSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        accountType: signup.accountType,
        firstName: signup.firstName,
        lastName: signup.lastName,
        email: signup.email,
        password: signup.password,
      };

      if (signup.accountType === "USER") {
        payload.countryOfResidence = signup.countryOfResidence;
        payload.language = signup.language;
        if (signup.mainObjective) payload.mainObjective = signup.mainObjective;
        if (signup.budgetRange) payload.budgetRange = signup.budgetRange;
        if (signup.primaryNeed) payload.primaryNeed = signup.primaryNeed;
      }

      if (signup.accountType === "PROFESSIONAL") {
        payload.country = signup.country;
        payload.city = signup.city;
        payload.languages = proLanguages;
        payload.profession = signup.profession;
        payload.organization = signup.organization || null;
        payload.websiteUrl = signup.websiteUrl || null;
        payload.linkedinUrl = signup.linkedinUrl || null;
        payload.licenseNumber = signup.licenseNumber || null;
        payload.licenseAuthority = signup.licenseAuthority || null;
        payload.proofUrl = signup.proofUrl;
        payload.bioShort = signup.bioShort || null;
        payload.complianceAccepted = signup.complianceAccepted;
        payload.accuracyConfirmed = signup.accuracyConfirmed;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as AuthApiResponse;
      if (!res.ok) {
        setError(data.error ?? "Inscription impossible.");
        return;
      }

      const accountType = data.accountType ?? signup.accountType;
      // Signup = toujours première fois : professionnel → marketplace-profil, demandeur → mon-parcours
      window.location.assign(
        isProfessionalAccount(accountType) ? "/clients/marketplace-profil" : "/mon-parcours",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="capitune-auth min-h-dvh">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:py-14 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-primary">CAPITUNE</div>
            <h1 className="mt-2 text-3xl font-semibold text-navy">
              Accès espace Demandeur / Professionnel
            </h1>
            <p className="mt-2 text-sm text-muted">
              Connectez-vous pour accéder à votre dashboard. Les profils professionnels sont
              visibles en Marketplace uniquement après validation.
            </p>
          </div>

          <Card className="border-primary/15 bg-white/60">
            <CardHeader>
              <CardTitle>Ce que vous obtenez</CardTitle>
              <CardDescription>
                Un flux structuré (pas de DM) et un suivi clair.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text">
              <ul className="list-disc space-y-2 pl-5">
                <li>Demandeurs: parcours, dossier, événements, demandes Marketplace.</li>
                <li>Pros: gestion des demandes, décisions, rendez-vous, profil Marketplace.</li>
                <li>Messagerie structurée par demande (documents via liens /uploads).</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-white/75">
          <CardHeader className="space-y-3">
            <div className="flex rounded-[var(--radius-md)] border border-border bg-white/60 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={cn(
                  "flex-1 rounded-[calc(var(--radius-md)-2px)] px-3 py-2 text-sm font-semibold",
                  mode === "login" ? "bg-primary/12 text-navy" : "text-muted hover:bg-black/5",
                )}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={cn(
                  "flex-1 rounded-[calc(var(--radius-md)-2px)] px-3 py-2 text-sm font-semibold",
                  mode === "signup" ? "bg-primary/12 text-navy" : "text-muted hover:bg-black/5",
                )}
              >
                Inscription
              </button>
            </div>

            <div>
              <CardTitle>{mode === "login" ? "Se connecter" : "Créer un compte"}</CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Entrez votre email et votre mot de passe."
                  : "Choisissez votre parcours: demandeur ou professionnel."}
              </CardDescription>
            </div>

            {error ? (
              <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
                Continuer avec Google
              </Button>
              <Button variant="outline" className="w-full" onClick={onMicrosoft} disabled={loading}>
                Continuer avec Microsoft
              </Button>
              <Button variant="outline" className="w-full" onClick={onLinkedIn} disabled={loading}>
                Continuer avec LinkedIn
              </Button>
              {mode === "signup" && signup.accountType === "PROFESSIONAL" ? (
                <div className="text-xs text-muted">
                  L'authentification sociale est activée pour les demandeurs. Pour un compte professionnel, utilisez l'inscription par email
                  (vérification requise).
                </div>
              ) : null}
              <div className="my-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/70" />
                <div className="text-xs text-muted">ou</div>
                <div className="h-px flex-1 bg-border/70" />
              </div>
            </div>

            {mode === "login" ? (
              <form onSubmit={onLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-navy">Email</label>
                  <Input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-navy">Mot de passe</label>
                  <Input
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Connexion…" : "Connexion"}
                </Button>
              </form>
            ) : (
              <form onSubmit={onSignupSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-navy">Prénom</label>
                    <Input
                      value={signup.firstName}
                      onChange={(e) => setSignup((s) => ({ ...s, firstName: e.target.value }))}
                      placeholder="Prénom"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-navy">Nom</label>
                    <Input
                      value={signup.lastName}
                      onChange={(e) => setSignup((s) => ({ ...s, lastName: e.target.value }))}
                      placeholder="Nom"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-navy">Email</label>
                  <Input
                    value={signup.email}
                    onChange={(e) => setSignup((s) => ({ ...s, email: e.target.value }))}
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-navy">Mot de passe</label>
                  <Input
                    value={signup.password}
                    onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))}
                    type="password"
                    autoComplete="new-password"
                    placeholder="8 caractères minimum"
                    required
                  />
                  <div className="text-xs text-muted">Astuce: 12+ caractères recommandé.</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-navy">Type de compte</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignup((s) => ({ ...s, accountType: "USER" }))}
                      className={cn(
                        "rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm",
                        signup.accountType === "USER"
                          ? "border-primary/30 bg-primary/10"
                          : "border-border bg-white/60 hover:bg-white",
                      )}
                    >
                      <div className="font-semibold text-navy">Demandeur</div>
                      <div className="mt-0.5 text-xs text-muted">Parcours, dossier, marketplace.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignup((s) => ({ ...s, accountType: "PROFESSIONAL" }))}
                      className={cn(
                        "rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm",
                        signup.accountType === "PROFESSIONAL"
                          ? "border-primary/30 bg-primary/10"
                          : "border-border bg-white/60 hover:bg-white",
                      )}
                    >
                      <div className="font-semibold text-navy">Professionnel</div>
                      <div className="mt-0.5 text-xs text-muted">Dashboard Clients + profil Marketplace.</div>
                    </button>
                  </div>
                </div>

                {signup.accountType === "USER" ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-navy">Pays de résidence</label>
                      <Input
                        value={signup.countryOfResidence}
                        onChange={(e) =>
                          setSignup((s) => ({ ...s, countryOfResidence: e.target.value }))
                        }
                        placeholder="Ex: France"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Langue</label>
                        <select
                          className={selectClassName()}
                          value={signup.language}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, language: e.target.value as SignupState["language"] }))
                          }
                        >
                          <option value="FRANCAIS">Français</option>
                          <option value="ANGLAIS">Anglais</option>
                          <option value="AUTRE">Autre</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Objectif (optionnel)</label>
                        <select
                          className={selectClassName()}
                          value={signup.mainObjective}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, mainObjective: e.target.value as SignupState["mainObjective"] }))
                          }
                        >
                          <option value="">—</option>
                          <option value="ETUDIER">Étudier</option>
                          <option value="TRAVAILLER">Travailler</option>
                          <option value="ENTREPRENDRE">Entreprendre</option>
                          <option value="FAMILLE">Famille</option>
                          <option value="EXPLORER">Explorer</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Budget (optionnel)</label>
                        <select
                          className={selectClassName()}
                          value={signup.budgetRange}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, budgetRange: e.target.value as SignupState["budgetRange"] }))
                          }
                        >
                          <option value="">—</option>
                          <option value="MOINS_3000">Moins de 3 000</option>
                          <option value="ENTRE_3000_7000">3 000 – 7 000</option>
                          <option value="ENTRE_7000_15000">7 000 – 15 000</option>
                          <option value="PLUS_15000">Plus de 15 000</option>
                          <option value="JE_NE_SAIS_PAS">Je ne sais pas</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Besoin principal (optionnel)</label>
                        <select
                          className={selectClassName()}
                          value={signup.primaryNeed}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, primaryNeed: e.target.value as SignupState["primaryNeed"] }))
                          }
                        >
                          <option value="">—</option>
                          <option value="ORIENTATION">Orientation</option>
                          <option value="DOCUMENTS">Documents</option>
                          <option value="PROFESSIONNEL">Trouver un pro</option>
                          <option value="FORMATIONS">Formations</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Pays</label>
                        <Input
                          value={signup.country}
                          onChange={(e) => setSignup((s) => ({ ...s, country: e.target.value }))}
                          placeholder="Ex: Canada"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Ville</label>
                        <Input
                          value={signup.city}
                          onChange={(e) => setSignup((s) => ({ ...s, city: e.target.value }))}
                          placeholder="Ex: Montréal"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Langues</label>
                        <Input
                          value={signup.languages}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, languages: e.target.value }))
                          }
                          placeholder="Français, Anglais"
                          required
                        />
                        <div className="text-xs text-muted">
                          Séparez par des virgules. Exemple: Français, Anglais
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Métier</label>
                        <select
                          className={selectClassName()}
                          value={signup.profession}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, profession: e.target.value as SignupState["profession"] }))
                          }
                          required
                        >
                          <option value="">Choisir…</option>
                          <option value="IMMIGRATION_CONSULTANT">Consultant immigration</option>
                          <option value="IMMIGRATION_LAWYER">Avocat immigration</option>
                          <option value="ORIENTATION_COUNSELOR">Conseiller orientation</option>
                          <option value="ACADEMIC_COUNSELOR">Conseiller académique</option>
                          <option value="EMPLOYMENT_COUNSELOR">Conseiller emploi</option>
                          <option value="CASE_MANAGER">Case manager</option>
                          <option value="CERTIFIED_TRANSLATOR">Traducteur certifié</option>
                          <option value="INTEGRATION_COACH">Coach intégration</option>
                          <option value="COMMUNITY_ORG">Organisation communautaire</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Organisation (optionnel)</label>
                        <Input
                          value={signup.organization}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, organization: e.target.value }))
                          }
                          placeholder="Cabinet / société"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Site (optionnel)</label>
                        <Input
                          value={signup.websiteUrl}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, websiteUrl: e.target.value }))
                          }
                          placeholder="https://…"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">LinkedIn (optionnel)</label>
                        <Input
                          value={signup.linkedinUrl}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, linkedinUrl: e.target.value }))
                          }
                          placeholder="https://linkedin.com/in/…"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Justificatif (URL)</label>
                        <Input
                          value={signup.proofUrl}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, proofUrl: e.target.value }))
                          }
                          placeholder="/uploads/… ou https://…"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">N° licence (optionnel)</label>
                        <Input
                          value={signup.licenseNumber}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, licenseNumber: e.target.value }))
                          }
                          placeholder="RCIC / Barreau / …"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-navy">Autorité (optionnel)</label>
                        <Input
                          value={signup.licenseAuthority}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, licenseAuthority: e.target.value }))
                          }
                          placeholder="Ex: CICC"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-navy">Bio courte (optionnel)</label>
                      <Textarea
                        value={signup.bioShort}
                        onChange={(e) => setSignup((s) => ({ ...s, bioShort: e.target.value }))}
                        rows={3}
                        placeholder="2–3 phrases. Vos spécialités, votre approche…"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={signup.complianceAccepted}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, complianceAccepted: e.target.checked }))
                          }
                          className="mt-1"
                          required
                        />
                        <span>
                          J’accepte les engagements de conformité (pas de promesses illégitimes,
                          confidentialité, etc.).
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={signup.accuracyConfirmed}
                          onChange={(e) =>
                            setSignup((s) => ({ ...s, accuracyConfirmed: e.target.checked }))
                          }
                          className="mt-1"
                          required
                        />
                        <span>Je confirme l’exactitude des informations fournies.</span>
                      </label>
                    </div>

                    <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Après inscription, votre profil reste en mode privé (en vérification). La
                      visibilité Marketplace arrive une fois validé.
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Création…" : "Créer mon compte"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
