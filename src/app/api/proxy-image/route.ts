import dns from 'dns';
import net from 'net';
import { NextResponse } from 'next/server';

/**
 * Image Proxy API
 *
 * Fetches external images server-side to bypass CORS restrictions.
 * Used by resource nodes and image nodes to display external images.
 *
 * GET /api/proxy-image?url=<encoded-url>
 */

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT = 10000; // 10 seconds
const CACHE_DURATION = 3600; // 1 hour in seconds

/**
 * Check if an IP address is private, loopback, or link-local
 * These addresses should not be accessible via the image proxy to prevent SSRF
 */
function isPrivateOrReservedIP(ip: string): boolean {
	// IPv4 checks
	if (net.isIPv4(ip)) {
		const parts = ip.split('.').map(Number);
		const [a, b] = parts;

		// 127.0.0.0/8 - Loopback
		if (a === 127) return true;

		// 10.0.0.0/8 - Private
		if (a === 10) return true;

		// 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
		if (a === 172 && b >= 16 && b <= 31) return true;

		// 192.168.0.0/16 - Private
		if (a === 192 && b === 168) return true;

		// 169.254.0.0/16 - Link-local
		if (a === 169 && b === 254) return true;

		// 0.0.0.0/8 - Current network
		if (a === 0) return true;

		// 100.64.0.0/10 - Carrier-grade NAT
		if (a === 100 && b >= 64 && b <= 127) return true;

		// 192.0.0.0/24 - IETF Protocol Assignments
		if (a === 192 && b === 0 && parts[2] === 0) return true;

		// 192.0.2.0/24 - TEST-NET-1
		if (a === 192 && b === 0 && parts[2] === 2) return true;

		// 198.51.100.0/24 - TEST-NET-2
		if (a === 198 && b === 51 && parts[2] === 100) return true;

		// 203.0.113.0/24 - TEST-NET-3
		if (a === 203 && b === 0 && parts[2] === 113) return true;

		// 224.0.0.0/4 - Multicast
		if (a >= 224 && a <= 239) return true;

		// 240.0.0.0/4 - Reserved for future use
		if (a >= 240) return true;
	}

	// IPv6 checks
	if (net.isIPv6(ip)) {
		const normalized = ip.toLowerCase();

		// ::1 - Loopback
		if (normalized === '::1') return true;

		// :: - Unspecified
		if (normalized === '::') return true;

		// fe80::/10 - Link-local
		if (normalized.startsWith('fe80:')) return true;

		// fc00::/7 - Unique local (private)
		if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

		// ff00::/8 - Multicast
		if (normalized.startsWith('ff')) return true;

		// ::ffff:0:0/96 - IPv4-mapped IPv6 (check the IPv4 part)
		if (normalized.startsWith('::ffff:')) {
			const ipv4Part = normalized.slice(7);
			if (net.isIPv4(ipv4Part)) {
				return isPrivateOrReservedIP(ipv4Part);
			}
		}
	}

	return false;
}

/**
 * Validate that a URL's host does not resolve to a private/internal IP
 * This prevents SSRF attacks targeting internal services
 */
async function validateRemoteHost(url: URL): Promise<{ valid: boolean; error?: string }> {
	const hostname = url.hostname;

	// If hostname is already an IP address, check it directly
	if (net.isIP(hostname)) {
		if (isPrivateOrReservedIP(hostname)) {
			return { valid: false, error: 'Access to private/internal IP addresses is not allowed' };
		}
		return { valid: true };
	}

	// Resolve hostname to IP addresses
	try {
		const addresses = await dns.promises.resolve4(hostname).catch(() => [] as string[]);
		const addresses6 = await dns.promises.resolve6(hostname).catch(() => [] as string[]);
		const allAddresses = [...addresses, ...addresses6];

		if (allAddresses.length === 0) {
			return { valid: false, error: 'Could not resolve hostname' };
		}

		// Check all resolved addresses
		for (const addr of allAddresses) {
			if (isPrivateOrReservedIP(addr)) {
				return {
					valid: false,
					error: 'Hostname resolves to a private/internal IP address',
				};
			}
		}

		return { valid: true };
	} catch {
		return { valid: false, error: 'Failed to resolve hostname' };
	}
}

const ALLOWED_CONTENT_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/avif',
	'image/bmp',
	'image/ico',
	'image/x-icon',
];

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const imageUrl = searchParams.get('url');

	// Validate URL parameter
	if (!imageUrl) {
		return new NextResponse('Missing url parameter', { status: 400 });
	}

	// Validate URL format
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(imageUrl);
	} catch {
		return new NextResponse('Invalid URL format', { status: 400 });
	}

	// Only allow http/https protocols (prevent SSRF with file://, etc.)
	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		return new NextResponse('Only HTTP/HTTPS URLs are allowed', {
			status: 400,
		});
	}

	// Validate that the URL doesn't point to internal/private networks (SSRF protection)
	const hostValidation = await validateRemoteHost(parsedUrl);
	if (!hostValidation.valid) {
		return new NextResponse(hostValidation.error || 'Invalid host', {
			status: 403,
		});
	}

	try {
		// Fetch with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		// Use parsedUrl.toString() instead of raw imageUrl to ensure we use the validated URL
		const response = await fetch(parsedUrl.toString(), {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'image/*,*/*;q=0.8',
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
				status: response.status,
			});
		}

		// Check content type
		const contentType = response.headers.get('content-type')?.toLowerCase() || '';
		const isImage = ALLOWED_CONTENT_TYPES.some((type) =>
			contentType.includes(type.split('/')[1])
		);

		if (!isImage && !contentType.includes('image/')) {
			return new NextResponse('URL does not point to an image', {
				status: 400,
			});
		}

		// Check content length if available
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
			return new NextResponse('Image too large (max 10MB)', { status: 413 });
		}

		// Stream the image
		const imageBuffer = await response.arrayBuffer();

		// Double-check size after download
		if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
			return new NextResponse('Image too large (max 10MB)', { status: 413 });
		}

		// Return image with CORS headers and caching
		return new NextResponse(imageBuffer, {
			status: 200,
			headers: {
				'Content-Type': response.headers.get('content-type') || 'image/jpeg',
				'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}`,
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET',
				// Prevent content sniffing
				'X-Content-Type-Options': 'nosniff',
			},
		});
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return new NextResponse('Request timeout', { status: 504 });
		}

		console.error('Image proxy error:', error);
		return new NextResponse('Failed to fetch image', { status: 500 });
	}
}
