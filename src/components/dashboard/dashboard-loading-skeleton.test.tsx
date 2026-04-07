import { render, screen } from '@testing-library/react';
import {
	DashboardMapsLoadingSkeleton,
	DashboardRouteLoadingSkeleton,
} from './dashboard-loading-skeleton';

describe('Dashboard loading skeletons', () => {
	it('renders the route-level dashboard shell skeleton', () => {
		render(<DashboardRouteLoadingSkeleton />);

		expect(screen.getByTestId('dashboard-route-loading-skeleton')).toBeInTheDocument();
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
