/**
 * Secure Image URL Utilities
 *
 * Helper functions for validating and sanitizing image URLs
 * to prevent XSS, protocol injection, and other security issues.
 */

/**
 * Validates and sanitizes an image URL for safe use in <img> tags.
 *
 * Security measures:
 * - Only allows http/https protocols (blocks javascript:, data:, file:, vbscript:)
 * - Validates URL structure using URL constructor
 * - Blocks encoded XSS patterns
 * - Returns normalized URL or null for invalid/dangerous URLs
 *
 * @param url - The URL to validate
 * @returns The normalized URL if safe, or null if invalid/dangerous
 */
export function getSafeImageUrl(url: string | null | undefined): string | null {
	if (!url) return null;

	// Trim whitespace that could hide malicious content
	const trimmedUrl = url.trim();

	try {
		const parsed = new URL(trimmedUrl);

		// Only allow http/https protocols
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			return null;
		}

		// Block suspicious patterns (including URL-encoded variants)
		const lowerUrl = trimmedUrl.toLowerCase();
		const suspiciousPatterns = [
			'javascript:',
			'vbscript:',
			'<script',
			'</script',
			'%3cscript', // URL-encoded <script
			'%3c/script', // URL-encoded </script
			'onerror=',
			'onload=',
			'onclick=',
			'onmouseover=',
		];

		for (const pattern of suspiciousPatterns) {
			if (lowerUrl.includes(pattern)) {
				return null;
			}
		}

		// Return the normalized URL (parsed.href normalizes the URL)
		return parsed.href;
	} catch {
		// Invalid URL format
		return null;
	}
}

/**
 * Check if a URL is an external image URL (http/https).
 * Used to determine if export placeholder should be shown.
 */
export function isExternalImageUrl(url: string | undefined): boolean {
	if (!url) return false;

	// Data URLs are not external
	if (url.startsWith('data:')) return false;

	// Relative URLs are not external
	if (url.startsWith('/')) return false;

	// External http/https URLs
	return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Extract domain from a URL for display purposes
 */
export function extractDomain(url: string): string {
	try {
		const domain = new URL(url).hostname;
		return domain.replace('www.', '');
	} catch {
		return 'external source';
	}
}
