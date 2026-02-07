import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdminViewer } from "@/app/api/admin/_auth";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedActions = new Set<AuditAction>([
  "VERIFY_PRO",
  "REJECT_PRO",
  "SUSPEND_USER",
  "SUSPEND_PROFILE",
  "REACTIVATE_USER",
  "FORCE_LOGOUT",
  "ADD_ADMIN_NOTE",
  "REPORT_REVIEW",
  "REPORT_RESOLVE",
  "REPORT_DISMISS",
  "HIDE_POST",
  "RESTORE_POST",
  "DELETE_COMMENT",
  "LOCK_COMMENTS",
  "UNLOCK_COMMENTS",
  "PIN_POST",
  "UNPIN_POST",
  "BAN_COMMUNITY",
  "UNBAN_COMMUNITY",
]);

export async function GET(req: NextRequest) {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const actionParam = (req.nextUrl.searchParams.get("action") ?? "").trim();
  const objectType = (req.nextUrl.searchParams.get("objectType") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;

  const action = allowedActions.has(actionParam as AuditAction) ? (actionParam as AuditAction) : undefined;

  const items = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(objectType ? { objectType } : {}),
      ...(q
        ? {
            OR: [
              { objectId: { contains: q, mode: "insensitive" } },
              { objectType: { contains: q, mode: "insensitive" } },
              { admin: { fullName: { contains: q, mode: "insensitive" } } },
              { admin: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      objectType: true,
      objectId: true,
      createdAt: true,
      admin: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      action: it.action,
      objectType: it.objectType,
      objectId: it.objectId,
      createdAt: it.createdAt.toISOString(),
      admin: it.admin,
    })),
  });
}
