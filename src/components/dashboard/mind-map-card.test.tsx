import type { DashboardMap } from '@/types/dashboard-map';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MindMapCard } from './mind-map-card';

const MAP: DashboardMap = {
	id: 'map-1',
	user_id: 'user-1',
	title: 'Roadmap',
	description: 'Plans for the next quarter',
	created_at: '2026-10-01T10:00:00.000Z',
	updated_at: '2026-10-01T10:00:00.000Z',
	_count: { nodes: 12, edges: 11 },
};

/** jsdom has no layout, so pretend the description overflows its clamp. */
function mockClampedText(clamped: boolean) {
	jest
		.spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
		.mockReturnValue(clamped ? 60 : 40);
	jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40);
}

afterEach(() => jest.restoreAllMocks());

describe('MindMapCard', () => {
	it.each(['grid', 'list'] as const)(
		'says there is no description when a map has none (%s)',
		(viewMode) => {
			const { rerender } = render(
				<MindMapCard map={{ ...MAP, description: null }} viewMode={viewMode} />
			);
			expect(screen.getByText('No description available')).toBeInTheDocument();

			// Whitespace-only counts as empty too.
			rerender(
				<MindMapCard map={{ ...MAP, description: '   ' }} viewMode={viewMode} />
			);
			expect(screen.getByText('No description available')).toBeInTheDocument();
		}
	);

	it('shows the description and the updated/node meta in both views', () => {
		const { rerender } = render(<MindMapCard map={MAP} viewMode='grid' />);
		expect(screen.getByText('Plans for the next quarter')).toBeInTheDocument();
		expect(screen.getByText(/12 nodes/)).toBeInTheDocument();
		expect(
			screen.queryByText('No description available')
		).not.toBeInTheDocument();

		rerender(<MindMapCard map={MAP} viewMode='list' />);
		expect(screen.getByText('Plans for the next quarter')).toBeInTheDocument();
		expect(screen.getByText(/12 nodes/)).toBeInTheDocument();
	});

	it('offers Show more only when the description is cut off, and Show less after', async () => {
		mockClampedText(false);
		const { unmount } = render(<MindMapCard map={MAP} viewMode='grid' />);
		expect(
			screen.queryByRole('button', { name: 'Show more' })
		).not.toBeInTheDocument();
		unmount();

		mockClampedText(true);
		const user = userEvent.setup();
		render(<MindMapCard map={MAP} viewMode='grid' />);

		await user.click(screen.getByRole('button', { name: 'Show more' }));
		expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
	});
});
