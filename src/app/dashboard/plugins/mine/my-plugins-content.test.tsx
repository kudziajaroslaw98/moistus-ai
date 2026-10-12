jest.mock('@/components/plugins/plugin-submit-sheet', () => ({
	PluginSubmitSheet: () => <p>Submit sheet</p>,
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => '/dashboard/plugins/mine',
}));

let mockQuery = '';
const mockSetQuery = jest.fn();
jest.mock('@/components/dashboard/dashboard-shell-context', () => ({
	useDashboardSearch: () => ({ query: mockQuery, setQuery: mockSetQuery }),
}));

let mockStore: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStore),
}));

const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();
jest.mock('sonner', () => ({
	toast: {
		success: (message: string) => mockToastSuccess(message),
		info: (message: string) => mockToastInfo(message),
		error: jest.fn(),
	},
}));

import { PluginsPageFrame } from '@/components/plugins/plugins-page-tabs';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { MyPluginsContent } from './my-plugins-content';

const readingList = {
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

const pomodoro = {
	...readingList,
	id: 'com.example.pomodoro',
	name: 'Pomodoro',
	description: 'Focus sessions.',
	permissions: ['node:own'],
	mapCount: 3,
	openReports: 0,
	versions: [
		{
			...readingList.versions[1],
			version: '1.2.0',
			submittedAt: '2026-08-01T10:00:00Z',
			publishedAt: '2026-08-02T10:00:00Z',
		},
	],
};

const counterDraft = {
	id: 'd1',
	pluginId: 'dev.counter-9b2c41a7',
	name: 'Counter',
	icon: 'puzzle',
	description: 'Count anything.',
	checkSummary: { passed: 5, total: 5 },
	baseVersion: null,
	updatedAt: new Date().toISOString(),
};

// A draft started from Reading list 0.1.0 shares its id.
const readingDraft = {
	...counterDraft,
	id: 'd2',
	pluginId: readingList.id,
	name: 'Reading list',
	baseVersion: '0.1.0',
	checkSummary: { passed: 3, total: 4 },
};

function setup({
	developerMode = false,
	plugins = [readingList, pomodoro],
	drafts = [counterDraft, readingDraft],
	startedDraft,
}: {
	developerMode?: boolean;
	plugins?: unknown[];
	drafts?: unknown[];
	/** What "Edit as new draft" gets back; by default a fresh draft based on the version asked for. */
	startedDraft?: Record<string, unknown>;
} = {}) {
	mockStore = {
		userProfile: { is_anonymous: false, preferences: { developerMode } },
		updatePreferences: jest.fn(),
	};
	global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
		if (url === '/api/plugins/drafts' && init?.method === 'POST') {
			const { from } = JSON.parse(String(init.body)) as { from: { version: string } };
			return {
				ok: true,
				status: 201,
				json: async () => ({
					data: startedDraft ?? { id: 'd9', baseVersion: from.version },
				}),
			};
		}
		if (init?.method === 'DELETE') {
			return { ok: true, status: 200, json: async () => ({ data: null }) };
		}
		return {
			ok: true,
			status: 200,
			json: async () => ({
				data: url === '/api/plugins/drafts' ? drafts : { plugins },
			}),
		};
	}) as unknown as typeof fetch;
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<PluginsPageFrame>
				<MyPluginsContent />
			</PluginsPageFrame>
		</SWRConfig>
	);
	return userEvent.setup();
}

const rowOf = async (name: string) =>
	(await screen.findByRole('button', { name })).closest('article') as HTMLElement;

beforeEach(() => {
	jest.clearAllMocks();
	mockQuery = '';
});

describe('MyPluginsContent', () => {
	it('lists each plugin as one row with its status, Shiko’s message and one Open button', async () => {
		setup();

		const row = await rowOf('Reading list');
		expect(within(row).getByText('Published 0.1.0')).toBeInTheDocument();
		expect(within(row).getByText('Changes requested')).toBeInTheDocument();
		expect(within(row).getByText('1 open report')).toBeInTheDocument();
		expect(
			within(row).getByText('Shiko: “Please explain what is sent.”')
		).toBeInTheDocument();
		expect(within(row).getByText('On in 14 maps · 1 report')).toBeInTheDocument();
		expect(within(row).getByRole('button', { name: 'Open' })).toBeInTheDocument();
	});

	it('puts Write a plugin and the grid and list switch on the page', async () => {
		const user = setup();
		await rowOf('Pomodoro');

		const links = screen.getAllByRole('link', { name: 'Write a plugin' });
		// The tab and the page's main button.
		expect(links).toHaveLength(2);
		for (const link of links) {
			expect(link).toHaveAttribute('href', '/dashboard/plugins/build');
		}
		expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.queryByText('com.example.pomodoro')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Grid view' }));
		expect(screen.getByText('com.example.pomodoro')).toBeInTheDocument();
	});

	it('lists plugins that need attention first', async () => {
		setup();
		await rowOf('Pomodoro');

		const names = screen
			.getAllByRole('heading', { level: 3 })
			.map((heading) => heading.textContent);
		expect(names).toEqual(['Reading list', 'Pomodoro']);
	});

	describe('with Developer mode on', () => {
		it('puts a published plugin and its new draft on one row, and a never-submitted draft on its own', async () => {
			setup({ developerMode: true });

			const row = await rowOf('Reading list');
			expect(within(row).getByText('Published 0.1.0')).toBeInTheDocument();
			expect(within(row).getByText('Draft')).toBeInTheDocument();
			expect(within(row).getByText('1 check failing')).toBeInTheDocument();
			expect(screen.getAllByRole('button', { name: 'Reading list' })).toHaveLength(1);

			const counter = await rowOf('Counter');
			expect(within(counter).getByText('Never submitted')).toBeInTheDocument();
			expect(within(counter).getByText('All 5 pass')).toBeInTheDocument();
		});

		it('filters by stage and counts each filter', async () => {
			const user = setup({ developerMode: true });
			await rowOf('Counter');

			const filters = screen.getByRole('group', { name: 'Filter your plugins' });
			expect(within(filters).getByRole('button', { name: /^All 3$/ })).toBeInTheDocument();
			expect(within(filters).getByRole('button', { name: /^Drafts 2$/ })).toBeInTheDocument();
			expect(within(filters).getByRole('button', { name: /^Published 2$/ })).toBeInTheDocument();
			expect(within(filters).queryByRole('button', { name: /In review/ })).not.toBeInTheDocument();

			await user.click(within(filters).getByRole('button', { name: /^Drafts/ }));
			expect(screen.queryByRole('button', { name: 'Pomodoro' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Counter' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Reading list' })).toBeInTheDocument();

			await user.click(within(filters).getByRole('button', { name: /^Needs attention/ }));
			expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Reading list' })).toBeInTheDocument();
		});

		it('narrows the list to the header search, and offers a way back', async () => {
			mockQuery = 'pomodoro';
			const user = setup({ developerMode: true });

			expect(await rowOf('Pomodoro')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument();

			mockQuery = 'nothing like it';
			await user.click(screen.getByRole('button', { name: /^Drafts/ }));
			await user.click(await screen.findByRole('button', { name: 'Show all plugins' }));
			expect(mockSetQuery).toHaveBeenCalledWith('');
		});

		it('shows a plugin’s drafts above its versions in the sheet, and deletes one after asking', async () => {
			const user = setup({ developerMode: true });
			await user.click(within(await rowOf('Reading list')).getByRole('button', { name: 'Open' }));

			const sheet = await screen.findByRole('dialog');
			const drafts = within(sheet).getByRole('heading', { name: 'Drafts' });
			const versions = within(sheet).getByRole('heading', { name: 'Versions' });
			expect(
				drafts.compareDocumentPosition(versions) & Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
			expect(within(sheet).getByText('Draft from 0.1.0')).toBeInTheDocument();
			expect(within(sheet).getByRole('link', { name: 'Open' })).toHaveAttribute(
				'href',
				'/dashboard/plugins/playground/d2'
			);

			await user.click(within(sheet).getByRole('button', { name: 'Delete draft' }));
			await user.click(await screen.findByRole('button', { name: 'Delete draft' }));

			await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Draft deleted'));
			expect(
				(global.fetch as jest.Mock).mock.calls.some(
					([url, init]) => url === '/api/plugins/drafts/d2' && init?.method === 'DELETE'
				)
			).toBe(true);
		});

		it('shows only drafts for a plugin that was never submitted', async () => {
			const user = setup({ developerMode: true });
			await user.click(within(await rowOf('Counter')).getByRole('button', { name: 'Open' }));

			const sheet = await screen.findByRole('dialog');
			expect(within(sheet).getByText(/Not submitted yet/)).toBeInTheDocument();
			expect(within(sheet).getByRole('heading', { name: 'Drafts' })).toBeInTheDocument();
			expect(within(sheet).queryByRole('heading', { name: 'Versions' })).not.toBeInTheDocument();
			expect(
				within(sheet).queryByRole('button', { name: 'Submit a version' })
			).not.toBeInTheDocument();
		});
	});

	describe('with Developer mode off', () => {
		it('asks for no drafts, and says they are hidden', async () => {
			setup();
			await rowOf('Reading list');

			expect(
				(global.fetch as jest.Mock).mock.calls.some(([url]) => url === '/api/plugins/drafts')
			).toBe(false);
			expect(screen.getByText(/Drafts are hidden while Developer mode is off/)).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'Turn it on' })).toHaveAttribute(
				'href',
				'/dashboard/plugins/build'
			);
			expect(screen.queryByRole('button', { name: /Counter/ })).not.toBeInTheDocument();
		});
	});

	describe('when there is nothing yet', () => {
		it('sends people to the Write a plugin tab instead of the localhost steps', async () => {
			setup({ plugins: [], drafts: [] });

			expect(await screen.findByText(/You haven't written a plugin yet/)).toBeInTheDocument();
			// The tab, the page's main button and the empty state's.
			expect(screen.getAllByRole('link', { name: 'Write a plugin' })).toHaveLength(3);
			expect(screen.queryByRole('group', { name: 'Filter your plugins' })).not.toBeInTheDocument();
		});

		it('still says drafts are hidden while Developer mode is off, so work in drafts doesn\u2019t look gone', async () => {
			setup({ plugins: [], drafts: [counterDraft] });

			expect(await screen.findByText(/You haven't written a plugin yet/)).toBeInTheDocument();
			expect(screen.getByText(/Drafts are hidden while Developer mode is off/)).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'Turn it on' })).toHaveAttribute(
				'href',
				'/dashboard/plugins/build'
			);
		});

		it('says nothing about hidden drafts when Developer mode is on', async () => {
			setup({ developerMode: true, plugins: [], drafts: [] });

			expect(await screen.findByText(/You haven't written a plugin yet/)).toBeInTheDocument();
			expect(screen.queryByText(/Drafts are hidden/)).not.toBeInTheDocument();
		});
	});

	it('opens every version with its review messages in a side sheet', async () => {
		const user = setup();
		await user.click(within(await rowOf('Reading list')).getByRole('button', { name: 'Open' }));

		const sheet = await screen.findByRole('dialog');
		expect(within(sheet).getByText('Live version')).toBeInTheDocument();
		expect(within(sheet).getAllByText('0.1.0')).toHaveLength(2);
		expect(within(sheet).getByText('0.2.0')).toBeInTheDocument();
		expect(within(sheet).getByText(/Please explain what is sent/)).toBeInTheDocument();
		expect(within(sheet).queryByRole('heading', { name: 'Drafts' })).not.toBeInTheDocument();
	});

	describe('Edit as new draft', () => {
		async function openSheet(user: ReturnType<typeof setup>) {
			await user.click(within(await rowOf('Reading list')).getByRole('button', { name: 'Open' }));
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

			const published = within(sheet)
				.getAllByRole('listitem')
				.find((row) => within(row).queryByText('Published'));
			await user.click(
				within(published as HTMLElement).getByRole('button', { name: 'Edit as new draft' })
			);

			await waitFor(() =>
				expect(mockPush).toHaveBeenCalledWith('/dashboard/plugins/playground/d9')
			);
			const post = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
			expect(JSON.parse(post[1].body)).toEqual({
				from: { pluginId: 'com.example.reading-list', version: '0.1.0' },
			});
			expect(mockToastInfo).not.toHaveBeenCalled();
		});

		async function editPublished(user: ReturnType<typeof setup>) {
			const sheet = await openSheet(user);
			const published = within(sheet)
				.getAllByRole('listitem')
				.find((row) => within(row).queryByText('Published'));
			await user.click(
				within(published as HTMLElement).getByRole('button', { name: 'Edit as new draft' })
			);
		}

		it('says so when it opens a draft you already had, based on another version', async () => {
			const user = setup({
				developerMode: true,
				startedDraft: { id: 'd5', baseVersion: '0.3.0' },
			});
			await editPublished(user);

			await waitFor(() =>
				expect(mockPush).toHaveBeenCalledWith('/dashboard/plugins/playground/d5')
			);
			expect(mockToastInfo).toHaveBeenCalledWith(
				'You already have a draft of this plugin, based on 0.3.0. Opened that one.'
			);
		});

		it('says so without a version when the draft you had wasn’t based on one', async () => {
			const user = setup({
				developerMode: true,
				startedDraft: { id: 'd5', baseVersion: null },
			});
			await editPublished(user);

			await waitFor(() =>
				expect(mockPush).toHaveBeenCalledWith('/dashboard/plugins/playground/d5')
			);
			expect(mockToastInfo).toHaveBeenCalledWith(
				'You already have a draft of this plugin. Opened it.'
			);
		});
	});
});
