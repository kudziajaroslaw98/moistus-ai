import { render, screen } from '@testing-library/react';
import {
	DashboardHomeLoadingSkeleton,
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

	it('renders the Home content skeleton on its own for in-dashboard navigation', () => {
		const { container } = render(<DashboardHomeLoadingSkeleton />);

		expect(container.querySelector('aside')).toBeNull();
		expect(screen.getAllByTestId('dashboard-grid-map-skeleton')).toHaveLength(8);
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
