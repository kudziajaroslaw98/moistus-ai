import { render, screen, waitFor, within } from '@testing-library/react';
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

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock('sonner', () => ({
	toast: {
		success: (...a: unknown[]) => mockToast.success(...a),
		error: (...a: unknown[]) => mockToast.error(...a),
	},
}));

import { PluginDraftsSection } from './plugin-drafts-section';

const draft = (overrides: Record<string, unknown> = {}) => ({
	id: 'd1',
	pluginId: 'dev.counter-9b2c41a7',
	name: 'Counter',
	icon: 'puzzle',
	description: 'Count anything.',
	checkSummary: { passed: 5, total: 5 },
	baseVersion: null,
	updatedAt: new Date().toISOString(),
	...overrides,
});

function setup(drafts: unknown[], developerMode = true) {
	mockStore = {
		userProfile: { is_anonymous: false, preferences: { developerMode } },
	};
	const calls: string[] = [];
	global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
		calls.push(`${init?.method ?? 'GET'} ${url}`);
		return {
			ok: true,
			status: 200,
			json: async () => ({
				data: init?.method === 'DELETE' ? { id: 'd1' } : drafts,
			}),
		};
	}) as unknown as typeof fetch;
	const onWrite = jest.fn();
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<PluginDraftsSection onWrite={onWrite} />
		</SWRConfig>
	);
	return { calls, onWrite, user: userEvent.setup() };
}

beforeEach(() => jest.clearAllMocks());

describe('PluginDraftsSection', () => {
	it('shows nothing, and asks the server for nothing, while Developer mode is off', () => {
		const { calls } = setup([draft()], false);
		expect(screen.queryByText('Drafts')).not.toBeInTheDocument();
		expect(calls).toEqual([]);
	});

	it('lists each draft as a card with its status, id and one Open button', async () => {
		setup([
			draft(),
			draft({
				id: 'd2',
				name: 'Tally',
				pluginId: 'dev.tally-aaaaaaaa',
				checkSummary: { passed: 3, total: 5 },
			}),
		]);

		const counter = (
			await screen.findByRole('heading', { name: 'Counter' })
		).closest('article') as HTMLElement;
		expect(within(counter).getByText('Draft')).toBeInTheDocument();
		expect(within(counter).getByText('All 5 pass')).toBeInTheDocument();
		expect(
			within(counter).getByText('dev.counter-9b2c41a7')
		).toBeInTheDocument();
		expect(within(counter).getByText(/Edited just now/)).toBeInTheDocument();
		expect(within(counter).getByRole('link', { name: 'Open' })).toHaveAttribute(
			'href',
			'/dashboard/plugins/playground/d1'
		);

		const tally = screen
			.getByRole('heading', { name: 'Tally' })
			.closest('article') as HTMLElement;
		expect(within(tally).getByText('2 checks failing')).toBeInTheDocument();
	});

	it('ends the grid with a Write a plugin tile', async () => {
		const { onWrite, user } = setup([]);
		await user.click(
			await screen.findByRole('button', { name: /Write a plugin/ })
		);
		expect(onWrite).toHaveBeenCalled();
	});

	it('deletes a draft only after confirming', async () => {
		const { calls, user } = setup([draft()]);
		const card = (
			await screen.findByRole('heading', { name: 'Counter' })
		).closest('article') as HTMLElement;
		await user.click(
			within(card).getByRole('button', { name: 'Options for Counter' })
		);
		await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

		expect(calls.filter((call) => call.startsWith('DELETE'))).toEqual([]);
		await user.click(
			await screen.findByRole('button', { name: 'Delete draft' })
		);

		await waitFor(() =>
			expect(calls).toContain('DELETE /api/plugins/drafts/d1')
		);
		await waitFor(() =>
			expect(mockToast.success).toHaveBeenCalledWith('Draft deleted')
		);
	});
});
