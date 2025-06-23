import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	devIndicators: {
		position: 'bottom-right',
	},
	rewrites: async () => {
		return [
			{
				source: '/api/:path*',
				destination: `${process.env.NEXT_PUBLIC_APP_LOCAL_HREF}/api/:path*`,
			},
		];
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
