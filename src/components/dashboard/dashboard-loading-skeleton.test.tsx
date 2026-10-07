import { render, screen } from '@testing-library/react';
import {
	DashboardMapsLoadingSkeleton,
	DashboardRouteLoadingSkeleton,
} from './dashboard-loading-skeleton';

describe('Dashboard loading skeletons', () => {
	it('renders the route-level dashboard shell skeleton', () => {
		render(<DashboardRouteLoadingSkeleton />);

		expect(screen.getByTestId('dashboard-route-loading-skeleton')).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-home-loading-skeleton')).toBeInTheDocument();
		expect(screen.getAllByTestId('dashboard-grid-map-skeleton')).toHaveLength(8);
	});

	it('draws a narrow sidebar when the saved sidebar state is collapsed', () => {
		const { container } = render(<DashboardRouteLoadingSkeleton sidebarCollapsed />);

		expect(container.querySelector('aside')).toHaveClass('w-[3.25rem]');
	});

	it('includes the room-code box and the three shortcut hints under the grid', () => {
		render(<DashboardRouteLoadingSkeleton />);

		expect(screen.getByTestId('room-code-skeleton')).toBeInTheDocument();
		expect(screen.getByTestId('shortcuts-skeleton').children).toHaveLength(3);
	});

	it('draws no real headings, since it can show before any dashboard page', () => {
		render(<DashboardRouteLoadingSkeleton />);

		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
	});

	it('renders configurable grid map skeleton count', () => {
		render(<DashboardMapsLoadingSkeleton cardCount={3} viewMode='grid' />);

		expect(screen.getAllByTestId('dashboard-grid-map-skeleton')).toHaveLength(3);
	});

	it('renders configurable list map skeleton count', () => {
		render(<DashboardMapsLoadingSkeleton cardCount={2} viewMode='list' />);

		expect(screen.getAllByTestId('dashboard-list-map-skeleton')).toHaveLength(2);
	});
});
