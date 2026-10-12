/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import { runPluginChecks } from '@/lib/plugins/plugin-checks';
import {
	PluginHost,
	type PluginWorkerLike,
} from '@/lib/plugins/runtime/plugin-host';
import { nodeTestVariant } from '@/lib/plugins/runtime/test-quickjs-variant';
import {
	createPluginWorkerHandler,
	type PluginWorkerRequest,
	type PluginWorkerResponse,
} from '@/lib/plugins/runtime/worker-protocol';
import {
	STARTER_MANIFEST,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	memoizePromiseFactory,
	newQuickJSWASMModuleFromVariant,
} from 'quickjs-emscripten-core';
import { TextDecoder, TextEncoder } from 'node:util';

// QuickJS (WASM) needs these; the jsdom environment doesn't provide them.
Object.assign(globalThis, { TextEncoder, TextDecoder });

const getModule = memoizePromiseFactory(() =>
	newQuickJSWASMModuleFromVariant(nodeTestVariant())
);

/** Runs the real worker handler in-process, standing in for a Web Worker. */
function inProcessWorker(): PluginWorkerLike {
	const handle = createPluginWorkerHandler(getModule);
	const worker = {
		onmessage: null as PluginWorkerLike['onmessage'],
		onerror: null as PluginWorkerLike['onerror'],
		terminate: jest.fn(),
		postMessage(message: PluginWorkerRequest) {
			void handle(message).then((response) =>
				worker.onmessage?.({
					data: response,
				} as MessageEvent<PluginWorkerResponse>)
			);
		},
	};
	return worker;
}

const host = new PluginHost(inProcessWorker);
jest.mock('@/lib/plugins/runtime/load-plugin-host', () => ({
	loadPluginHost: async () => host,
}));

import { PluginLivePreview } from './plugin-live-preview';

const manifest = pluginManifestSchema.parse(STARTER_MANIFEST);

async function setup() {
	const result = runPluginChecks(await getModule(), {
		manifest: STARTER_MANIFEST,
		code: STARTER_PLUGIN_JS,
	});
	const [preview] = result.previews;
	const view = render(
		<PluginLivePreview
			code={STARTER_PLUGIN_JS}
			manifest={manifest}
			preview={preview}
		/>
	);
	return { user: userEvent.setup(), preview, ...view };
}

/** The two buttons the starter draws: decrement first, then increment. */
const buttons = () => screen.getAllByRole('button', { name: /^1$|^−|^\+/ });

describe('PluginLivePreview', () => {
	it('starts on the example the checks drew', async () => {
		await setup();

		expect(screen.getByText('Coffees today')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.queryByText('Reset')).not.toBeInTheDocument();
	});

	it('runs the plugin’s buttons and redraws, then resets', async () => {
		const { user } = await setup();

		const [decrement, increment] = screen
			.getAllByRole('button')
			.filter((button) => button.textContent === '1');
		expect(decrement).toBeEnabled();

		await user.click(increment);
		await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

		await user.click(increment);
		await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());

		await user.click(decrement);
		await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

		await user.click(screen.getByRole('button', { name: /reset/i }));
		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.queryByText('Reset')).not.toBeInTheDocument();
	});

	it('shows what went wrong instead of changing the view', async () => {
		const { user } = await setup();
		jest
			.spyOn(host, 'action')
			.mockRejectedValueOnce(new Error('The plugin took too long and was stopped'));

		const [, increment] = screen
			.getAllByRole('button')
			.filter((button) => button.textContent === '1');
		await user.click(increment);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'The plugin took too long and was stopped'
		);
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('only loads the code on the first click and frees it when closed', async () => {
		const load = jest.spyOn(host, 'load');
		const unload = jest.spyOn(host, 'unload');
		const { user, unmount } = await setup();

		expect(load).not.toHaveBeenCalled();
		unmount();
		expect(unload).not.toHaveBeenCalled();

		const second = await setup();
		const [, increment] = screen
			.getAllByRole('button')
			.filter((button) => button.textContent === '1');
		await second.user.click(increment);
		await waitFor(() => expect(load).toHaveBeenCalled());
		// The host re-checks its load on every call; they all use one key of the preview's own.
		const keys = new Set(load.mock.calls.map(([pluginId]) => pluginId));
		expect(keys.size).toBe(1);
		const [key] = [...keys];
		expect(key).toMatch(/^review-preview:dev\.yourname\.counter:/);

		await act(async () => second.unmount());
		await waitFor(() => expect(unload).toHaveBeenCalledWith(key));
	});
});
