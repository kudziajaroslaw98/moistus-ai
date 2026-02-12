import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: [
				'/dashboard',
				'/mind-map',
				'/dev',
				'/api',
				'/auth/callback',
				'/auth/verify',
				'/access-denied',
			],
		},
		sitemap: 'https://shiko.app/sitemap.xml',
	};
}
