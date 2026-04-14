import { spawnSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';
import packageJson from '../../../../package.json';

const revisionFromGit =
	spawnSync('git', ['rev-parse', 'HEAD'], {
		encoding: 'utf-8',
	}).stdout?.trim() ||
	process.env.DEPLOYMENT_REVISION ||
	process.env.VERCEL_GIT_COMMIT_SHA ||
	process.env.GIT_COMMIT_SHA ||
	packageJson.version ||
	'offline-fallback';

export const {
	dynamic,
	dynamicParams,
	revalidate,
	generateStaticParams,
	GET,
} = createSerwistRoute({
	additionalPrecacheEntries: [{ url: '/~offline', revision: revisionFromGit }],
	swSrc: 'src/app/sw.ts',
	useNativeEsbuild: true,
});
