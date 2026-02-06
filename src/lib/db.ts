import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

  const useNeonAdapter =
    process.env.USE_NEON_ADAPTER === "1" ||
    process.env.USE_NEON_ADAPTER === "true" ||
    process.env.USE_NEON_ADAPTER === "TRUE";

  if (!useNeonAdapter) {
    return new PrismaClient({ log: [...log] });
  }

  neonConfig.webSocketConstructor = ws;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when USE_NEON_ADAPTER is enabled");
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter, log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Alias for consistency with other files
export const db = prisma;
