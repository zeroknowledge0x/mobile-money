/**
 * Log scrubbing utility — sanitises strings before they reach console output.
 *
 * Replaces values of known secret-bearing environment variables and common
 * credential patterns with `[REDACTED]` so that `console.log()` calls in
 * legacy code paths cannot leak secrets to stdout / log aggregators.
 *
 * Usage:
 *   import { scrub } from '../utils/scrub';
 *   console.log(scrub(`Connecting to ${dbUrl}`));
 *
 * This module is intentionally dependency-free and synchronous so it can be
 * imported anywhere without circular-dependency concerns.
 */

// ---------------------------------------------------------------------------
// 1. Env-var based scrubbing — values from the process environment
// ---------------------------------------------------------------------------

/** Environment variable names whose values should never appear in logs. */
const SENSITIVE_ENV_KEYS = [
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_URL',           // URL may contain embedded key in query params
  'DATABASE_URL',
  'DB_URL',
  'REDIS_URL',
  'STELLAR_SECRET_KEY',
  'STELLAR_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'API_KEY',
  'API_SECRET',
  'WEBHOOK_SECRET',
  'PRIVATE_KEY',
  'MASTER_KEY',
  'SERVICE_KEY',
  'ACCESS_KEY',
  'SECRET_KEY',
  'ENCRYPTION_KEY',
  'SIGNING_KEY',
  'LOKI_HOST',              // may contain credentials in URL
] as const;

/**
 * Build a scrub map from the current environment.
 * Called once at module load; re-exported for test overrides.
 */
function buildEnvScrubMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of SENSITIVE_ENV_KEYS) {
    const val = process.env[key];
    if (val && val.length >= 8) {
      // Only scrub values that are long enough to be real secrets
      // (avoids redacting common short words like "test").
      map.set(val, `[REDACTED:${key}]`);
    }
  }
  return map;
}

let envScrubMap = buildEnvScrubMap();

/** Rebuild the env scrub map (call after mutating process.env in tests). */
export function refreshScrubMap(): void {
  envScrubMap = buildEnvScrubMap();
}

// ---------------------------------------------------------------------------
// 2. Pattern-based scrubbing — regex for common credential formats
// ---------------------------------------------------------------------------

const CREDENTIAL_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Bearer tokens  (eyJ... JWTs, generic)
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },

  // Basic auth header  (base64)
  { pattern: /Basic\s+[A-Za-z0-9+/]+=*/gi, replacement: 'Basic [REDACTED]' },

  // Connection strings with embedded password:
  //   postgres://user:password@host  /  redis://:secret@host
  { pattern: /((?:postgres|mysql|redis|mongodb|amqp)(?:ql|s)?:\/\/[^:\s]+):([^\s@]+)@/gi,
    replacement: '$1:[REDACTED]@' },

  // Generic key=value pairs where key looks secret
  { pattern: /((?:api[_-]?key|api[_-]?secret|secret[_-]?key|private[_-]?key|access[_-]?token|auth[_-]?token|webhook[_-]?secret|master[_-]?key|service[_-]?key|encryption[_-]?key|signing[_-]?key)\s*[=:]\s*)([^\s,;}{)\]]+)/gi,
    replacement: '$1[REDACTED]' },

  // Query-string secrets: ?api_key=xxx &token=yyy
  { pattern: /([?&](?:api[_-]?key|token|secret|key|password|access_token)=)([^&\s]+)/gi,
    replacement: '$1[REDACTED]' },
];

// ---------------------------------------------------------------------------
// 3. Public API
// ---------------------------------------------------------------------------

/**
 * Scrub a single string, removing any known secrets or credential patterns.
 *
 * @param input - The raw string to sanitise
 * @returns The sanitised string with secrets replaced by `[REDACTED]`
 */
export function scrub(input: string): string {
  let result = input;

  // Replace known env-var values
  for (const [secret, replacement] of envScrubMap) {
    if (result.includes(secret)) {
      result = result.replaceAll(secret, replacement);
    }
  }

  // Apply regex patterns
  for (const { pattern, replacement } of CREDENTIAL_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Scrub all string values in a flat object (shallow).
 * Non-string values are returned unchanged.
 */
export function scrubObject<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (typeof out[key] === 'string') {
      (out as Record<string, unknown>)[key] = scrub(out[key] as string);
    }
  }
  return out;
}
