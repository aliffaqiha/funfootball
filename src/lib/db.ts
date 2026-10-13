import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let moduleClient: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (moduleClient) return moduleClient;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL lokal Anda."
    );
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  moduleClient = client;
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
