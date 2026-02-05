import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function makeMissingDatabaseProxy(): PrismaClient {
  const err = new Error(
    'DATABASE_URL is not configured. This deployment can build, but database-backed routes will fail until you set DATABASE_URL in your environment.'
  )
  // Proxy delays failure until a prisma property is actually used.
  return new Proxy({} as PrismaClient, {
    get() {
      throw err
    },
  })
}

export const prisma =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL ? new PrismaClient() : makeMissingDatabaseProxy())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
