/**
 * Safe diagnostic logger for SRM Student Portal operations.
 * Enforces zero logging of sensitive fields like passwords, CAPTCHA answers,
 * session cookies, tokens, or personal secrets.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'captcha',
  'captchatoken',
  'cptoken',
  'dtoken',
  'cookie',
  'cookies',
  'set-cookie',
  'token',
  'sessionid',
  'x-session-id',
  'authorization',
  'secret',
]);

function sanitizeValue(value: any): any {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = sanitizeValue(v);
      }
    }
    return sanitized;
  }

  return value;
}

export function srmLog(tag: string, message: string, meta?: any): void {
  let metaString = '';
  if (meta !== undefined) {
    try {
      metaString = ` ${JSON.stringify(sanitizeValue(meta))}`;
    } catch {
      metaString = ' [Object]';
    }
  }
  console.log(`[SRM] [${tag}] ${message}${metaString}`);
}

export function srmError(tag: string, message: string, error?: any): void {
  const errMessage = error instanceof Error ? error.message : String(error || '');
  console.error(`[SRM] [${tag}] ERROR: ${message}${errMessage ? ` - ${errMessage}` : ''}`);
}
