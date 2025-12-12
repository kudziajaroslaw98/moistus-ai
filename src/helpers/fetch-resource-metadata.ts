/**
 * Utility for fetching URL metadata from the process-url API endpoint.
 * Used by resource nodes to auto-populate title, description, image, and AI summary.
 */

export interface ResourceMetadata {
	title: string | null;
	description: string | null;
	imageUrl: string | null;
	summary: string | null;
}

/**
 * Fetches metadata for a given URL using the /api/process-url endpoint.
 * Extracts OpenGraph tags and optionally generates an AI summary.
 *
 * @param url - The URL to fetch metadata for
 * @param generateSummary - Whether to generate an AI summary (default: true)
 * @returns Promise with extracted metadata
 * @throws Error if the fetch fails or API returns an error
 */
export async function fetchResourceMetadata(
	url: string,
	generateSummary: boolean = true
): Promise<ResourceMetadata> {
	const response = await fetch('/api/process-url', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url, generateSummary }),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.message || `Failed to fetch metadata: ${response.statusText}`
		);
	}

	const data = await response.json();

	// API returns { data: {...}, message: '...' } format
	return data.data as ResourceMetadata;
}
