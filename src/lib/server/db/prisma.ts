import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const DATABASE_URL = process.env.DATABASE_URL?.trim() || 'file:./dev.db';
const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');

function buildAdapter() {
  if (isPostgres) {
    try {
      // Dynamic import keeps build-time optional for local dev
      const { PrismaPg } = require('@prisma/adapter-pg');
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: DATABASE_URL });
      return new PrismaPg(pool);
    } catch (err) {
      throw new Error(
        'PostgreSQL DATABASE_URL provided but @prisma/adapter-pg and pg packages are not installed. Install them with: npm install pg @prisma/adapter-pg',
      );
    }
  }
  const sqliteFile = DATABASE_URL.replace(/^file:/, '');
  const absolutePath = path.isAbsolute(sqliteFile)
    ? sqliteFile
    : path.resolve(process.cwd(), 'prisma', sqliteFile);
  return new PrismaBetterSqlite3({ url: absolutePath });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: buildAdapter(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
