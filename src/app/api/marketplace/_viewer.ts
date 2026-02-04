import { getAppViewer } from "@/lib/auth/viewer";

export type MarketplaceViewer = {
  id: string;
  fullName: string;
  email: string;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  isCertified: boolean;
};

export async function getViewer(): Promise<MarketplaceViewer | null> {
  const viewer = await getAppViewer();
  if (!viewer) return null;
  return {
    id: viewer.id,
    fullName: viewer.fullName,
    email: viewer.email,
    accountType: viewer.accountType,
    isCertified: viewer.isCertified,
  };
}

export function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}
