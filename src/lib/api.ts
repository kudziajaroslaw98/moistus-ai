import { ApiResponse } from '@/types/api-response';

// Custom error class for API errors
export class ApiError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		message: string,
		public data?: any
	) {
		super(message);
		this.name = 'ApiError';
	}
}

// Base API configuration
const API_BASE_URL = '/api';

// Default headers for API requests
const DEFAULT_HEADERS = {
	'Content-Type': 'application/json',
};

// Generic API request function
async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<ApiResponse<T>> {
	const url = endpoint.startsWith('http')
		? endpoint
		: `${API_BASE_URL}${endpoint}`;

	const config: RequestInit = {
		headers: {
			...DEFAULT_HEADERS,
			...options.headers,
		},
		...options,
	};

	try {
		const response = await fetch(url, config);
		let data;
		try {
			data = await response.json();
		} catch (parseError) {
			data = { error: 'Invalid response format' };
		}

		if (!response.ok) {
			throw new ApiError(
				response.status,
				response.statusText,
				data.error || data.message || 'Request failed',
				data
			);
		}

		return data;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}

		// Network or parsing errors
		throw new ApiError(
			0,
			'Network Error',
			error instanceof Error ? error.message : 'Unknown error occurred'
		);
	}
}

// Specific HTTP method helpers
export const api = {
	get: <T>(endpoint: string, options?: RequestInit) =>
		apiRequest<T>(endpoint, { ...options, method: 'GET' }),

	post: <T>(endpoint: string, data?: any, options?: RequestInit) =>
		apiRequest<T>(endpoint, {
			...options,
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined,
		}),

	put: <T>(endpoint: string, data?: any, options?: RequestInit) =>
		apiRequest<T>(endpoint, {
			...options,
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined,
		}),

	delete: <T>(endpoint: string, options?: RequestInit) =>
		apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

	patch: <T>(endpoint: string, data?: any, options?: RequestInit) =>
		apiRequest<T>(endpoint, {
			...options,
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined,
		}),
};

// Utility function to handle API errors in components
export function handleApiError(error: unknown): string {
	if (error instanceof ApiError) {
		// Handle specific error cases
		switch (error.status) {
			case 400:
				return error.message || 'Invalid request. Please check your input.';
			case 401:
				return 'You are not authorized. Please log in again.';
			case 403:
				return 'You do not have permission to perform this action.';
			case 404:
				return 'The requested resource was not found.';
			case 409:
				return error.message || 'A conflict occurred with the current state.';
			case 429:
				return error.message || 'Too many requests. Please try again later.';
			case 500:
				return 'A server error occurred. Please try again later.';
			default:
				return error.message || 'An unexpected error occurred.';
		}
	}

	return 'An unexpected error occurred. Please try again.';
}

// Utility function to check if error is a specific type
export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}

// Utility function to check if error is a specific status code
export function isApiErrorWithStatus(error: unknown, status: number): boolean {
	return isApiError(error) && error.status === status;
}

// Retry utility for failed requests
export async function retryApiRequest<T>(
	requestFn: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await requestFn();
		} catch (error) {
			lastError = error;

			// Don't retry on client errors (4xx)
			if (isApiError(error) && error.status >= 400 && error.status < 500) {
				throw error;
			}

			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				break;
			}

			// Wait before retrying
			await new Promise((resolve) =>
				setTimeout(resolve, delay * (attempt + 1))
			);
		}
	}

	throw lastError;
}

// Specific API functions for common operations
export const waitlistApi = {
	submit: (email: string) => api.post('/waitlist', { email }),
};
