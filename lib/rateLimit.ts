interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up stale rate-limiting records every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore.entries()) {
      const valid = record.timestamps.filter((ts) => now - ts < 60000);
      if (valid.length === 0) {
        rateLimitStore.delete(ip);
      } else {
        rateLimitStore.set(ip, { timestamps: valid });
      }
    }
  }, 300000);
}

/**
 * Enforces a sliding-window rate limit per client IP.
 * @param ip Client IP address string
 * @param maxRequests Maximum allowed requests in the time window (default: 5)
 * @param windowMs Time window in milliseconds (default: 60000 = 1 minute)
 */
export function checkRateLimit(
  ip: string,
  maxRequests = 5,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { timestamps: [] };

  // Filter timestamps within current window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, remaining: 0, resetMs };
  }

  validTimestamps.push(now);
  rateLimitStore.set(ip, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    resetMs: windowMs,
  };
}
