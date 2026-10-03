import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';

/** HTTP(S) origin plus matching WS(S) origin for a configured service URL. */
const toConnectOrigins = (value: string | undefined): string[] => {
	if (!value) return [];
	try {
		const url = new URL(value.includes('://') ? value : `https://${value}`);
		const wsProtocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
		return [url.origin, `${wsProtocol}//${url.host}`];
	} catch {
		return [];
	}
};

// Report-only until violations from real traffic are reviewed; then enforce.
const contentSecurityPolicyReportOnly = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	[
		'connect-src',
		"'self'",
		...toConnectOrigins(process.env.NEXT_PUBLIC_SUPABASE_URL),
		...toConnectOrigins(process.env.NEXT_PUBLIC_PARTYKIT_URL),
	].join(' '),
	"worker-src 'self' blob:",
	"manifest-src 'self'",
	"frame-src 'self'",
	"frame-ancestors 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
].join('; ');

const securityHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
	{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
	...(process.env.NODE_ENV === 'production'
		? [
				{
					key: 'Content-Security-Policy-Report-Only',
					value: contentSecurityPolicyReportOnly,
				},
			]
		: []),
];

const nextConfig: NextConfig = {
	async headers() {
		return [{ source: '/:path*', headers: securityHeaders }];
	},
	/* config options here */
	reactStrictMode: true,
	reactCompiler: true,
	transpilePackages: ['uuid'],
	allowedDevOrigins: ['192.168.0.239'],
	devIndicators: {
		position: 'bottom-right',
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**.**',
			},
			{
				protocol: 'https',
				hostname: 'images.pexels.com',
			},
			{
				protocol: 'https',
				hostname: 'media2.dev.to',
			},
			{
				protocol: 'https',
				hostname: 'cdn.discordapp.com',
			},
			{
				protocol: 'https',
				hostname: 'api.dicebear.com',
			},
		],
	},
};

export default withSerwist(nextConfig);
