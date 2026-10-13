import { mapPolarStatus } from './polar';

describe('mapPolarStatus', () => {
	it.each([
		['active', 'active'],
		['trialing', 'trialing'],
		['past_due', 'past_due'],
		['canceled', 'canceled'],
		['unpaid', 'unpaid'],
		['incomplete', 'incomplete'],
		['incomplete_expired', 'incomplete'],
	] as const)('maps %s to %s', (polarStatus, expected) => {
		expect(mapPolarStatus(polarStatus)).toBe(expected);
	});

	it('restricts access for paused subscriptions without treating them as unknown', () => {
		expect(mapPolarStatus('paused')).toBe('unpaid');
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('restricts access for unknown statuses and warns', () => {
		expect(mapPolarStatus('something_new')).toBe('unpaid');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Unknown subscription status')
		);
	});
});
