import { formatUpdatedAt } from './format-updated-at';

const NOW = new Date('2026-10-06T15:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatUpdatedAt', () => {
	it.each([
		[ago(20_000), 'Just now'],
		[ago(MINUTE), '1 minute ago'],
		[ago(5 * MINUTE), '5 minutes ago'],
		[ago(HOUR), '1 hour ago'],
		[ago(2 * HOUR), '2 hours ago'],
		[ago(30 * HOUR), 'Yesterday'],
		[ago(3 * DAY), '3 days ago'],
		[ago(6 * DAY), '6 days ago'],
	])('formats %s as %s', (iso, expected) => {
		expect(formatUpdatedAt(iso, NOW)).toBe(expected);
	});

	it('shows month and day after a week in the current year', () => {
		expect(formatUpdatedAt('2026-09-28T10:00:00Z', NOW)).toBe('Sep 28');
	});

	it('adds the year for older dates', () => {
		expect(formatUpdatedAt('2025-03-02T10:00:00Z', NOW)).toBe('Mar 2, 2025');
	});

	it('treats future timestamps (clock skew) as just now', () => {
		expect(formatUpdatedAt(ago(-5 * MINUTE), NOW)).toBe('Just now');
	});

	it('returns an empty string for invalid dates', () => {
		expect(formatUpdatedAt('not a date', NOW)).toBe('');
	});
});
