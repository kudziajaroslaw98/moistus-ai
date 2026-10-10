'use client';

import { usePathname } from 'next/navigation';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from 'react';

/**
 * Pages with a search field in the top bar. The field belongs to the shell (so it
 * renders on the server and survives navigation, and Ctrl/Cmd+F focuses it on every
 * one of these pages); the page reads the query with `useDashboardSearch()`.
 */
export const DASHBOARD_HEADER_SEARCH: Readonly<
	Record<string, { id: string; label: string }>
> = {
	'/dashboard': { id: 'dashboard-map-search', label: 'Search maps' },
	'/dashboard/templates': { id: 'templates-search', label: 'Search templates' },
	'/dashboard/recipes': { id: 'recipes-search', label: 'Search recipes' },
	'/dashboard/plugins': { id: 'plugins-search', label: 'Search plugins' },
};

/** What the current page has told the shell. Keyed by path so nothing leaks to the next page. */
interface PageShellState {
	path: string;
	query: string;
	searchHidden: boolean;
	newMapAction: (() => void) | null;
}

interface DashboardShellContextValue {
	query: string;
	searchHidden: boolean;
	newMapAction: (() => void) | null;
	searchInputRef: RefObject<HTMLInputElement | null>;
	setQuery: (query: string) => void;
	update: (patch: Partial<Omit<PageShellState, 'path'>>) => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(
	null
);

const emptyPageState = (path: string): PageShellState => ({
	path,
	query: '',
	searchHidden: false,
	newMapAction: null,
});

/** Lets pages inside `DashboardLayout` fill the shell's top-bar search and "New map" button. */
export function DashboardShellProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [pageState, setPageState] = useState(() => emptyPageState(pathname));
	const current =
		pageState.path === pathname ? pageState : emptyPageState(pathname);

	const update = useCallback(
		(patch: Partial<Omit<PageShellState, 'path'>>) =>
			setPageState((previous) => ({
				...(previous.path === pathname ? previous : emptyPageState(pathname)),
				...patch,
			})),
		[pathname]
	);
	const setQuery = useCallback((query: string) => update({ query }), [update]);

	const value = useMemo(
		() => ({
			query: current.query,
			searchHidden: current.searchHidden,
			newMapAction: current.newMapAction,
			searchInputRef,
			setQuery,
			update,
		}),
		[
			current.query,
			current.searchHidden,
			current.newMapAction,
			setQuery,
			update,
		]
	);

	return (
		<DashboardShellContext.Provider value={value}>
			{children}
		</DashboardShellContext.Provider>
	);
}

export function useDashboardShell(): DashboardShellContextValue {
	const context = useContext(DashboardShellContext);
	if (!context) {
		throw new Error('useDashboardShell must be used within DashboardLayout.');
	}
	return context;
}

/**
 * The top-bar search query for this page (see `DASHBOARD_HEADER_SEARCH`). It starts
 * empty on every visit. `hidden` removes the field, e.g. while there is nothing to search.
 */
export function useDashboardSearch({
	hidden = false,
}: { hidden?: boolean } = {}) {
	const { query, setQuery, update } = useDashboardShell();

	useEffect(() => {
		if (!hidden) return;
		update({ searchHidden: true });
		return () => update({ searchHidden: false });
	}, [hidden, update]);

	return { query, setQuery };
}

/**
 * Makes the sidebar "New map" button run `action` on this page. Elsewhere it links to
 * `/dashboard?create=1`.
 */
export function useDashboardNewMapAction(action: () => void) {
	const { update } = useDashboardShell();

	useEffect(() => {
		update({ newMapAction: action });
		return () => update({ newMapAction: null });
	}, [action, update]);
}
