import path from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL?.trim() || 'file:./dev.db';

// Dynamic PrismaClient to avoid build-time @prisma/client dependency
let _prisma: any = null;

function createPrismaClient() {
  try {
    // Try to import PrismaClient at runtime
    const { PrismaClient } = require('@prisma/client');
    const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');

    function buildAdapter() {
      if (isPostgres) {
        try {
          const { PrismaPg } = require('@prisma/adapter-pg');
          const { Pool } = require('pg');
          const pool = new Pool({ connectionString: DATABASE_URL });
          return new PrismaPg(pool);
        } catch {
          throw new Error('PostgreSQL adapter not installed.');
        }
      }
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
      const sqliteFile = DATABASE_URL.replace(/^file:/, '');
      const absolutePath = path.isAbsolute(sqliteFile)
        ? sqliteFile
        : path.resolve(process.cwd(), 'prisma', sqliteFile);
      return new PrismaBetterSqlite3({ url: absolutePath });
    }

    return new PrismaClient({
      adapter: buildAdapter(),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch (err) {
    console.error('[Prisma] Failed to initialize:', err);
    // Return a mock client that throws on use
    return new Proxy({}, {
      get: () => () => { throw new Error('Prisma not available'); }
    });
  }
}

const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
