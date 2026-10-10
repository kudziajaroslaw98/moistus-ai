import {
	PluginHost,
	type PluginWorkerLike,
} from '@/lib/plugins/runtime/plugin-host';

let host: PluginHost | null = null;

/**
 * The app's plugin host. The worker starts on first use, so maps without plugins never
 * load QuickJS. Kept apart from plugin-host.ts because `import.meta.url` doesn't compile
 * in Jest; tests construct PluginHost with their own worker.
 */
export function getPluginHost(): PluginHost {
	host ??= new PluginHost(
		() =>
			new Worker(new URL('./plugin-worker.ts', import.meta.url), {
				type: 'module',
				name: 'shiko-plugins',
			}) as unknown as PluginWorkerLike
	);
	return host;
}

/**
 * A plugin host of its own, for a page that runs plugins still being written (the
 * playground). A separate worker means a looping or same-id draft can't disturb the
 * plugins running on a map. The caller owns it: call `dispose()` when done.
 */
export function createPlaygroundPluginHost(): PluginHost {
	return new PluginHost(
		() =>
			new Worker(new URL('./plugin-worker.ts', import.meta.url), {
				type: 'module',
				name: 'shiko-plugin-playground',
			}) as unknown as PluginWorkerLike
	);
}
