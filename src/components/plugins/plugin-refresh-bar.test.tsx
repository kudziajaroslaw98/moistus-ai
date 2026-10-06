import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import { issueManifest } from '@/lib/plugins/runtime/test-network-plugin';
import type { ActivePluginKind } from '@/types/plugins';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refreshPluginNode = jest.fn().mockResolvedValue(true);
let mockState: Record<string, unknown> = {};
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) => selector(mockState),
}));

import { PluginRefreshBar } from './plugin-refresh-bar';

const manifest = pluginManifestSchema.parse(issueManifest);
const active: ActivePluginKind = {
	manifest,
	kind: manifest.nodeKinds[0],
	source: 'dev',
	generation: 1,
	canRefresh: true,
};

function setup(props: { canEdit?: boolean; fetchedAt?: string } = {}) {
	mockState = {
		pluginRefreshes: {},
		refreshPluginNode,
		currentUser: { id: 'editor-1' },
	};
	render(
		<PluginRefreshBar
			active={active}
			canEdit={props.canEdit ?? true}
			fetchedAt={props.fetchedAt}
			nodeId='node-1'
			pluginId='dev.issue'
		/>
	);
	return userEvent.setup();
}

beforeEach(() => {
	jest.clearAllMocks();
	window.localStorage.clear();
});

describe('PluginRefreshBar', () => {
	it('says where the data goes before the first refresh, then refreshes', async () => {
		const user = setup();

		await user.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(refreshPluginNode).not.toHaveBeenCalled();
		expect(screen.getByRole('dialog', { name: 'Before you refresh' })).toHaveTextContent(
			'Refresh sends the issue addresses in this node to api.github.com, run by GitHub (privacy policy). Everyone else sees the result.'
		);

		const buttons = screen.getAllByRole('button', { name: 'Refresh' });
		await user.click(buttons[0]);
		expect(refreshPluginNode).toHaveBeenCalledWith('node-1');
	});

	it('refreshes straight away once the person has seen the note', async () => {
		window.localStorage.setItem('shiko_plugin_refresh_note_v1:editor-1:dev.issue', '1');
		const user = setup();

		await user.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(refreshPluginNode).toHaveBeenCalledWith('node-1');
	});

	it('shows viewers when it was updated, with no way to fetch', () => {
		setup({ canEdit: false, fetchedAt: new Date(Date.now() - 2 * 3600_000).toISOString() });

		expect(screen.getByRole('status')).toHaveTextContent('Updated 2 hours ago');
		expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
	});
});
