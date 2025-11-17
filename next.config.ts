import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: true,
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

export default nextConfig;
