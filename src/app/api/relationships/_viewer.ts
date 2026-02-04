export async function getViewer() {
  const mod = await import("@/lib/auth/viewer");
  const viewer = await mod.getAppViewer();
  if (!viewer) return null;
  return { id: viewer.id, accountType: viewer.accountType, isCertified: viewer.isCertified };
}
