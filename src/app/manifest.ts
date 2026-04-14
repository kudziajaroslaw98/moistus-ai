import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Shiko',
		short_name: 'Shiko',
		description: 'AI-powered mind mapping for power users',
		lang: 'en-US',
		dir: 'ltr',
		start_url: '/dashboard',
		id: '/',
		display: 'standalone',
		display_override: ['window-controls-overlay', 'standalone'],
		scope: '/',
		orientation: 'any',
		background_color: '#09090b',
		theme_color: '#09090b',
		categories: ['productivity', 'collaboration'],
		screenshots: [
			{
				src: '/images/pwa/screenshot-dashboard-wide.png',
				sizes: '1280x720',
				type: 'image/png',
				form_factor: 'wide',
				label: 'Shiko dashboard workspace',
			},
			{
				src: '/images/pwa/screenshot-mindmap-narrow.png',
				sizes: '750x1334',
				type: 'image/png',
				form_factor: 'narrow',
				label: 'Shiko mind-map editor on mobile',
			},
		],
		shortcuts: [
			{
				name: 'Dashboard',
				short_name: 'Dashboard',
				description: 'Open your workspace dashboard',
				url: '/dashboard',
				icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
			},
			{
				name: 'New Map',
				short_name: 'New Map',
				description: 'Start a new mind map',
				url: '/mind-map',
				icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
			},
			{
				name: 'Templates',
				short_name: 'Templates',
				description: 'Browse and apply map templates',
				url: '/dashboard/templates',
				icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
			},
		],
		icons: [
			{
				src: '/icons/icon-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/icons/icon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/icons/icon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable',
			},
			{
				src: '/icons/icon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'monochrome',
			},
		],
	};
}
