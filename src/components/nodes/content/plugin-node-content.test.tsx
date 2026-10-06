import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import type { NodeExtensionData } from '@/types/extensions';
import type { LoadedPlugin } from '@/types/plugins';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import metricManifest from '../../../../public/plugins/shiko.metric/0.1.0/manifest.json';

const manifest = pluginManifestSchema.parse(metricManifest);
const mockHost = { render: jest.fn(), action: jest.fn() };
const mockState = {
	loadedPlugins: {} as Record<string, LoadedPlugin>,
	mapPlugins: [] as Array<{ pluginId: string; version: string }>,
	mapPluginsLoaded: true,
	refreshMapPluginsSoon: jest.fn(),
};

jest.mock('@/lib/plugins/runtime/load-plugin-host', () => ({
	loadPluginHost: async () => mockHost,
}));
jest.mock('@/lib/extensions/graph-ops', () => ({ applyGraphOps: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: Object.assign(
		(selector: (state: typeof mockState) => unknown) => selector(mockState),
		{ getState: () => mockState }
	),
}));

import { applyGraphOps } from '@/lib/extensions/graph-ops';
import { PluginNodeContent } from './plugin-node-content';

const extension: NodeExtensionData = {
	pluginId: 'shiko.metric',
	kind: 'metric',
	kindLabel: 'Metric',
	version: '0.1.0',
	data: { label: 'Signups', value: 5, target: 10, step: 1 },
	snapshot: { type: 'text', value: 'Saved: 5 of 10' },
};

const readyMetric = (): Record<string, LoadedPlugin> => ({
	'shiko.metric': {
		key: 'shiko.metric',
		source: 'catalog',
		manifestUrl: '/plugins/shiko.metric/0.1.0/manifest.json',
		status: 'ready',
		manifest,
		error: null,
		generation: 1,
	},
});

const liveTree = {
	type: 'stack' as const,
	children: [
		{ type: 'text' as const, value: 'Live: 5 of 10' },
		{
			type: 'button' as const,
			label: '1',
			icon: 'plus' as const,
			action: 'increment',
		},
	],
};

beforeEach(() => {
	jest.clearAllMocks();
	mockState.loadedPlugins = {};
	mockState.mapPlugins = [];
	mockState.mapPluginsLoaded = true;
});

describe('PluginNodeContent', () => {
	it('shows the saved view and says the plugin is off', () => {
		render(<PluginNodeContent canEdit extension={extension} nodeId='n1' />);

		expect(screen.getByText('Saved: 5 of 10')).toBeInTheDocument();
		expect(screen.getByTestId('plugin-node-status')).toHaveTextContent(
			'Metric is off on this map'
		);
		expect(mockState.refreshMapPluginsSoon).toHaveBeenCalled();
	});

	it('re-reads the map’s plugins when a node was saved by a newer version', async () => {
		mockState.loadedPlugins = readyMetric();
		mockState.mapPlugins = [{ pluginId: 'shiko.metric', version: '0.1.0' }];
		// Own data, so the render cache shared across tests can't answer for it.
		const own = { ...extension, data: { ...extension.data, label: 'Versions' } };
		mockHost.render.mockResolvedValueOnce({ tree: liveTree, summary: 'Versions' });

		const { rerender } = render(
			<PluginNodeContent canEdit extension={own} nodeId='n1' />
		);
		expect(await screen.findByText('Live: 5 of 10')).toBeInTheDocument();
		expect(mockState.refreshMapPluginsSoon).not.toHaveBeenCalled();

		rerender(
			<PluginNodeContent canEdit extension={{ ...own, version: '0.2.0' }} nodeId='n1' />
		);

		expect(mockState.refreshMapPluginsSoon).toHaveBeenCalledTimes(1);
	});

	it('never draws a saved view with unknown primitives', () => {
		render(
			<PluginNodeContent
				canEdit
				fallbackText='Signups: 5 / 10'
				nodeId='n1'
				extension={{
					...extension,
					snapshot: { type: 'image', src: 'https://evil.test' },
				}}
			/>
		);

		expect(screen.getByText('Signups: 5 / 10')).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});

	it('renders live and saves an action as one plugin-attributed update', async () => {
		mockState.loadedPlugins = readyMetric();
		mockState.mapPlugins = [{ pluginId: 'shiko.metric', version: '0.1.0' }];
		const nextData = { ...extension.data, value: 6 };
		const nextTree = { type: 'text' as const, value: 'Live: 6 of 10' };
		mockHost.render
			.mockResolvedValueOnce({ tree: liveTree, summary: 'Signups: 5 / 10' })
			.mockResolvedValueOnce({ tree: nextTree, summary: 'Signups: 6 / 10' });
		mockHost.action.mockResolvedValue(nextData);
		jest.mocked(applyGraphOps).mockResolvedValue({ ok: true, applied: 1 });
		const user = userEvent.setup();

		render(<PluginNodeContent canEdit extension={extension} nodeId='n1' />);
		expect(await screen.findByText('Live: 5 of 10')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '1' }));

		expect(mockHost.action).toHaveBeenCalledWith(
			'shiko.metric',
			expect.objectContaining({ kind: 'metric' }),
			'increment',
			extension.data,
			undefined,
			{ canEdit: true, today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }
		);
		expect(applyGraphOps).toHaveBeenCalledWith(
			expect.any(Function),
			[
				{
					type: 'updateNode',
					nodeId: 'n1',
					data: {
						content: 'Signups: 6 / 10',
						metadata: {
							extension: expect.objectContaining({
								pluginId: 'shiko.metric',
								data: nextData,
								snapshot: nextTree,
							}),
						},
					},
				},
			],
			{ kind: 'plugin', id: 'shiko.metric', label: 'Metric' },
			{ label: 'updateNode' }
		);
	});

	it('keeps buttons off for people who can only view', async () => {
		mockState.loadedPlugins = readyMetric();
		mockHost.render.mockResolvedValue({ tree: liveTree, summary: 'x' });

		render(
			<PluginNodeContent
				canEdit={false}
				extension={{ ...extension, data: { ...extension.data, value: 4 } }}
				nodeId='n1'
			/>
		);

		expect(await screen.findByText('Live: 5 of 10')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
	});

	it('falls back to the saved view with Retry when rendering fails', async () => {
		mockState.loadedPlugins = readyMetric();
		mockHost.render
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({ tree: liveTree, summary: 'x' });
		const user = userEvent.setup();

		render(
			<PluginNodeContent
				canEdit
				extension={{ ...extension, data: { ...extension.data, value: 3 } }}
				nodeId='n1'
			/>
		);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			"Metric couldn't update. Showing the last saved view."
		);
		expect(screen.getByText('Saved: 5 of 10')).toBeInTheDocument();
		await act(() => user.click(screen.getByRole('button', { name: 'Retry' })));

		expect(await screen.findByText('Live: 5 of 10')).toBeInTheDocument();
	});
});
