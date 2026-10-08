/**
 * @jest-environment node
 */
import { DASHBOARD_PATH_HEADER } from '@/helpers/dashboard/dashboard-path-header';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

/** Next passes overridden request headers to the route as `x-middleware-request-<name>`. */
const forwarded = (response: Response) =>
	response.headers.get(`x-middleware-request-${DASHBOARD_PATH_HEADER}`);

describe('proxy', () => {
	it('passes the dashboard pathname to the dashboard layout', () => {
		const response = proxy(
			new NextRequest('https://shiko.app/dashboard/templates?view=list')
		);

		expect(forwarded(response)).toBe('/dashboard/templates');
	});

	it('overwrites a path header sent by the client', () => {
		const response = proxy(
			new NextRequest('https://shiko.app/dashboard', {
				headers: { [DASHBOARD_PATH_HEADER]: 'https://evil.example' },
			})
		);

		expect(forwarded(response)).toBe('/dashboard');
	});

	it('leaves other routes alone', () => {
		for (const path of ['/dashboards', '/mind-map/abc', '/']) {
			const response = proxy(new NextRequest(`https://shiko.app${path}`));
			expect(forwarded(response)).toBeNull();
		}
	});

	it('still sends magic-link codes to the verify page', () => {
		const response = proxy(new NextRequest('https://shiko.app/?code=abc'));

		expect(response.headers.get('location')).toBe(
			'https://shiko.app/auth/verify?code=abc'
		);
	});
});
