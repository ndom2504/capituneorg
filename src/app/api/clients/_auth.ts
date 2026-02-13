import { NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";

export type ViewerAuth = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  isCertified: boolean;
  verificationStatus?: "DRAFT" | "PENDING" | "VERIFIED" | "CERTIFIED" | "REJECTED" | "SUSPENDED";
};

export async function requireProfessionalViewer(): Promise<
  | { ok: true; viewer: ViewerAuth }
  | { ok: false; response: NextResponse }
> {
  // Session si dispo, sinon fallback en mode démo (CAPITUNE_VIEWER_EMAIL).
  const viewer = await getAppViewer();

  if (!viewer) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 },
      ),
    };
  }

  const canAccess = viewer.accountType === "ADMIN" || viewer.accountType === "PROFESSIONAL";

  if (!canAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Accès réservé aux professionnels." },
        { status: 403 },
      ),
    };
  }
  
  // Restriction: SEULS les Certified (ou Admin) accèdent aux clients
  if (viewer.accountType !== "ADMIN" && viewer.verificationStatus !== "CERTIFIED") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Accès restreint aux professionnels certifiés (Diplôme validé)." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, viewer };
}
