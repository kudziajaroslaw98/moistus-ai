jest.mock('@/components/plugins/plugin-submit-sheet', () => ({
	PluginSubmitSheet: () => <p>Submit sheet</p>,
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearch = '';
jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
	useSearchParams: () => new URLSearchParams(mockSearch),
}));

let mockStore: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStore),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { MyPluginsContent } from './my-plugins-content';

const plugin = {
	id: 'com.example.reading-list',
	name: 'Reading list',
	icon: 'book',
	description: 'Track what you read.',
	permissions: ['node:own', 'network:openlibrary.org'],
	mapCount: 14,
	openReports: 1,
	disabledReason: null,
	versions: [
		{
			version: '0.2.0',
			status: 'changes_requested',
			notes: 'Adds author lookup.',
			submittedAt: '2026-10-01T10:00:00Z',
			reviewedAt: '2026-10-02T10:00:00Z',
			reviewMessage: 'Please explain what is sent.',
			publishedAt: null,
			disabledReason: null,
		},
		{
			version: '0.1.0',
			status: 'published',
			notes: 'First version.',
			submittedAt: '2026-09-01T10:00:00Z',
			reviewedAt: '2026-09-02T10:00:00Z',
			reviewMessage: null,
			publishedAt: '2026-09-02T10:00:00Z',
			disabledReason: null,
		},
	],
};

const draft = {
	id: 'd1',
	pluginId: 'dev.counter-9b2c41a7',
	name: 'Counter',
	icon: 'puzzle',
	description: 'Count anything.',
	checkSummary: { passed: 5, total: 5 },
	baseVersion: null,
	updatedAt: new Date().toISOString(),
};

function setup({ developerMode = false, search = '' } = {}) {
	mockSearch = search;
	mockStore = {
		userProfile: { is_anonymous: false, preferences: { developerMode } },
		updatePreferences: jest.fn(),
	};
	global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
		if (url === '/api/plugins/drafts' && init?.method === 'POST') {
			return { ok: true, status: 201, json: async () => ({ data: { id: 'd9' } }) };
		}
		return {
			ok: true,
			status: 200,
			json: async () => ({
				data: url === '/api/plugins/drafts' ? [draft] : { plugins: [plugin] },
			}),
		};
	}) as unknown as typeof fetch;
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MyPluginsContent />
		</SWRConfig>
	);
	return userEvent.setup();
}

beforeEach(() => jest.clearAllMocks());

describe('MyPluginsContent', () => {
	it('shows each plugin as a card with its status, Shiko’s message and one Versions button', async () => {
		setup();

		const card = (await screen.findByText('Reading list')).closest(
			'article'
		) as HTMLElement;
		expect(within(card).getByText('Published 0.1.0')).toBeInTheDocument();
		expect(within(card).getByText('Changes requested')).toBeInTheDocument();
		expect(
			within(card).getByText('Shiko: “Please explain what is sent.”')
		).toBeInTheDocument();
		expect(
			within(card).getByText('On in 14 maps · 1 report')
		).toBeInTheDocument();
		expect(
			within(card).getByRole('button', { name: 'Versions' })
		).toBeInTheDocument();
	});

	it('opens every version with its review messages in a side sheet', async () => {
		const user = setup();

		const card = (await screen.findByText('Reading list')).closest(
			'article'
		) as HTMLElement;
		await user.click(within(card).getByRole('button', { name: 'Versions' }));

		const sheet = await screen.findByRole('dialog');
		expect(within(sheet).getByText('Live version')).toBeInTheDocument();
		expect(within(sheet).getAllByText('0.1.0')).toHaveLength(2);
		expect(within(sheet).getByText('0.2.0')).toBeInTheDocument();
		expect(
			within(sheet).getByText(/Please explain what is sent/)
		).toBeInTheDocument();
	});

	it('ends the grid with a Submit a new plugin tile', async () => {
		setup();

		expect(
			await screen.findByRole('button', { name: /Submit a new plugin/ })
		).toBeInTheDocument();
	});

	it('shows drafts above the submitted plugins once Developer mode is on', async () => {
		setup({ developerMode: true });

		const drafts = await screen.findByRole('region', { name: 'Drafts' });
		expect(within(drafts).getByRole('heading', { name: 'Counter' })).toBeInTheDocument();
		expect(await screen.findByText('Reading list')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Submitted' })).toBeInTheDocument();
	});

	it('has no drafts section, and asks for none, while Developer mode is off', async () => {
		setup();
		await screen.findByText('Reading list');
		expect(screen.queryByRole('region', { name: 'Drafts' })).not.toBeInTheDocument();
		expect(
			(global.fetch as jest.Mock).mock.calls.some(([url]) => url === '/api/plugins/drafts')
		).toBe(false);
	});

	it('opens Write a plugin from ?write=1 and closes it back to the plain address', async () => {
		const user = setup({ search: 'write=1' });
		const dialog = await screen.findByRole('dialog', { name: 'Write a plugin' });
		expect(within(dialog).getByText(/Writing plugins needs Developer mode/)).toBeInTheDocument();

		await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
		expect(mockReplace).toHaveBeenCalledWith('/dashboard/plugins/mine');
	});

	describe('Edit as new draft', () => {
		async function openSheet(user: ReturnType<typeof setup>) {
			const card = (await screen.findByText('Reading list')).closest('article') as HTMLElement;
			await user.click(within(card).getByRole('button', { name: 'Versions' }));
			return screen.findByRole('dialog');
		}

		it('is held back with the Developer mode switch beside it while it is off', async () => {
			const sheet = await openSheet(setup());
			expect(within(sheet).getByText(/Turn on Developer mode to edit a version/)).toBeInTheDocument();
			for (const button of within(sheet).getAllByRole('button', { name: 'Edit as new draft' })) {
				expect(button).toBeDisabled();
			}
		});

		it('starts a draft from that version and opens it', async () => {
			const user = setup({ developerMode: true });
			const sheet = await openSheet(user);
			expect(within(sheet).queryByText(/Turn on Developer mode/)).not.toBeInTheDocument();

			const published = within(sheet).getAllByRole('listitem').find((row) => within(row).queryByText('Published'));
			await user.click(within(published as HTMLElement).getByRole('button', { name: 'Edit as new draft' }));

			await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/plugins/playground/d9'));
			const post = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
			expect(JSON.parse(post[1].body)).toEqual({
				from: { pluginId: 'com.example.reading-list', version: '0.1.0' },
			});
		});
	});
});
