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
