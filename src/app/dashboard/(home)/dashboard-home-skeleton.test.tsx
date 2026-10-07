// The page module imports the app store (and through it Supabase); the skeleton uses neither.
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: Object.assign(() => undefined, { getState: () => ({}) }),
}));
jest.mock('@/components/dashboard/use-dashboard-data', () => ({
	DASHBOARD_MAPS_KEY: '/api/maps',
	useDashboardMaps: () => ({ maps: [], isLoading: true }),
	useDashboardTemplates: () => [
		{
			id: 'tpl-1',
			templateId: 'swot',
			name: 'SWOT analysis',
			description: null,
			nodeCount: 5,
		},
	],
}));

import { render, screen } from '@testing-library/react';
import { DashboardHomePageSkeleton } from './dashboard-content';

describe('DashboardHomePageSkeleton', () => {
	it('shows the static heading and quick-create bar, and skeletons only the map list', () => {
		render(<DashboardHomePageSkeleton />);

		expect(
			screen.getByRole('heading', { name: 'Your maps' })
		).toBeInTheDocument();
		// Inert: visible but not focusable, so nothing typed is lost when the page mounts.
		const input = screen.getByPlaceholderText('Start a map from a thought…');
		expect(input.closest('[inert]')).not.toBeNull();
		expect(screen.getByText('SWOT analysis')).toBeInTheDocument();
		expect(screen.getByTestId('maps-stats-skeleton')).toBeInTheDocument();
		expect(screen.getAllByTestId('dashboard-grid-map-skeleton')).toHaveLength(
			8
		);
	});
});
