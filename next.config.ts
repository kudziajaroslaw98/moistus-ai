import type { NextConfig } from 'next';
import { spawnSync } from 'node:child_process';
import withSerwistInit from '@serwist/next';

const revisionFromGit =
	spawnSync('git', ['rev-parse', 'HEAD'], {
		encoding: 'utf-8',
	}).stdout?.trim() || `${Date.now()}`;

const withSerwist = withSerwistInit({
	additionalPrecacheEntries: [{ url: '/~offline', revision: revisionFromGit }],
	swSrc: 'src/app/sw.ts',
	swDest: 'public/sw.js',
	register: false,
});

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: true,
	reactCompiler: true,
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
