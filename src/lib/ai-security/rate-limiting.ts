import { NextRequest } from 'next/server';

// Rate limiting configuration
interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests in the window
	skipSuccessfulRequests?: boolean;
	skipFailedRequests?: boolean;
	keyGenerator?: (req: NextRequest) => string;
}

// Rate limit store interface
interface RateLimitStore {
	get(key: string): Promise<{ count: number; resetTime: number } | null>;
	set(key: string, value: { count: number; resetTime: number }): Promise<void>;
	increment(key: string): Promise<{ count: number; resetTime: number }>;
	delete(key: string): Promise<void>;
}

// In-memory rate limit store (fallback when Redis is not available)
class MemoryRateLimitStore implements RateLimitStore {
	private store = new Map<string, { count: number; resetTime: number }>();

	async get(key: string): Promise<{ count: number; resetTime: number } | null> {
		const data = this.store.get(key);
		if (!data) return null;

		// Clean up expired entries
		if (Date.now() > data.resetTime) {
			this.store.delete(key);
			return null;
		}

		return data;
	}

	async set(key: string, value: { count: number; resetTime: number }): Promise<void> {
		this.store.set(key, value);
	}

	async increment(key: string): Promise<{ count: number; resetTime: number }> {
		const existing = await this.get(key);

		if (!existing) {
			const newEntry = { count: 1, resetTime: Date.now() + 60000 }; // Default 1 minute window
			await this.set(key, newEntry);
			return newEntry;
		}

		const updated = { ...existing, count: existing.count + 1 };
		await this.set(key, updated);
		return updated;
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	// Cleanup expired entries periodically
	cleanup(): void {
		const now = Date.now();
		for (const [key, value] of this.store.entries()) {
			if (now > value.resetTime) {
				this.store.delete(key);
			}
		}
	}
}

// Redis rate limit store (for production use)
class RedisRateLimitStore implements RateLimitStore {
	constructor(private redis: any) {}

	async get(key: string): Promise<{ count: number; resetTime: number } | null> {
		try {
			const data = await this.redis.get(key);
			return data ? JSON.parse(data) : null;
		} catch (error) {
			console.error('Redis get error:', error);
			return null;
		}
	}

	async set(key: string, value: { count: number; resetTime: number }): Promise<void> {
		try {
			const ttl = Math.max(0, Math.ceil((value.resetTime - Date.now()) / 1000));
			await this.redis.setex(key, ttl, JSON.stringify(value));
		} catch (error) {
			console.error('Redis set error:', error);
		}
	}

	async increment(key: string): Promise<{ count: number; resetTime: number }> {
		try {
			const existing = await this.get(key);

			if (!existing) {
				const newEntry = { count: 1, resetTime: Date.now() + 60000 };
				await this.set(key, newEntry);
				return newEntry;
			}

			const updated = { ...existing, count: existing.count + 1 };
			await this.set(key, updated);
			return updated;
		} catch (error) {
			console.error('Redis increment error:', error);
			// Fallback to memory store
			const memoryStore = new MemoryRateLimitStore();
			return await memoryStore.increment(key);
		}
	}

	async delete(key: string): Promise<void> {
		try {
			await this.redis.del(key);
		} catch (error) {
			console.error('Redis delete error:', error);
		}
	}
}

// Rate limiter class
class RateLimiter {
	private store: RateLimitStore;
	private config: RateLimitConfig;

	constructor(config: RateLimitConfig, store?: RateLimitStore) {
		this.config = config;
		this.store = store || new MemoryRateLimitStore();
	}

	async checkRateLimit(req: NextRequest): Promise<{
		allowed: boolean;
		count: number;
		remaining: number;
		resetTime: number;
		retryAfter?: number;
	}> {
		const key = this.generateKey(req);
		const current = await this.store.increment(key);

		const allowed = current.count <= this.config.maxRequests;
		const remaining = Math.max(0, this.config.maxRequests - current.count);
		const retryAfter = allowed ? undefined : Math.ceil((current.resetTime - Date.now()) / 1000);

		return {
			allowed,
			count: current.count,
			remaining,
			resetTime: current.resetTime,
			retryAfter,
		};
	}

	private generateKey(req: NextRequest): string {
		if (this.config.keyGenerator) {
			return this.config.keyGenerator(req);
		}

		// Default key generation: IP + endpoint
		const ip = this.getClientIP(req);
		const endpoint = req.nextUrl.pathname;
		return `rate_limit:${ip}:${endpoint}`;
	}

	private getClientIP(req: NextRequest): string {
		// Try various headers for IP detection
		const forwardedFor = req.headers.get('x-forwarded-for');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}

		const realIP = req.headers.get('x-real-ip');
		if (realIP) {
			return realIP;
		}

		const cfConnectingIP = req.headers.get('cf-connecting-ip');
		if (cfConnectingIP) {
			return cfConnectingIP;
		}

		// Fallback to a default value
		return 'unknown';
	}
}

// Predefined rate limit configurations for AI operations
export const AI_RATE_LIMITS = {
	chat: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 20, // 20 requests per minute
	},
	generation: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 10, // 10 requests per minute
	},
	suggestions: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30, // 30 requests per minute
	},
	premium: {
		chat: {
			windowMs: 60 * 1000,
			maxRequests: 100, // Higher limits for premium users
		},
		generation: {
			windowMs: 60 * 1000,
			maxRequests: 50,
		},
		suggestions: {
			windowMs: 60 * 1000,
			maxRequests: 150,
		},
	},
};

// Initialize rate limiters
let redisClient: any = null;

// Try to initialize Redis if available
try {
	// This would be your Redis client initialization
	// redisClient = new Redis(process.env.REDIS_URL);
} catch (error) {
	console.warn('Redis not available, using memory store for rate limiting');
}

const store = redisClient ? new RedisRateLimitStore(redisClient) : new MemoryRateLimitStore();

export const chatRateLimit = new RateLimiter(AI_RATE_LIMITS.chat, store);
export const generationRateLimit = new RateLimiter(AI_RATE_LIMITS.generation, store);
export const suggestionRateLimit = new RateLimiter(AI_RATE_LIMITS.suggestions, store);

// Rate limiting middleware function
export async function withRateLimit(
	req: NextRequest,
	rateLimiter: RateLimiter,
	options?: {
		onExceeded?: (req: NextRequest) => Promise<Response>;
		skipCondition?: (req: NextRequest) => boolean;
	}
): Promise<{ allowed: boolean; response?: Response; headers: Record<string, string> }> {
	// Skip rate limiting if condition is met
	if (options?.skipCondition?.(req)) {
		return { allowed: true, headers: {} };
	}

	const result = await rateLimiter.checkRateLimit(req);

	const headers = {
		'X-RateLimit-Limit': AI_RATE_LIMITS.chat.maxRequests.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
	};

	if (!result.allowed) {
		headers['Retry-After'] = result.retryAfter?.toString() || '60';

		const response = options?.onExceeded
			? await options.onExceeded(req)
			: new Response(
				JSON.stringify({
					error: 'Rate limit exceeded',
					message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
					retryAfter: result.retryAfter,
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						...headers,
					},
				}
			);

		return { allowed: false, response, headers };
	}

	return { allowed: true, headers };
}

// User-specific rate limiting (requires authentication)
export function createUserRateLimit(userId: string, isPremium: boolean = false) {
	const config = isPremium ? AI_RATE_LIMITS.premium.chat : AI_RATE_LIMITS.chat;

	return new RateLimiter({
		...config,
		keyGenerator: (req: NextRequest) => `user_rate_limit:${userId}:${req.nextUrl.pathname}`,
	}, store);
}

// Advanced rate limiting with multiple tiers
export class TieredRateLimiter {
	private limiters: Map<string, RateLimiter> = new Map();

	constructor(private configs: Record<string, RateLimitConfig>) {
		for (const [tier, config] of Object.entries(configs)) {
			this.limiters.set(tier, new RateLimiter(config, store));
		}
	}

	async checkRateLimit(req: NextRequest, tier: string = 'default') {
		const limiter = this.limiters.get(tier);
		if (!limiter) {
			throw new Error(`Rate limiter tier '${tier}' not found`);
		}

		return await limiter.checkRateLimit(req);
	}
}

// Cleanup function for memory store
export function cleanupRateLimitStore() {
	if (store instanceof MemoryRateLimitStore) {
		store.cleanup();
	}
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
	setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

export { RateLimiter, MemoryRateLimitStore, RedisRateLimitStore };
