/** The parts of a `Request` the decision needs (the worker passes the real one). */
type SwRequest = Pick<Request, 'destination' | 'mode' | 'cache' | 'url'>;

/** A draft's own files: `/api/plugins/drafts/<id>/files/manifest.json`, `…/plugin.js`. */
const PLUGIN_DRAFT_FILE = /^\/api\/plugins\/drafts\/[^/]+\/files\//;

/**
 * Requests the service worker leaves to the browser, so Serwist's caching never sees
 * them (`src/app/sw.ts` stops them in a listener registered before Serwist's):
 * - Worker scripts. Turbopack passes a worker's bootstrap config in the script URL's
 *   #fragment, which a service-worker response loses, so the plugin runtime failed with
 *   "Missing worker bootstrap config". The plugin network worker must also arrive fresh,
 *   with its own policy.
 * - Plugin refresh requests (`src/lib/plugins/network.ts`): cross-origin with
 *   `cache: 'no-store'`. A cached answer would be saved into the node as fresh data.
 * - Page navigations to /api routes (billing portal, invoices, exports). They answer
 *   with redirects or files, never pages, and a redirect through the worker's offline
 *   fallback shows a page that doesn't exist instead of where the route sends you.
 * - A plugin draft's files. They change with every save, and Serwist answers any `.js`
 *   (stale-while-revalidate) and `.json` (network-first) URL from its cache and ignores
 *   `no-store`, so "Try on a map" and "Submit for review" could read the code from the
 *   save before. Keeping them out also keeps a draft's code out of Cache Storage, which
 *   outlives signing out.
 */
export function isLeftToBrowser(
	request: SwRequest,
	ownOrigin: string
): boolean {
	const url = new URL(request.url);
	const isWorkerScript =
		request.destination === 'worker' || request.destination === 'sharedworker';
	const isUncachedCrossOrigin =
		request.cache === 'no-store' && url.origin !== ownOrigin;
	const isApiNavigation =
		request.mode === 'navigate' && url.pathname.startsWith('/api/');
	const isDraftFile =
		url.origin === ownOrigin && PLUGIN_DRAFT_FILE.test(url.pathname);
	return (
		isWorkerScript || isUncachedCrossOrigin || isApiNavigation || isDraftFile
	);
}
