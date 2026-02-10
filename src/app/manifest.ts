import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Shiko',
		short_name: 'Shiko',
		description: 'AI-powered mind mapping for power users',
		start_url: '/',
		display: 'standalone',
		background_color: '#09090b',
		theme_color: '#09090b',
		icons: [
			{
				src: '/favicon.ico',
				sizes: 'any',
				type: 'image/x-icon',
			},
		],
	};
}
