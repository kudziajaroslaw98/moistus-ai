import {
	checkPluginRequestUrl,
	type PluginResponse,
} from '@/lib/plugins/network';

/** What the playground gives a plugin's `refresh` for each URL it asks for. */
export type FetchAll = (
	urls: string[]
) => Promise<Record<string, PluginResponse>>;

/**
 * Answers a plugin's requests from JSON the author typed instead of the network. The
 * plugin still has to ask for its declared sites only (same URL rules as a real request),
 * so a wrong address fails here the way it would for real. Nothing leaves the browser.
 */
export function mockFetchAll(
	answerText: string,
	allowedHosts: readonly string[]
): FetchAll {
	let answer: { json: unknown } | { problem: string };
	try {
		answer = { json: JSON.parse(answerText) };
	} catch {
		answer = { problem: 'The mock answer isn’t valid JSON.' };
	}

	return async (urls) =>
		Object.fromEntries(
			urls.map((url): [string, PluginResponse] => {
				const checked = checkPluginRequestUrl(url, allowedHosts, []);
				if (!checked.ok) {
					return [
						url,
						{ status: 'error', code: null, message: checked.message },
					];
				}
				return [
					url,
					'problem' in answer
						? { status: 'error', code: null, message: answer.problem }
						: { status: 'ok', code: 200, json: answer.json },
				];
			})
		);
}
