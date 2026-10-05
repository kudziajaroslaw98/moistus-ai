import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockState: Record<string, unknown> = {};

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockState),
}));

import { PluginsSettingsLink } from './plugins-settings-link';

function setup(overrides: Record<string, unknown> = {}) {
	const onManage = jest.fn();
	mockState = {
		mindMap: { id: 'map-1', user_id: 'owner-1' },
		currentUser: { id: 'owner-1', is_anonymous: false },
		mapPlugins: [],
		loadedPlugins: {},
		...overrides,
	};
	render(<PluginsSettingsLink motionProps={{}} onManage={onManage} />);
	return { onManage, user: userEvent.setup() };
}

describe('PluginsSettingsLink', () => {
	it('says which plugins are on and opens the Plugins panel', async () => {
		const { onManage, user } = setup({
			mapPlugins: [{ pluginId: 'shiko.metric', version: '0.1.0' }],
			loadedPlugins: { 'shiko.metric': { manifest: { name: 'Metric' } } },
		});

		expect(screen.getByText('Metric is on')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Manage plugins' }));

		expect(onManage).toHaveBeenCalledTimes(1);
	});

	it('says when none are on', () => {
		setup();

		expect(screen.getByText('No plugins on yet')).toBeInTheDocument();
	});

	it('is hidden from everyone but the owner', () => {
		setup({ currentUser: { id: 'editor-1', is_anonymous: false } });

		expect(screen.queryByTestId('plugins-settings-link')).not.toBeInTheDocument();
	});
});
