type PolarHttpError = {
	statusCode?: unknown;
};

export interface CheckoutErrorResponse {
	error: string;
	status: number;
}

const genericError: CheckoutErrorResponse = {
	error: 'Something went wrong. Please try again or contact support.',
	status: 500,
};

/**
 * Converts provider and local configuration errors into safe, actionable
 * checkout responses. Raw Polar responses can include implementation details
 * and must never be forwarded to the browser.
 */
export function getCheckoutErrorResponse(
	error: unknown
): CheckoutErrorResponse {
	if (error instanceof Error) {
		if (error.message.includes('POLAR_ACCESS_TOKEN')) {
			return {
				error: 'Billing is not configured yet. Please contact support.',
				status: 503,
			};
		}

		if (error.message.includes('POLAR_PRO_')) {
			return {
				error:
					'The selected billing plan is unavailable. Please contact support.',
				status: 503,
			};
		}
	}

	const statusCode = (error as PolarHttpError | null)?.statusCode;
	if (statusCode === 401 || statusCode === 403) {
		return {
			error:
				'The billing provider rejected this checkout. Please contact support.',
			status: 502,
		};
	}

	if (statusCode === 404 || statusCode === 422) {
		return {
			error:
				'The selected billing plan is unavailable. Please contact support.',
			status: 502,
		};
	}

	return genericError;
}
