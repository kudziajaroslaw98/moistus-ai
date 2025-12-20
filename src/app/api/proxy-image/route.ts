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

	try {
		// Fetch with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		const response = await fetch(imageUrl, {
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
