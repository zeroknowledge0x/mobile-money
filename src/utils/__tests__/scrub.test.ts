import { scrub, scrubObject, refreshScrubMap } from '../utils/scrub';

describe('Log Scrubbing Utility', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    // Set some test secrets
    process.env.SUPABASE_SERVICE_KEY = 'sb-test-secret-key-1234567890abcdef';
    process.env.DATABASE_URL = 'postgres://user:supersecretpassword@db.example.com:5432/mydb';
    process.env.API_KEY = 'ak_live_1234567890abcdef1234';
    process.env.JWT_SECRET = 'jwt-super-secret-value-123456';
    refreshScrubMap();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    refreshScrubMap();
  });

  describe('env-based scrubbing', () => {
    it('should redact SUPABASE_SERVICE_KEY value', () => {
      const input = `Connecting with key ${process.env.SUPABASE_SERVICE_KEY}`;
      const result = scrub(input);
      expect(result).not.toContain('sb-test-secret-key-1234567890abcdef');
      expect(result).toContain('[REDACTED:SUPABASE_SERVICE_KEY]');
    });

    it('should redact DATABASE_URL value', () => {
      const input = `Failed to connect to ${process.env.DATABASE_URL}`;
      const result = scrub(input);
      expect(result).not.toContain('supersecretpassword');
      expect(result).toContain('[REDACTED:DATABASE_URL]');
    });

    it('should redact API_KEY value', () => {
      const input = `Using key ${process.env.API_KEY} for request`;
      const result = scrub(input);
      expect(result).not.toContain('ak_live_1234567890abcdef1234');
      expect(result).toContain('[REDACTED:API_KEY]');
    });

    it('should not redact short env values (< 8 chars)', () => {
      process.env.SHORT_SECRET = 'abc';
      refreshScrubMap();
      const result = scrub('Value is abc');
      expect(result).toBe('Value is abc');
    });
  });

  describe('pattern-based scrubbing', () => {
    it('should redact Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = scrub(input);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result).toContain('Bearer [REDACTED]');
    });

    it('should redact Basic auth headers', () => {
      const input = 'Authorization: Basic dXNlcjpwYXNzd29yZA==';
      const result = scrub(input);
      expect(result).not.toContain('dXNlcjpwYXNzd29yZA==');
      expect(result).toContain('Basic [REDACTED]');
    });

    it('should redact passwords in connection strings', () => {
      const input = 'postgres://admin:mysecretpwd@localhost:5432/db';
      const result = scrub(input);
      expect(result).not.toContain('mysecretpwd');
      expect(result).toContain('[REDACTED]@');
    });

    it('should redact redis connection string passwords', () => {
      const input = 'redis://:r3d1s_s3cr3t@redis.internal:6379/0';
      const result = scrub(input);
      expect(result).not.toContain('r3d1s_s3cr3t');
      expect(result).toContain('[REDACTED]@');
    });

    it('should redact api_key in query strings', () => {
      const input = 'https://api.example.com/data?api_key=sk_live_abcdef123456&format=json';
      const result = scrub(input);
      expect(result).not.toContain('sk_live_abcdef123456');
      expect(result).toContain('[REDACTED]');
    });

    it('should redact key=value pairs with secret-looking keys', () => {
      const input = 'Config: api_key=supersecret123, other=visible';
      const result = scrub(input);
      expect(result).not.toContain('supersecret123');
      expect(result).toContain('other=visible');
    });
  });

  describe('scrubObject', () => {
    it('should scrub string values in objects', () => {
      const input = {
        name: 'test',
        apiKey: process.env.API_KEY!,
        count: 42,
      };
      const result = scrubObject(input);
      expect(result.name).toBe('test');
      expect(result.apiKey).not.toContain('ak_live_1234567890abcdef1234');
      expect(result.count).toBe(42);
    });

    it('should not mutate the original object', () => {
      const input = { secret: process.env.API_KEY! };
      const original = input.secret;
      scrubObject(input);
      expect(input.secret).toBe(original);
    });
  });

  describe('safe strings', () => {
    it('should not modify strings without secrets', () => {
      const input = 'User logged in successfully from 192.168.1.1';
      expect(scrub(input)).toBe(input);
    });

    it('should handle empty strings', () => {
      expect(scrub('')).toBe('');
    });
  });
});
