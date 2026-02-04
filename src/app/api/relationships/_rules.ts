import type { AccountType } from "@prisma/client";

export type Viewer = {
  id: string;
  accountType: AccountType;
  isCertified: boolean;
};

export type Target = {
  id: string;
  accountType: AccountType;
  isCertified: boolean;
};

function professionalCertified(user: { accountType: AccountType; isCertified: boolean }) {
  return user.accountType === "PROFESSIONAL" && user.isCertified;
}

export function canFollow(viewer: Viewer, target: Target) {
  if (viewer.id === target.id) return { ok: false, reason: "Impossible de vous suivre vous-même." };

  // Deux demandeurs ne peuvent pas se suivre
  if (viewer.accountType === "USER" && target.accountType === "USER") {
    return { ok: false, reason: "Deux demandeurs ne peuvent pas se suivre." };
  }

  // Si un professionnel est impliqué, il doit être certifié
  if (viewer.accountType === "PROFESSIONAL" && !professionalCertified(viewer)) {
    return { ok: false, reason: "Compte professionnel non certifié." };
  }
  if (target.accountType === "PROFESSIONAL" && !professionalCertified(target)) {
    return { ok: false, reason: "Professionnel non certifié." };
  }

  // USER <-> PROFESSIONAL (certifié) ou PROFESSIONAL <-> PROFESSIONAL
  return { ok: true as const };
}

export function canContact(viewer: Viewer, target: Target) {
  if (viewer.id === target.id) return { ok: false, reason: "Impossible de vous contacter vous-même." };

  if (viewer.accountType === "USER" && target.accountType === "USER") {
    return { ok: false, reason: "Deux demandeurs ne peuvent pas se contacter." };
  }

  if (viewer.accountType === "PROFESSIONAL" && !professionalCertified(viewer)) {
    return { ok: false, reason: "Compte professionnel non certifié." };
  }
  if (target.accountType === "PROFESSIONAL" && !professionalCertified(target)) {
    return { ok: false, reason: "Professionnel non certifié." };
  }

  return { ok: true as const };
}

export function canPartnership(viewer: Viewer, target: Target) {
  if (viewer.id === target.id) return { ok: false, reason: "Impossible de demander un partenariat à vous-même." };

  if (viewer.accountType !== "PROFESSIONAL" || target.accountType !== "PROFESSIONAL") {
    return { ok: false, reason: "Le partenariat est réservé aux professionnels." };
  }

  if (!professionalCertified(viewer) || !professionalCertified(target)) {
    return { ok: false, reason: "Partenariat réservé aux professionnels certifiés." };
  }

  return { ok: true as const };
}
