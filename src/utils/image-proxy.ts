/**
 * Image Proxy Utilities
 *
 * Helper functions for proxying external images through our server
 * to bypass CORS restrictions.
 */

/**
 * Check if a URL is an external image that needs proxying
 */
export function isExternalImageUrl(url: string | undefined): boolean {
	if (!url) return false;

	// Data URLs don't need proxying
	if (url.startsWith('data:')) return false;

	// Relative URLs don't need proxying
	if (url.startsWith('/')) return false;

	// Already proxied URLs don't need double-proxying
	if (url.includes('/api/proxy-image')) return false;

	// External http/https URLs need proxying
	return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get the proxied URL for an external image
 * Returns the original URL if it doesn't need proxying
 */
export function getProxiedImageUrl(url: string | undefined): string | undefined {
	if (!url) return undefined;

	if (!isExternalImageUrl(url)) {
		return url;
	}

	return `/api/proxy-image?url=${encodeURIComponent(url)}`;
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
