import { VerificationStatus, ProfileBadgeType } from "@prisma/client";
import { BadgeCheck, Award, Star } from "lucide-react";

/**
 * Badge de vérification pour profils marketplace.
 * 
 * V1 Spec:
 * - Affiche badge uniquement si verificationStatus === VERIFIED
 * - Types de badges: VERIFIED, PARTNER, TOP_CONTRIBUTOR, REGULATED_PROFESSION, EXPERT
 * - Badge "En vérification" si PENDING
 * - Rien si DRAFT/REJECTED/SUSPENDED
 */
interface VerifiedBadgeProps {
  verificationStatus: VerificationStatus;
  badges?: ProfileBadgeType[] | null;
  size?: "sm" | "md" | "lg";
  showPending?: boolean; // Afficher "En vérification" si PENDING
}

export function VerifiedBadge({
  verificationStatus,
  badges = null,
  size = "md",
  showPending = false,
}: VerifiedBadgeProps) {
  // Badge "En vérification" pour PENDING
  if (showPending && verificationStatus === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-navy">
        <BadgeCheck className="w-3 h-3" />
        En vérification
      </span>
    );
  }

  // Rien à afficher si pas vérifié
  if (verificationStatus !== "VERIFIED") {
    return null;
  }

  // Tailles
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const iconSize = sizeClasses[size];

  // Badge VERIFIED par défaut
  const hasBadges = badges && badges.length > 0;

  return (
    <div className="inline-flex items-center gap-1">
      {/* Badge vérifié */}
      <BadgeCheck className={`${iconSize} text-primary`} aria-label="Profil vérifié" />

      {/* Badges supplémentaires */}
      {hasBadges && badges.includes("PARTNER" as ProfileBadgeType) && (
        <Award className={`${iconSize} text-primary`} aria-label="Partenaire" />
      )}

      {hasBadges && badges.includes("TOP_CONTRIBUTOR" as ProfileBadgeType) && (
        <Star className={`${iconSize} text-yellow-500 fill-yellow-500`} aria-label="Top contributeur" />
      )}

      {hasBadges && badges.includes("REGULATED_PROFESSION" as ProfileBadgeType) && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-navy">
          Réglementé
        </span>
      )}

      {hasBadges && badges.includes("EXPERT" as ProfileBadgeType) && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-navy">
          Expert
        </span>
      )}
    </div>
  );
}

/**
 * Badge vérifié inline (texte + icône).
 * Usage pour afficher dans un titre ou à côté d'un nom.
 */
interface VerifiedBadgeInlineProps {
  verificationStatus: VerificationStatus;
  badges?: ProfileBadgeType[] | null;
}

export function VerifiedBadgeInline({
  verificationStatus,
  badges = null,
}: VerifiedBadgeInlineProps) {
  if (verificationStatus !== "VERIFIED") {
    return null;
  }

  const hasBadges = badges && badges.length > 0;

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <BadgeCheck className="w-4 h-4 text-primary" />
      
      {hasBadges && badges.includes("PARTNER" as ProfileBadgeType) && (
        <Award className="w-4 h-4 text-primary" />
      )}

      {hasBadges && badges.includes("TOP_CONTRIBUTOR" as ProfileBadgeType) && (
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
      )}

      {hasBadges && badges.includes("REGULATED_PROFESSION" as ProfileBadgeType) && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-navy">
          Réglementé
        </span>
      )}

      {hasBadges && badges.includes("EXPERT" as ProfileBadgeType) && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-navy">
          Expert
        </span>
      )}
    </span>
  );
}
