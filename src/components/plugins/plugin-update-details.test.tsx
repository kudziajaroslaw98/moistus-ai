import { formatTimeAgo } from './plugin-update-details';

describe('formatTimeAgo', () => {
	const now = Date.parse('2026-10-05T12:00:00Z');
	const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

	it('reads naturally', () => {
		expect(formatTimeAgo(ago(10), now)).toBe('just now');
		expect(formatTimeAgo(ago(5 * 60), now)).toBe('5 minutes ago');
		expect(formatTimeAgo(ago(3 * 3600), now)).toBe('3 hours ago');
		expect(formatTimeAgo(ago(26 * 3600), now)).toBe('yesterday');
		expect(formatTimeAgo(ago(15 * 86_400), now)).toBe('2 weeks ago');
	});
});
