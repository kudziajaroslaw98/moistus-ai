import { setPluginLibrary } from '@/lib/plugins/catalog';
import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import { issueManifest } from '@/lib/plugins/runtime/test-network-plugin';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mockActions = {
	setPopoverOpen: jest.fn(),
	setMapPluginEnabled: jest.fn().mockResolvedValue(true),
	setMapPluginVersion: jest.fn().mockResolvedValue(true),
};
let mockState: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) => selector(mockState),
}));
jest.mock('@/hooks/use-platform', () => ({ useIsMac: () => true }));
jest.mock('@/hooks/use-touch-first', () => ({ useTouchFirst: () => false }));

// The real sheet loads CodeMirror; its own tests cover it.
jest.mock('./plugin-code-sheet', () => ({
	PluginCodeSheet: (props: { open: boolean; pluginId: string; version?: string }) =>
		props.open ? <p>{`Code of ${props.pluginId} ${props.version}`}</p> : null,
}));

import { PluginsPanel } from './plugins-panel';

const manifest = pluginManifestSchema.parse(issueManifest);

function setup(overrides: Record<string, unknown> = {}) {
	mockState = {
		popoverOpen: { plugins: true },
		mapId: 'map-1',
		mindMap: { id: 'map-1', user_id: 'owner-1' },
		currentUser: { id: 'owner-1', is_anonymous: false },
		userProfile: { preferences: { developerMode: false } },
		permissions: { can_edit: true },
		mapPlugins: [],
		loadedPlugins: {},
		devPluginUrls: [],
		nodes: [],
		selectedNodes: [],
		...mockActions,
		...overrides,
	};
	render(<PluginsPanel />);
	return userEvent.setup();
}

beforeEach(() => {
	jest.clearAllMocks();
	// A published library plugin that reaches a site.
	setPluginLibrary({
		plugins: [
			{
				id: 'dev.issue',
				author: 'Test',
				versions: [
					{
						version: '0.1.0',
						sha256: '',
						permissions: ['node:own', 'network:api.github.com'],
						notes: 'Shows a GitHub issue.',
					},
				],
			},
		],
		disabled: [],
	});
	global.fetch = jest.fn(async (url: string) => ({
		ok: true,
		json: async () =>
			url.includes('dev.issue')
				? issueManifest
				: JSON.parse(readFileSync(join(process.cwd(), 'public', url), 'utf8')),
	})) as unknown as typeof fetch;
});

describe('PluginsPanel: plugins that reach a site', () => {
	it('says what the plugin sends, to whom, and when', async () => {
		setup();
		const card = within(await screen.findByTestId('plugin-card-dev.issue'));

		expect(await card.findByTestId('plugin-powers')).toHaveTextContent(
			'Sends issue addresses to api.github.com, run by GitHub (privacy policy), only when an editor adds or refreshes one. Viewing the map never contacts GitHub.'
		);
		expect(card.getByRole('link', { name: 'privacy policy' })).toHaveAttribute(
			'href',
			manifest.networkHosts!['api.github.com'].privacyPolicy
		);
	});

	it('asks the owner before turning it on', async () => {
		const user = setup();
		const card = within(await screen.findByTestId('plugin-card-dev.issue'));
		await card.findByTestId('plugin-powers');

		await user.click(card.getByLabelText('Issue'));

		const confirm = within(card.getByTestId('plugin-powers-confirm'));
		expect(confirm.getByText('Turn on Issue?')).toBeInTheDocument();
		expect(card.getByTestId('plugin-powers-confirm')).toHaveTextContent(
			'It sends the issue addresses typed into its nodes to api.github.com, run by GitHub (privacy policy). The plugin’s author doesn’t receive them. It can’t read the rest of the map.'
		);
		expect(mockActions.setMapPluginEnabled).not.toHaveBeenCalled();

		await user.click(confirm.getByRole('button', { name: 'Turn on' }));
		expect(mockActions.setMapPluginEnabled).toHaveBeenCalledWith('dev.issue', true);
	});

	it('lets the owner read the plugin’s code before turning it on', async () => {
		const user = setup();
		const card = within(await screen.findByTestId('plugin-card-dev.issue'));
		await card.findByTestId('plugin-powers');

		await user.click(card.getByLabelText('Issue'));
		await user.click(card.getByRole('button', { name: 'View code' }));

		expect(card.getByText('Code of dev.issue 0.1.0')).toBeInTheDocument();
		// Reading it doesn't answer the question.
		expect(card.getByTestId('plugin-powers-confirm')).toBeInTheDocument();
		expect(mockActions.setMapPluginEnabled).not.toHaveBeenCalled();
	});

	it('opens the code from the card’s ⋯ menu', async () => {
		const user = setup();
		const card = within(await screen.findByTestId('plugin-card-dev.issue'));
		await card.findByTestId('plugin-powers');

		await user.click(card.getByRole('button', { name: 'More for Issue' }));
		await user.click(await screen.findByRole('menuitem', { name: 'View code' }));

		expect(card.getByText('Code of dev.issue 0.1.0')).toBeInTheDocument();
	});

	it('leaves it off when the owner cancels', async () => {
		const user = setup();
		const card = within(await screen.findByTestId('plugin-card-dev.issue'));
		await card.findByTestId('plugin-powers');

		await user.click(card.getByLabelText('Issue'));
		await user.click(card.getByRole('button', { name: 'Cancel' }));

		expect(mockActions.setMapPluginEnabled).not.toHaveBeenCalled();
		expect(card.getByLabelText('Issue')).not.toBeChecked();
		expect(card.queryByTestId('plugin-powers-confirm')).not.toBeInTheDocument();
	});
});

describe('PluginsPanel: plugins Shiko turned off', () => {
	it('says why and won’t turn it on', async () => {
		setPluginLibrary({
			plugins: [
				{
					id: 'dev.issue',
					author: 'Test',
					versions: [
						{ version: '0.1.0', sha256: '', permissions: ['node:own', 'network:api.github.com'], notes: 'x' },
					],
				},
			],
			disabled: [{ pluginId: 'dev.issue', version: null, reason: 'Reported for ads' }],
		});
		setup();
		const card = within(await screen.findByTestId('plugin-card-dev.issue'));
		await card.findByTestId('plugin-powers');

		expect(card.getByRole('status')).toHaveTextContent('Turned off by Shiko: Reported for ads');
		expect(card.getByLabelText('Issue')).toBeDisabled();
	});
});
