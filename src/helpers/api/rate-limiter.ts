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

/**
 * Thread-safe in-memory rate limiter with proper memory management
 *
 * Key improvements:
 * - Atomic cache updates to prevent race conditions
 * - Cleanup based on firstAttempt to avoid premature deletions
 * - Proper cleanup interval management to prevent memory leaks
 */
class InMemoryRateLimiter {
	private cache = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(private config: RateLimitConfig) {
		// Clean up expired entries every 5 minutes
		this.cleanupInterval = setInterval(
			() => {
				this.cleanup();
			},
			5 * 60 * 1000
		);
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			// Use firstAttempt instead of lastAttempt to avoid premature deletions
			// This ensures entries are only cleaned up after their rate limit window expires
			if (now - entry.firstAttempt > this.config.windowMs) {
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
		const existingEntry = this.cache.get(identifier);

		// Handle first attempt or expired window atomically
		// This prevents race conditions by creating a complete new entry object
		if (
			!existingEntry ||
			now - existingEntry.firstAttempt > this.config.windowMs
		) {
			const newEntry: RateLimitEntry = {
				attempts: 1,
				firstAttempt: now,
				lastAttempt: now,
			};
			this.cache.set(identifier, newEntry);

			return {
				allowed: true,
				remainingAttempts: this.config.maxAttempts - 1,
				resetTime: now + this.config.windowMs,
			};
		}

		// Within the window, check if limit exceeded
		if (existingEntry.attempts >= this.config.maxAttempts) {
			return {
				allowed: false,
				remainingAttempts: 0,
				resetTime: existingEntry.firstAttempt + this.config.windowMs,
			};
		}

		// Atomically update attempts and lastAttempt to prevent race conditions
		// Create a new entry object instead of mutating the existing one
		const updatedEntry: RateLimitEntry = {
			attempts: existingEntry.attempts + 1,
			firstAttempt: existingEntry.firstAttempt,
			lastAttempt: now,
		};
		this.cache.set(identifier, updatedEntry);

		return {
			allowed: true,
			remainingAttempts: this.config.maxAttempts - updatedEntry.attempts,
			resetTime: existingEntry.firstAttempt + this.config.windowMs,
		};
	}

	public reset(identifier: string): void {
		this.cache.delete(identifier);
	}

	/**
	 * Properly destroy the rate limiter instance to prevent memory leaks
	 * Clears the cleanup interval and cache
	 */
	public destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.cache.clear();
	}

	/**
	 * Manually trigger cleanup of expired entries
	 */
	public manualCleanup(): void {
		this.cleanup();
	}

	/**
	 * Get current cache size for monitoring purposes
	 */
	public getCacheSize(): number {
		return this.cache.size;
	}
}

// Default rate limiter instances
export const waitlistRateLimiter = new InMemoryRateLimiter({
	maxAttempts: 3, // 3 attempts
	windowMs: 60 * 60 * 1000, // per hour
});

/**
 * Validates if a string is a valid IPv4 address
 */
function isValidIPv4(ip: string): boolean {
	const ipv4Regex =
		/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	return ipv4Regex.test(ip);
}

/**
 * Validates if a string is a valid IPv6 address
 */
function isValidIPv6(ip: string): boolean {
	const ipv6Regex =
		/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$/;
	return ipv6Regex.test(ip);
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(ip: string): boolean {
	return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Sanitizes and validates an IP address string
 */
function sanitizeIP(ip: string): string | null {
	if (!ip || typeof ip !== 'string') {
		return null;
	}

	// Remove any surrounding whitespace and quotes
	const cleaned = ip.trim().replace(/^["']|["']$/g, '');

	// Check for common spoofing attempts
	if (
		cleaned.includes('<') ||
		cleaned.includes('>') ||
		cleaned.includes('script')
	) {
		return null;
	}

	// Validate length (IPv6 can be up to 39 characters, IPv4 up to 15)
	if (cleaned.length > 45) {
		return null;
	}

	// Validate IP format
	if (!isValidIP(cleaned)) {
		return null;
	}

	return cleaned;
}

/**
 * Extracts client IP from request with validation and anti-spoofing measures
 * Returns null if no valid IP can be determined
 */
export function getClientIP(request: Request): string | null {
	// List of headers to check in order of preference
	// More trusted headers first
	const headerNames = [
		'cf-connecting-ip', // Cloudflare (most trusted if using CF)
		'x-real-ip', // Common proxy header
		'x-forwarded-for', // Standard forwarded header (least trusted)
	];

	// Try each header in order
	for (const headerName of headerNames) {
		const headerValue = request.headers.get(headerName);
		if (!headerValue) {
			continue;
		}

		// Handle x-forwarded-for which can contain multiple IPs
		if (headerName === 'x-forwarded-for') {
			const ips = headerValue.split(',');
			// Take the first IP (original client) but validate it
			for (const ip of ips) {
				const sanitized = sanitizeIP(ip);
				if (sanitized) {
					// Additional validation: reject private/local IPs in forwarded headers
					// to prevent spoofing (unless in development)
					if (
						!isPrivateIP(sanitized) ||
						process.env.NODE_ENV === 'development'
					) {
						return sanitized;
					}
				}
			}
		} else {
			// For other headers, expect single IP
			const sanitized = sanitizeIP(headerValue);
			if (sanitized) {
				return sanitized;
			}
		}
	}

	// Try to extract from connection info (if available)
	// This is more reliable but may not be available in all environments
	try {
		// In some environments, the request might have connection info
		// This is implementation-specific and may not always be available
		const url = new URL(request.url);
		if (url.hostname && isValidIP(url.hostname)) {
			return url.hostname;
		}
	} catch {
		// Ignore errors from URL parsing
	}

	// No valid IP found
	return null;
}

/**
 * Checks if an IP address is private/local
 */
function isPrivateIP(ip: string): boolean {
	if (isValidIPv4(ip)) {
		const parts = ip.split('.').map(Number);
		// Private IPv4 ranges
		return (
			parts[0] === 10 ||
			(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
			(parts[0] === 192 && parts[1] === 168) ||
			parts[0] === 127 // localhost
		);
	}

	if (isValidIPv6(ip)) {
		// Private IPv6 ranges (simplified check)
		return (
			ip.startsWith('::1') || // localhost
			ip.startsWith('fc00:') || // unique local
			ip.startsWith('fd00:') || // unique local
			ip.startsWith('fe80:') // link local
		);
	}

	return false;
}

// Helper function to check rate limit and return appropriate response
export function checkRateLimit(
	request: Request,
	limiter: InMemoryRateLimiter = waitlistRateLimiter
): { allowed: boolean; remainingAttempts: number; resetTime: number } {
	const clientIP = getClientIP(request);

	// If no valid IP found, use a fallback identifier
	// This prevents rate limiting from failing but still provides some protection
	const identifier =
		clientIP || `fallback-${request.headers.get('user-agent') || 'unknown'}`;

	return limiter.check(identifier);
}
