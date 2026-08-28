import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('localhost'),

  DATABASE_URL: z.string().default('file:./dev.db'),

  MOCK_MODE: z
    .enum(['true', 'false', '1', '0', 'TRUE', 'FALSE', 'yes', 'no', 'YES', 'NO'])
    .transform((v) => ['true', '1', 'TRUE', 'yes', 'YES'].includes(v))
    .default(false),

  SESSION_TTL_MS: z.coerce.number().int().min(60000).default(604800000),
  SESSION_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  TEMP_SESSION_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  SESSION_CLEANUP_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(5)
    .max(3600)
    .default(60),

  APP_AUTH_COOKIE_NAME: z.string().optional(),

  PORTAL_BASE_URL: z.string().url().default('https://sp.srmist.edu.in'),
  PORTAL_LOGIN_PATH: z
    .string()
    .default('/srmiststudentportal/students/loginManager/youLogin.jsp'),
  SRMIST_PORTAL_BASE_URL: z
    .string()
    .url()
    .default('https://sp.srmist.edu.in'),
  SRMIST_PORTAL_LOGIN_PATH: z
    .string()
    .default('/srmiststudentportal/studentLoginPage'),
  SRMIST_PORTAL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),

  DATA_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  CONSENT_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(365),
  SNAPSHOT_RETENTION_HOURS: z.coerce.number().int().min(1).max(8760).default(24),

  STORAGE_ROOT: z.string().optional(),
  CONSENT_LOG_PATH: z.string().optional(),
  SNAPSHOTS_DIR: z.string().optional(),

  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .default(true),

  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false', '1', '0', 'TRUE', 'FALSE'])
    .transform((v) => v === 'true' || v === '1' || v === 'TRUE')
    .default(true),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),

  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),

  DEBUG_SNAPSHOTS: z.preprocess(
    (val) => {
      if (val !== undefined) return val;
      return process.env.NODE_ENV === 'development' ? 'true' : 'false';
    },
    z
      .enum(['true', 'false', '1', '0', 'TRUE', 'FALSE'])
      .transform((v) => v === 'true' || v === '1' || v === 'TRUE')
      .default(false),
  ),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  CAPTCHA_REQUIRED: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .default(true),

  ENABLE_SNAPSHOTS: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .default(true),

  ENABLE_CONSENT_LOGGING: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .default(true),

  NEXT_PUBLIC_APP_NAME: z.string().default('SRM Student Companion'),
});

export type AppEnv = z.infer<typeof envSchema>;

function safeParseEnv(): AppEnv {
  try {
    const result = envSchema.safeParse(process.env);
    if (result.success) return result.data;
    console.warn(
      '[env] Some environment variables failed validation, using defaults for invalid fields:',
      result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    );
    return envSchema.parse({});
  } catch {
    return envSchema.parse({});
  }
}

export const env: AppEnv = safeParseEnv();

export const ENV_FLAG = {
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isProd: env.NODE_ENV === 'production',
  isMockMode: env.MOCK_MODE === true,
  corsCredentials: env.CORS_CREDENTIALS === true,
  captchaRequired: env.CAPTCHA_REQUIRED === true,
  snapshotsEnabled: env.ENABLE_SNAPSHOTS === true,
  consentLoggingEnabled: env.ENABLE_CONSENT_LOGGING === true,
  rateLimitEnabled: env.RATE_LIMIT_ENABLED === true,
  debugSnapshots: env.DEBUG_SNAPSHOTS === true,
} as const;

export function getSessionTTLMs(): number {
  return env.SESSION_TTL_MS;
}

export function getTempSessionTTLMs(): number {
  return env.TEMP_SESSION_TTL_MINUTES * 60 * 1000;
}

export function getSnapshotExpiryDate(): string {
  const date = new Date();
  date.setHours(date.getHours() + env.SNAPSHOT_RETENTION_HOURS);
  return date.toISOString();
}

export function printEnvSummary(): void {
  const lines = [
    `=== App Environment ===`,
    `  NODE_ENV            : ${env.NODE_ENV}`,
    `  PORT                : ${env.PORT}`,
    `  HOST                : ${env.HOST}`,
    `  DATABASE_URL        : ${env.DATABASE_URL}`,
    `  MOCK_MODE           : ${ENV_FLAG.isMockMode}`,
    `  SESSION_TTL_MS      : ${env.SESSION_TTL_MS}`,
    `  RATE_LIMIT_ENABLED  : ${ENV_FLAG.rateLimitEnabled}`,
    `  DEBUG_SNAPSHOTS     : ${ENV_FLAG.debugSnapshots}`,
    `  PORTAL BASE URL     : ${env.PORTAL_BASE_URL}`,
    `  RETENTION (days)    : ${env.DATA_RETENTION_DAYS}`,
    `  LOG_LEVEL           : ${env.LOG_LEVEL}`,
    `  CORS_ORIGIN         : ${env.CORS_ORIGIN}`,
    `  SNAPSHOTS ENABLED   : ${ENV_FLAG.snapshotsEnabled}`,
    `  CONSENT LOGGING     : ${ENV_FLAG.consentLoggingEnabled}`,
    `  CAPTCHA REQUIRED    : ${ENV_FLAG.captchaRequired}`,
    `=======================`,
  ];
  if (ENV_FLAG.isDev) {
    console.log(lines.join('\n'));
  }
}
