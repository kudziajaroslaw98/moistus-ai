let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
	usePathname: () => mockPathname,
}));

import { act, render, screen } from '@testing-library/react';
import {
	DashboardShellProvider,
	useDashboardNewMapAction,
	useDashboardSearch,
	useDashboardShell,
} from './dashboard-shell-context';

/** Stands in for the shell's top bar and sidebar button. */
function ShellReadout() {
	const { query, searchHidden, newMapAction } = useDashboardShell();
	return (
		<>
			<output data-testid='query'>{query}</output>
			<output data-testid='hidden'>{String(searchHidden)}</output>
			<button disabled={!newMapAction} onClick={() => newMapAction?.()} type='button'>
				New map
			</button>
		</>
	);
}

let pageSetQuery: (query: string) => void = () => {};

function SearchPage({ hidden = false }: { hidden?: boolean }) {
	const { query, setQuery } = useDashboardSearch({ hidden });
	pageSetQuery = setQuery;
	return <output data-testid='page-query'>{query}</output>;
}

function NewMapPage({ action }: { action: () => void }) {
	useDashboardNewMapAction(action);
	return null;
}

function renderShell(page: React.ReactNode) {
	return render(
		<DashboardShellProvider>
			<ShellReadout />
			{page}
		</DashboardShellProvider>
	);
}

beforeEach(() => {
	mockPathname = '/dashboard';
});

describe('dashboard shell context', () => {
	it('shares the query between the top bar and the page, and starts empty on the next page', () => {
		const view = renderShell(<SearchPage key='home' />);

		act(() => pageSetQuery('roadmap'));
		expect(screen.getByTestId('query')).toHaveTextContent('roadmap');
		expect(screen.getByTestId('page-query')).toHaveTextContent('roadmap');

		mockPathname = '/dashboard/templates';
		view.rerender(
			<DashboardShellProvider>
				<ShellReadout />
				<SearchPage key='templates' />
			</DashboardShellProvider>
		);

		expect(screen.getByTestId('query')).toBeEmptyDOMElement();
		expect(screen.getByTestId('page-query')).toBeEmptyDOMElement();
	});

	it('hides the search field while the page asks, and shows it again when the page leaves', () => {
		const view = renderShell(<SearchPage hidden />);
		expect(screen.getByTestId('hidden')).toHaveTextContent('true');

		view.rerender(
			<DashboardShellProvider>
				<ShellReadout />
			</DashboardShellProvider>
		);
		expect(screen.getByTestId('hidden')).toHaveTextContent('false');
	});

	it('runs the page’s New map action and drops it when the page leaves', () => {
		const action = jest.fn();
		const view = renderShell(<NewMapPage action={action} />);

		act(() => screen.getByRole('button', { name: 'New map' }).click());
		expect(action).toHaveBeenCalledTimes(1);

		view.rerender(
			<DashboardShellProvider>
				<ShellReadout />
			</DashboardShellProvider>
		);
		expect(screen.getByRole('button', { name: 'New map' })).toBeDisabled();
	});

	it('keeps the next page’s state when the old page cleans up during navigation', () => {
		const homeAction = jest.fn();
		const nextAction = jest.fn();
		const view = renderShell(<NewMapPage action={homeAction} key='home' />);

		// Like a Next navigation: the path changes, the old page unmounts and the new
		// page mounts in one commit, so the old page's cleanup runs alongside it.
		mockPathname = '/dashboard/recipes';
		view.rerender(
			<DashboardShellProvider>
				<ShellReadout />
				<SearchPage hidden key='next-search' />
				<NewMapPage action={nextAction} key='next' />
			</DashboardShellProvider>
		);

		expect(screen.getByTestId('hidden')).toHaveTextContent('true');
		act(() => screen.getByRole('button', { name: 'New map' }).click());
		expect(nextAction).toHaveBeenCalledTimes(1);
		expect(homeAction).not.toHaveBeenCalled();
	});
});
