import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestJson = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/manifest.json'),
	'utf8'
);
const mockActions = {
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

import { PluginsSettingsSection } from './plugins-settings-section';

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

function setup(overrides: Record<string, unknown> = {}) {
	mockState = {
		mindMap: { id: 'map-1', user_id: 'owner-1' },
		currentUser: { id: 'owner-1', is_anonymous: false },
		mapPlugins: [],
		loadedPlugins: {},
		devPluginUrls: [],
		nodes: [],
		...mockActions,
		...overrides,
	};
	render(<PluginsSettingsSection motionProps={{}} />);
	return userEvent.setup();
}

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = jest.fn(async () => ({
		ok: true,
		json: async () => JSON.parse(manifestJson),
	})) as unknown as typeof fetch;
});

describe('PluginsSettingsSection', () => {
	it('lists first-party plugins with what they can access', async () => {
		setup();

		expect(await screen.findByText('by Shiko · v0.1.0')).toBeInTheDocument();
		expect(
			screen.getByText('Track a number against a target.')
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'Sees and changes only its own nodes. No internet access.'
			)
		).toBeInTheDocument();
	});

	it('turns a plugin on', async () => {
		const user = setup();

		await user.click(await screen.findByLabelText('Metric'));

		expect(mockActions.setMapPluginEnabled).toHaveBeenCalledWith(
			'shiko.metric',
			true
		);
	});

	it('asks before turning off a plugin the map uses', async () => {
		const user = setup({
			mapPlugins: [{ pluginId: 'shiko.metric', version: '0.1.0' }],
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

		expect(mockActions.setMapPluginEnabled).toHaveBeenCalledWith(
			'shiko.metric',
			false
		);
	});

	it('shows why a developer plugin could not load', async () => {
		mockActions.addDevPlugin.mockResolvedValue({
			ok: false,
			error: 'Use a manifest.json URL on http://localhost or 127.0.0.1.',
		});
		const user = setup();

		await user.type(
			screen.getByLabelText('Plugin manifest URL'),
			'https://evil.test/m.json'
		);
		await user.click(screen.getByRole('button', { name: 'Load' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Use a manifest.json URL'
		);
	});

	it('is hidden from everyone but the owner', () => {
		setup({ currentUser: { id: 'editor-1', is_anonymous: false } });

		expect(
			screen.queryByTestId('plugins-settings-section')
		).not.toBeInTheDocument();
	});
});
