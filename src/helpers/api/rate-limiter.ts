// In-memory rate limiter for API endpoints
interface RateLimitEntry {
	attempts: number;
	firstAttempt: number;
	lastAttempt: number;
}

interface RateLimitConfig {
	maxAttempts: number;
	windowMs: number;
}

class InMemoryRateLimiter {
	private cache = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout;

	constructor(private config: RateLimitConfig) {
		// Clean up expired entries every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 5 * 60 * 1000);
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.lastAttempt > this.config.windowMs) {
				this.cache.delete(key);
			}
		}
	}

	public check(identifier: string): {
		allowed: boolean;
		remainingAttempts: number;
		resetTime: number;
	} {
		const now = Date.now();
		const entry = this.cache.get(identifier);

		if (!entry) {
			// First attempt
			this.cache.set(identifier, {
				attempts: 1,
				firstAttempt: now,
				lastAttempt: now,
			});

			return {
				allowed: true,
				remainingAttempts: this.config.maxAttempts - 1,
				resetTime: now + this.config.windowMs,
			};
		}

		// Check if window has expired
		if (now - entry.firstAttempt > this.config.windowMs) {
			// Reset the window
			this.cache.set(identifier, {
				attempts: 1,
				firstAttempt: now,
				lastAttempt: now,
			});

			return {
				allowed: true,
				remainingAttempts: this.config.maxAttempts - 1,
				resetTime: now + this.config.windowMs,
			};
		}

		// Within the window, check if limit exceeded
		if (entry.attempts >= this.config.maxAttempts) {
			return {
				allowed: false,
				remainingAttempts: 0,
				resetTime: entry.firstAttempt + this.config.windowMs,
			};
		}

		// Increment attempts
		entry.attempts++;
		entry.lastAttempt = now;
		this.cache.set(identifier, entry);

		return {
			allowed: true,
			remainingAttempts: this.config.maxAttempts - entry.attempts,
			resetTime: entry.firstAttempt + this.config.windowMs,
		};
	}

	public reset(identifier: string): void {
		this.cache.delete(identifier);
	}

	public destroy(): void {
		clearInterval(this.cleanupInterval);
		this.cache.clear();
	}
}

// Default rate limiter instances
export const waitlistRateLimiter = new InMemoryRateLimiter({
	maxAttempts: 3, // 3 attempts
	windowMs: 60 * 60 * 1000, // per hour
});

// Utility function to get client IP from request
export function getClientIP(request: Request): string {
	// Try various headers that might contain the real IP
	const forwarded = request.headers.get('x-forwarded-for');
	const realIp = request.headers.get('x-real-ip');
	const cfConnectingIp = request.headers.get('cf-connecting-ip');

	if (forwarded) {
		// x-forwarded-for can contain multiple IPs, take the first one
		return forwarded.split(',')[0].trim();
	}

	if (realIp) {
		return realIp;
	}

	if (cfConnectingIp) {
		return cfConnectingIp;
	}

	// Fallback - this might not be accurate in production
	return 'unknown';
}

// Helper function to check rate limit and return appropriate response
export function checkRateLimit(
	request: Request,
	limiter: InMemoryRateLimiter = waitlistRateLimiter
): { allowed: boolean; remainingAttempts: number; resetTime: number } {
	const clientIP = getClientIP(request);
	return limiter.check(clientIP);
}
