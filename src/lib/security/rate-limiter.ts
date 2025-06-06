import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';

export interface RateLimiterOptions {
	windowMs: number;
	maxRequests: number;
	keyGenerator?: (req: NextRequest) => string;
	skipSuccessfulRequests?: boolean;
	skipFailedRequests?: boolean;
	message?: string;
}

export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	reset: Date;
	retryAfter?: number;
}

export class RateLimiter {
	private cache: LRUCache<string, { count: number; resetTime: number }>;
	private options: Required<RateLimiterOptions>;

	constructor(options: RateLimiterOptions) {
		this.options = {
			skipSuccessfulRequests: false,
			skipFailedRequests: false,
			message: 'Too many requests, please try again later',
			keyGenerator: this.getDefaultKey,
			...options,
		};

		// Initialize LRU cache with TTL based on window
		this.cache = new LRUCache({
			max: 10000, // Maximum number of items
			ttl: this.options.windowMs,
			updateAgeOnGet: false,
			updateAgeOnHas: false,
		});
	}

	async checkLimit(
		req: NextRequest,
		additionalKey?: string
	): Promise<RateLimitResult> {
		const key = additionalKey
			? `${this.options.keyGenerator(req)}:${additionalKey}`
			: this.options.keyGenerator(req);

		const now = Date.now();
		const windowStart = now - this.options.windowMs;

		// Get or create entry
		let entry = this.cache.get(key);

		if (!entry || entry.resetTime <= now) {
			// Create new window
			entry = {
				count: 1,
				resetTime: now + this.options.windowMs,
			};
			this.cache.set(key, entry);

			return {
				allowed: true,
				limit: this.options.maxRequests,
				remaining: this.options.maxRequests - 1,
				reset: new Date(entry.resetTime),
			};
		}

		// Check if limit exceeded
		if (entry.count >= this.options.maxRequests) {
			const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

			return {
				allowed: false,
				limit: this.options.maxRequests,
				remaining: 0,
				reset: new Date(entry.resetTime),
				retryAfter,
			};
		}

		// Increment counter
		entry.count++;
		this.cache.set(key, entry);

		return {
			allowed: true,
			limit: this.options.maxRequests,
			remaining: this.options.maxRequests - entry.count,
			reset: new Date(entry.resetTime),
		};
	}

	private getDefaultKey(req: NextRequest): string {
		// Try to get IP from various headers
		const forwardedFor = req.headers.get('x-forwarded-for');
		const realIp = req.headers.get('x-real-ip');
		const cfIp = req.headers.get('cf-connecting-ip');

		if (forwardedFor) {
			// Take the first IP if multiple are present
			return forwardedFor.split(',')[0].trim();
		}

		if (realIp) {
			return realIp;
		}

		if (cfIp) {
			return cfIp;
		}

		// Fallback to a generic key if no IP found
		return 'unknown-ip';
	}

	// Helper method to create headers for rate limit info
	getRateLimitHeaders(result: RateLimitResult): Headers {
		const headers = new Headers();

		headers.set('X-RateLimit-Limit', result.limit.toString());
		headers.set('X-RateLimit-Remaining', result.remaining.toString());
		headers.set('X-RateLimit-Reset', result.reset.toISOString());

		if (result.retryAfter) {
			headers.set('Retry-After', result.retryAfter.toString());
		}

		return headers;
	}

	// Reset rate limit for a specific key
	reset(key: string): void {
		this.cache.delete(key);
	}

	// Clear all rate limits
	clearAll(): void {
		this.cache.clear();
	}

	// Get current usage for a key
	getUsage(key: string): { count: number; resetTime: Date } | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		return {
			count: entry.count,
			resetTime: new Date(entry.resetTime),
		};
	}
}

// Pre-configured rate limiters for different endpoints
export const joinRoomLimiter = new RateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 10, // 10 joins per 15 minutes
	message: 'Too many room join attempts',
});

export const createRoomLimiter = new RateLimiter({
	windowMs: 60 * 60 * 1000, // 1 hour
	maxRequests: 5, // 5 room creations per hour
	message: 'Too many room creation attempts',
});

export const apiGeneralLimiter = new RateLimiter({
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 60, // 60 requests per minute
	message: 'Too many API requests',
});

export const authLimiter = new RateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 5, // 5 auth attempts per 15 minutes
	message: 'Too many authentication attempts',
});

export const guestCreationLimiter = new RateLimiter({
	windowMs: 60 * 60 * 1000, // 1 hour
	maxRequests: 3, // 3 guest accounts per hour per IP
	message: 'Too many guest account creations',
});

// Middleware helper
export async function withRateLimit(
	req: NextRequest,
	limiter: RateLimiter,
	handler: () => Promise<Response>
): Promise<Response> {
	const result = await limiter.checkLimit(req);

	if (!result.allowed) {
		const headers = limiter.getRateLimitHeaders(result);
		headers.set('Content-Type', 'application/json');

		return new Response(
			JSON.stringify({
				error: 'Rate limit exceeded',
				message: limiter['options'].message,
				retryAfter: result.retryAfter,
			}),
			{
				status: 429,
				headers,
			}
		);
	}

	// Add rate limit headers to successful response
	const response = await handler();
	const headers = limiter.getRateLimitHeaders(result);

	headers.forEach((value, key) => {
		response.headers.set(key, value);
	});

	return response;
}

// User-based rate limiter
export class UserRateLimiter extends RateLimiter {
	constructor(options: Omit<RateLimiterOptions, 'keyGenerator'>) {
		super({
			...options,
			keyGenerator: (req: NextRequest) => {
				// Try to get user ID from auth header or session
				const authHeader = req.headers.get('authorization');

				if (authHeader && authHeader.startsWith('Bearer ')) {
					// Extract user ID from token (you'd need to decode JWT here)
					return `user:${authHeader.slice(7, 20)}`; // Simplified
				}

				// Fall back to IP
				return this.getDefaultIpKey(req);
			},
		});
	}

	private getDefaultIpKey(req: NextRequest): string {
		const forwardedFor = req.headers.get('x-forwarded-for');
		const realIp = req.headers.get('x-real-ip');

		if (forwardedFor) {
			return `ip:${forwardedFor.split(',')[0].trim()}`;
		}

		if (realIp) {
			return `ip:${realIp}`;
		}

		return 'ip:unknown';
	}
}

// Distributed rate limiter interface (for future Redis implementation)
export interface DistributedRateLimiter {
	checkLimit(key: string): Promise<RateLimitResult>;
	reset(key: string): Promise<void>;
}

// Helper to combine multiple rate limiters
export class CompositeRateLimiter {
	constructor(private limiters: RateLimiter[]) {}

	async checkLimit(req: NextRequest): Promise<RateLimitResult> {
		for (const limiter of this.limiters) {
			const result = await limiter.checkLimit(req);

			if (!result.allowed) {
				return result;
			}
		}

		// All limiters passed, return the most restrictive remaining count
		const results = await Promise.all(
			this.limiters.map((l) => l.checkLimit(req))
		);

		return results.reduce((most, current) =>
			current.remaining < most.remaining ? current : most
		);
	}
}
