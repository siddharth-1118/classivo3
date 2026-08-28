import { mkdir, readFile, writeFile, unlink, access, readdir, stat } from "fs/promises";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { env } from "@/config/env";

export type PageType = "dashboard" | "profile" | "grades" | "hostel" | "exams" | "login";

export interface ConsentLogEntry {
  timestamp: string;
  netId?: string;
  regNo?: string;
  action: string;
  ip?: string;
  userAgent?: string;
  granted: boolean;
  purpose?: string;
}

export interface SnapshotMeta {
  pageType: PageType | string;
  requestId: string;
  timestamp: string;
  netId?: string;
  regNo?: string;
}

export interface ParsedSnapshotMeta {
  type: string;
  timestamp: string;
  netId?: string;
  regNo?: string;
}

const SNAPSHOT_RETENTION_MS = env.SNAPSHOT_RETENTION_HOURS * 60 * 60 * 1000;
const CONSENT_LOG_RETENTION_MS = env.CONSENT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function getStorageRoot(): string {
  if (env.STORAGE_ROOT) return env.STORAGE_ROOT;
  return join(process.cwd(), "data");
}

const STORAGE_ROOT = getStorageRoot();
const CACHE_DIR = join(STORAGE_ROOT, "cache");
const DEBUG_DIR = join(STORAGE_ROOT, "debug");
const CONSENT_LOG_PATH = join(STORAGE_ROOT, "consent.log");

interface InMemoryStore {
  snapshots: Map<string, { content: string; meta: SnapshotMeta & { expiresAt: number } }>;
  parsedSnapshots: Map<string, { content: string; meta: ParsedSnapshotMeta & { expiresAt: number } }>;
  consentLog: ConsentLogEntry[];
  useFs: boolean;
}

const inMemory: InMemoryStore = {
  snapshots: new Map(),
  parsedSnapshots: new Map(),
  consentLog: [],
  useFs: true,
};

async function ensureDir(dirPath: string): Promise<boolean> {
  try {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
    return true;
  } catch {
    inMemory.useFs = false;
    return false;
  }
}

async function ensureStorageDirs(): Promise<boolean> {
  const ok1 = await ensureDir(STORAGE_ROOT);
  const ok2 = await ensureDir(CACHE_DIR);
  const ok3 = await ensureDir(DEBUG_DIR);
  return ok1 && ok2 && ok3;
}

function generateSnapshotFilename(meta: SnapshotMeta): string {
  const safeType = meta.pageType.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeId = meta.requestId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const ts = Date.now();
  return `${safeType}-${safeId}-${ts}.html`;
}

function generateParsedFilename(meta: ParsedSnapshotMeta): string {
  const safeType = meta.type.replace(/[^a-zA-Z0-9_-]/g, "_");
  const ts = Date.now();
  return `parsed-${safeType}-${ts}.json`;
}

export async function saveSnapshot(pageType: PageType, requestId: string, html: string): Promise<void> {
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const expiresAt = now + SNAPSHOT_RETENTION_MS;
  const meta: SnapshotMeta & { expiresAt: number } = { pageType, requestId, timestamp, expiresAt };

  const dirsOk = inMemory.useFs ? await ensureStorageDirs() : false;

  if (dirsOk && inMemory.useFs) {
    try {
      const filename = generateSnapshotFilename({ pageType, requestId, timestamp });
      const filePath = join(DEBUG_DIR, filename);
      await writeFile(filePath, html, "utf-8");
      const metaFile = join(DEBUG_DIR, `${filename}.meta.json`);
      await writeFile(metaFile, JSON.stringify(meta, null, 2), "utf-8");
      return;
    } catch {
      inMemory.useFs = false;
    }
  }

  const key = `${pageType}:${requestId}:${now}`;
  inMemory.snapshots.set(key, { content: html, meta });
}

export async function saveParsedSnapshot<T>(type: string, data: T): Promise<void> {
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const expiresAt = now + SNAPSHOT_RETENTION_MS;
  const meta: ParsedSnapshotMeta & { expiresAt: number } = { type, timestamp, expiresAt };
  const content = JSON.stringify(data);

  const dirsOk = inMemory.useFs ? await ensureStorageDirs() : false;

  if (dirsOk && inMemory.useFs) {
    try {
      const filename = generateParsedFilename({ type, timestamp });
      const filePath = join(CACHE_DIR, filename);
      await writeFile(filePath, content, "utf-8");
      return;
    } catch {
      inMemory.useFs = false;
    }
  }

  const key = `${type}:${now}`;
  inMemory.parsedSnapshots.set(key, { content, meta });
}

export async function readConsentLog(): Promise<ConsentLogEntry[]> {
  const dirsOk = inMemory.useFs ? await ensureStorageDirs() : false;

  if (dirsOk && inMemory.useFs) {
    try {
      await access(CONSENT_LOG_PATH);
      const raw = await readFile(CONSENT_LOG_PATH, "utf-8");
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);
      const entries: ConsentLogEntry[] = [];
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // skip invalid lines
        }
      }
      return entries;
    } catch {
      // file doesn't exist or is empty
      return [];
    }
  }

  return [...inMemory.consentLog];
}

export async function appendConsentLog(entry: Omit<ConsentLogEntry, "timestamp">): Promise<void> {
  const fullEntry: ConsentLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  const dirsOk = inMemory.useFs ? await ensureStorageDirs() : false;

  if (dirsOk && inMemory.useFs) {
    try {
      const line = JSON.stringify(fullEntry) + "\n";
      await writeFile(CONSENT_LOG_PATH, line, { flag: "a", encoding: "utf-8" });
      return;
    } catch {
      inMemory.useFs = false;
    }
  }

  inMemory.consentLog.push(fullEntry);
}

export async function cleanupExpired(): Promise<{ snapshotsRemoved: number; consentEntriesRemoved: number }> {
  const now = Date.now();
  let snapshotsRemoved = 0;
  let consentEntriesRemoved = 0;

  // in-memory cleanup
  for (const [key, val] of inMemory.snapshots) {
    if (val.meta.expiresAt < now) {
      inMemory.snapshots.delete(key);
      snapshotsRemoved++;
    }
  }
  for (const [key, val] of inMemory.parsedSnapshots) {
    if (val.meta.expiresAt < now) {
      inMemory.parsedSnapshots.delete(key);
      snapshotsRemoved++;
    }
  }
  const consentCutoff = now - CONSENT_LOG_RETENTION_MS;
  const originalConsentLen = inMemory.consentLog.length;
  inMemory.consentLog = inMemory.consentLog.filter(
    (e) => new Date(e.timestamp).getTime() >= consentCutoff,
  );
  consentEntriesRemoved += originalConsentLen - inMemory.consentLog.length;

  // fs cleanup
  if (inMemory.useFs) {
    try {
      await ensureStorageDirs();
      // cleanup debug (html snapshots)
      try {
        const debugFiles = await readdir(DEBUG_DIR);
        for (const f of debugFiles) {
          if (f.endsWith(".meta.json")) {
            try {
              const metaPath = join(DEBUG_DIR, f);
              const raw = await readFile(metaPath, "utf-8");
              const meta = JSON.parse(raw) as { expiresAt: number };
              if (meta.expiresAt < now) {
                const htmlFile = f.replace(/\.meta\.json$/, "");
                try {
                  await unlink(join(DEBUG_DIR, htmlFile));
                } catch {
                  // ignore
                }
                await unlink(metaPath);
                snapshotsRemoved++;
              }
            } catch {
              // check mtime as fallback
              try {
                const filePath = join(DEBUG_DIR, f);
                const st = await stat(filePath);
                if (st.mtimeMs + SNAPSHOT_RETENTION_MS < now) {
                  await unlink(filePath);
                  snapshotsRemoved++;
                }
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore
      }

      // cleanup cache (parsed snapshots)
      try {
        const cacheFiles = await readdir(CACHE_DIR);
        for (const f of cacheFiles) {
          const filePath = join(CACHE_DIR, f);
          try {
            const st = await stat(filePath);
            if (st.mtimeMs + SNAPSHOT_RETENTION_MS < now) {
              await unlink(filePath);
              snapshotsRemoved++;
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      // cleanup consent log
      try {
        await access(CONSENT_LOG_PATH);
        const existing = await readConsentLog();
        const filtered = existing.filter(
          (e) => new Date(e.timestamp).getTime() >= consentCutoff,
        );
        consentEntriesRemoved += existing.length - filtered.length;
        await writeFile(
          CONSENT_LOG_PATH,
          filtered.map((e) => JSON.stringify(e)).join("\n") + (filtered.length ? "\n" : ""),
          "utf-8",
        );
      } catch {
        // ignore
      }
    } catch {
      // fs disabled on error
    }
  }

  return { snapshotsRemoved, consentEntriesRemoved };
}
