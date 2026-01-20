import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkMapAccess } from './access-check';
import { MindMapContent } from './mind-map-content';
import { mapAccessRateLimiter } from '@/helpers/api/rate-limiter';

interface PageProps {
	params: Promise<{ id: string }>;
}

/**
 * Extract client IP from headers (server component version).
 * Checks common proxy headers in order of trust.
 */
function getClientIPFromHeaders(headersList: Headers): string {
	// Most trusted first (Cloudflare, then common proxies)
	const cfIp = headersList.get('cf-connecting-ip');
	if (cfIp) return cfIp.trim();

	const realIp = headersList.get('x-real-ip');
	if (realIp) return realIp.trim();

	const forwardedFor = headersList.get('x-forwarded-for');
	if (forwardedFor) {
		// Take first IP (original client)
		const firstIp = forwardedFor.split(',')[0]?.trim();
		if (firstIp) return firstIp;
	}

	return 'unknown';
}

/**
 * Server component wrapper for mind map pages.
 * Validates access server-side before rendering the client component.
 *
 * Security benefits:
 * - Rate limiting prevents DDoS-like abuse
 * - Access check happens before any client JS loads
 * - Unauthorized users never download the canvas bundle
 */
export default async function MindMapPage({ params }: PageProps) {
	const { id: mapId } = await params;

	// Rate limiting (DDoS prevention)
	const headersList = await headers();
	const ip = getClientIPFromHeaders(headersList);
	const rateLimit = mapAccessRateLimiter.check(ip);

	if (!rateLimit.allowed) {
		redirect('/access-denied?reason=rate_limited');
	}

	// Access check
	const access = await checkMapAccess(mapId);

	switch (access.status) {
		case 'no_session':
			redirect(
				`/auth/sign-in?redirectedFrom=${encodeURIComponent(`/mind-map/${mapId}`)}`
			);

		case 'not_found':
			redirect(`/access-denied?reason=not_found&mapId=${mapId}`);

		case 'no_access':
			redirect(`/access-denied?reason=no_access&mapId=${mapId}`);

		case 'owner':
		case 'shared':
		case 'template':
			// Authorized - render client component
			return <MindMapContent />;
	}
}

// Prevent caching of access decisions
export const dynamic = 'force-dynamic';
