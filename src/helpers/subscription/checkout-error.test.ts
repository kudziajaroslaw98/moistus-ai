import { getCheckoutErrorResponse } from './checkout-error';

describe('getCheckoutErrorResponse', () => {
	it('does not expose a missing access-token detail', () => {
		expect(
			getCheckoutErrorResponse(
				new Error('POLAR_ACCESS_TOKEN is not configured')
			)
		).toEqual({
			error: 'Billing is not configured yet. Please contact support.',
			status: 503,
		});
	});

	it('classifies rejected Polar credentials without returning provider details', () => {
		expect(
			getCheckoutErrorResponse({ statusCode: 403, body: 'private' })
		).toEqual({
			error:
				'The billing provider rejected this checkout. Please contact support.',
			status: 502,
		});
	});

	it('classifies an unavailable configured product', () => {
		expect(getCheckoutErrorResponse({ statusCode: 422 })).toEqual({
			error:
				'The selected billing plan is unavailable. Please contact support.',
			status: 502,
		});
	});
});
