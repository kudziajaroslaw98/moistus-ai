import type { PluginHost } from '@/lib/plugins/runtime/plugin-host';

/** The plugin host, imported on first use so maps without plugins never load QuickJS. */
export async function loadPluginHost(): Promise<PluginHost> {
	return (
		await import('@/lib/plugins/runtime/plugin-host-instance')
	).getPluginHost();
}

/** A new host with its own worker for the playground (imported on first use). Dispose it when done. */
export async function loadPlaygroundPluginHost(): Promise<PluginHost> {
	return (
		await import('@/lib/plugins/runtime/plugin-host-instance')
	).createPlaygroundPluginHost();
}
