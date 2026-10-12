import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';

let mockStore: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStore),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockRemember = jest.fn();
jest.mock('@/store/slices/plugins-slice', () => ({
	rememberDevPluginUrl: (...args: unknown[]) => mockRemember(...args),
}));

import { TryOnMapPopover } from './try-on-map-popover';

const DRAFT = '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01';

function setup({
	saved = true,
	maps = [
		{ id: 'map-1', title: 'Launch plan', plugins: [] },
		{ id: 'map-2', title: '', plugins: [] },
	],
} = {}) {
	mockStore = { userProfile: { user_id: 'user-1' } };
	global.fetch = jest.fn(async () => ({
		ok: true,
		json: async () => ({ data: { maps } }),
	})) as unknown as typeof fetch;
	const saveFirst = jest.fn().mockResolvedValue(saved);
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<TryOnMapPopover draftId={DRAFT} saveFirst={saveFirst} />
		</SWRConfig>
	);
	return { saveFirst, user: userEvent.setup() };
}

beforeEach(() => jest.clearAllMocks());

describe('TryOnMapPopover', () => {
	it('lists the maps you own and says what happens', async () => {
		const { user } = setup();
		await user.click(screen.getByRole('button', { name: 'Try on a map' }));

		expect(
			await screen.findByRole('button', { name: 'Launch plan' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Untitled map' })
		).toBeInTheDocument();
		expect(
			screen.getByText(/Opens the map with your draft loaded/)
		).toBeInTheDocument();
	});

	it('saves the draft, remembers it for that map and opens the map', async () => {
		const { saveFirst, user } = setup();
		await user.click(screen.getByRole('button', { name: 'Try on a map' }));
		await user.click(
			await screen.findByRole('button', { name: 'Launch plan' })
		);

		await waitFor(() =>
			expect(mockPush).toHaveBeenCalledWith('/mind-map/map-1')
		);
		expect(saveFirst).toHaveBeenCalled();
		expect(mockRemember).toHaveBeenCalledWith(
			'user-1',
			'map-1',
			`${window.location.origin}/api/plugins/drafts/${DRAFT}/files/manifest.json`
		);
	});

	it('stays on the page and says so when the draft could not be saved first', async () => {
		const { user } = setup({ saved: false });
		await user.click(screen.getByRole('button', { name: 'Try on a map' }));
		await user.click(
			await screen.findByRole('button', { name: 'Launch plan' })
		);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/Couldn’t save the draft first/
		);
		expect(mockRemember).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('says when you own no maps yet', async () => {
		const { user } = setup({ maps: [] });
		await user.click(screen.getByRole('button', { name: 'Try on a map' }));
		expect(await screen.findByText(/don’t have a map yet/)).toBeInTheDocument();
	});
});
