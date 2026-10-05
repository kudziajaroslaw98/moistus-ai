import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestJson = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/manifest.json'),
	'utf8'
);
const manifest = pluginManifestSchema.parse(JSON.parse(manifestJson));
const mockActions = {
	setPopoverOpen: jest.fn(),
	setMapPluginEnabled: jest.fn().mockResolvedValue(true),
	addDevPlugin: jest.fn(),
	removeDevPlugin: jest.fn(),
	reloadDevPlugin: jest.fn(),
};
let mockState: Record<string, unknown> = {};

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockState),
}));
jest.mock('@/hooks/use-platform', () => ({ useIsMac: () => true }));
jest.mock('@/hooks/use-touch-first', () => ({ useTouchFirst: () => false }));

import { PluginsPanel } from './plugins-panel';

const metricNode = {
	id: 'm1',
	data: {
		node_type: 'extensionNode',
		metadata: {
			extension: {
				pluginId: 'shiko.metric',
				kind: 'metric',
				version: '0.1.0',
				data: {},
			},
		},
	},
};
const metricOn = {
	mapPlugins: [{ pluginId: 'shiko.metric', version: '0.1.0' }],
	loadedPlugins: {
		'shiko.metric': {
			key: 'shiko.metric',
			source: 'catalog',
			manifestUrl: '/plugins/shiko.metric/0.1.0/manifest.json',
			status: 'ready',
			manifest,
			error: null,
		},
	},
};

function setup(overrides: Record<string, unknown> = {}) {
	mockState = {
		popoverOpen: { plugins: true },
		mindMap: { id: 'map-1', user_id: 'owner-1' },
		currentUser: { id: 'owner-1', is_anonymous: false },
		permissions: { can_edit: true },
		mapPlugins: [],
		loadedPlugins: {},
		devPluginUrls: [],
		nodes: [],
		...mockActions,
		...overrides,
	};
	render(<PluginsPanel />);
	return userEvent.setup();
}

const asEditor = { currentUser: { id: 'editor-1', is_anonymous: false } };

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = jest.fn(async () => ({
		ok: true,
		json: async () => JSON.parse(manifestJson),
	})) as unknown as typeof fetch;
});

describe('PluginsPanel for the owner', () => {
	it('lists Shiko plugins with what they can access', async () => {
		setup();

		expect(await screen.findByText('by Shiko · v0.1.0')).toBeInTheDocument();
		expect(screen.getByText('Track a number against a target.')).toBeInTheDocument();
		expect(
			screen.getByText('Sees and changes only its own nodes. No internet access.')
		).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Open Plugins page/ })).toHaveAttribute(
			'href',
			'/dashboard/plugins'
		);
	});

	it('turns a plugin on', async () => {
		const user = setup();

		await user.click(await screen.findByLabelText('Metric'));

		expect(mockActions.setMapPluginEnabled).toHaveBeenCalledWith('shiko.metric', true);
	});

	it('says how to add nodes once a plugin is running', async () => {
		setup(metricOn);

		const hint = await screen.findByText(/Add one by typing/);
		expect(hint).toHaveTextContent(
			'Add one by typing $metric in the node editor, or press ⌘K and choose Add Metric.'
		);
	});

	it('asks before turning off a plugin the map uses', async () => {
		const user = setup({
			...metricOn,
			nodes: [metricNode, { ...metricNode, id: 'm2' }],
		});

		await user.click(await screen.findByLabelText('Metric'));
		expect(mockActions.setMapPluginEnabled).not.toHaveBeenCalled();
		expect(
			screen.getByText(
				'2 Metric nodes on this map will show their last saved view until you turn Metric back on.'
			)
		).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Turn off' }));

		expect(mockActions.setMapPluginEnabled).toHaveBeenCalledWith('shiko.metric', false);
	});

	it('links to the build guide and shows why a developer plugin could not load', async () => {
		mockActions.addDevPlugin.mockResolvedValue({
			ok: false,
			error: 'Use a manifest.json URL on http://localhost or 127.0.0.1.',
		});
		const user = setup();

		expect(screen.getByRole('link', { name: /How to build a plugin/ })).toHaveAttribute(
			'href',
			'/dashboard/plugins/build'
		);
		await user.type(screen.getByLabelText('Plugin manifest URL'), 'https://evil.test/m.json');
		await user.click(screen.getByRole('button', { name: 'Load' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Use a manifest.json URL');
	});

	it('closes', async () => {
		const user = setup();

		await user.click(screen.getByRole('button', { name: 'Close panel' }));

		expect(mockActions.setPopoverOpen).toHaveBeenCalledWith({ plugins: false });
	});
});

describe('PluginsPanel for collaborators', () => {
	it('shows the plugins that are on, read-only', async () => {
		setup({ ...asEditor, ...metricOn });

		expect(await screen.findByText('On')).toBeInTheDocument();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
		expect(screen.getByText('Only the map owner can turn plugins on or off.')).toBeInTheDocument();
		expect(screen.queryByLabelText('Plugin manifest URL')).not.toBeInTheDocument();
		// Editors can still add nodes.
		expect(screen.getByText(/Add one by typing/)).toBeInTheDocument();
	});

	it('hides the add hint from viewers', async () => {
		setup({ ...asEditor, ...metricOn, permissions: { can_edit: false } });

		expect(await screen.findByText('On')).toBeInTheDocument();
		expect(screen.queryByText(/Add one by typing/)).not.toBeInTheDocument();
	});

	it('says when the map has no plugins', () => {
		setup(asEditor);

		expect(screen.getByText('No plugins on this map.')).toBeInTheDocument();
	});
});
