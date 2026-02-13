import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdminViewer } from "@/app/api/admin/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
type AccountType = "USER" | "PROFESSIONAL" | "ADMIN";

export async function GET(req: NextRequest) {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const statusParam = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const typeParam = (req.nextUrl.searchParams.get("type") ?? "").trim();

  const status: AccountStatus | null =
    statusParam === "ACTIVE" || statusParam === "SUSPENDED" || statusParam === "DELETED"
      ? (statusParam as AccountStatus)
      : null;

  const accountType: AccountType | null =
    typeParam === "USER" || typeParam === "PROFESSIONAL" || typeParam === "ADMIN"
      ? (typeParam as AccountType)
      : null;

  const where = {
    ...(status ? { accountStatus: status } : {}),
    ...(accountType ? { accountType } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { fullName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      accountType: true,
      adminRole: true,
      accountStatus: true,
      suspendedAt: true,
      deletedAt: true,
      createdAt: true,
      professionalProfile: {
        select: {
          id: true,
          verificationStatus: true,
        },
      },
    },
  });

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      avatarUrl: u.avatarUrl,
      accountType: u.accountType,
      adminRole: u.adminRole,
      accountStatus: u.accountStatus,
      suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
      deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      professionalProfile: u.professionalProfile
        ? {
            id: u.professionalProfile.id,
            verificationStatus: u.professionalProfile.verificationStatus,
          }
        : null,
    })),
  });
}
