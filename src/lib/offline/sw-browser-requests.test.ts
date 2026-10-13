import { isLeftToBrowser } from './sw-browser-requests';

const ORIGIN = 'https://shiko.test';
const DRAFT = '11111111-2222-4333-8444-555555555555';

const request = (
	path: string,
	overrides: Partial<
		Pick<Request, 'destination' | 'mode' | 'cache' | 'url'>
	> = {}
) => ({
	url: `${path.startsWith('http') ? '' : ORIGIN}${path}`,
	destination: '' as RequestDestination,
	mode: 'cors' as RequestMode,
	cache: 'default' as RequestCache,
	...overrides,
});

describe('isLeftToBrowser', () => {
	it.each([
		'/api/plugins/drafts/%s/files/plugin.js',
		'/api/plugins/drafts/%s/files/manifest.json',
	])('leaves a draft file to the browser: %s', (template) => {
		expect(
			isLeftToBrowser(request(template.replace('%s', DRAFT)), ORIGIN)
		).toBe(true);
	});

	it('leaves a draft file alone even when the request says no-store', () => {
		expect(
			isLeftToBrowser(
				request(`/api/plugins/drafts/${DRAFT}/files/plugin.js`, {
					cache: 'no-store',
				}),
				ORIGIN
			)
		).toBe(true);
	});

	it('does not touch published plugin files or the rest of the drafts API', () => {
		for (const path of [
			'/plugins/shiko.metric/0.2.0/plugin.js',
			'/api/plugins/files/com.example.reading/1.0.0/plugin.js',
			'/api/plugins/files/com.example.reading/1.0.0/manifest.json',
			'/api/plugins/drafts',
			`/api/plugins/drafts/${DRAFT}`,
			'/api/plugins/catalog',
			// Looks like a draft path but isn't one.
			`/elsewhere/api/plugins/drafts/${DRAFT}/files/plugin.js`,
		]) {
			expect(isLeftToBrowser(request(path), ORIGIN)).toBe(false);
		}
	});

	it('only matches draft files on its own origin', () => {
		expect(
			isLeftToBrowser(
				request(
					`https://other.test/api/plugins/drafts/${DRAFT}/files/plugin.js`
				),
				ORIGIN
			)
		).toBe(false);
	});

	it('keeps the earlier rules: worker scripts, uncached cross-origin requests and /api navigations', () => {
		expect(
			isLeftToBrowser(
				request('/_next/static/chunks/worker.js', { destination: 'worker' }),
				ORIGIN
			)
		).toBe(true);
		expect(
			isLeftToBrowser(request('/x.js', { destination: 'sharedworker' }), ORIGIN)
		).toBe(true);
		expect(
			isLeftToBrowser(
				request('https://api.github.com/repos/a/b', { cache: 'no-store' }),
				ORIGIN
			)
		).toBe(true);
		expect(
			isLeftToBrowser(
				request('/api/user/billing/portal', { mode: 'navigate' }),
				ORIGIN
			)
		).toBe(true);

		// Same-origin no-store and ordinary page navigations still go through Serwist.
		expect(
			isLeftToBrowser(request('/api/maps', { cache: 'no-store' }), ORIGIN)
		).toBe(false);
		expect(
			isLeftToBrowser(request('/dashboard', { mode: 'navigate' }), ORIGIN)
		).toBe(false);
	});
});
