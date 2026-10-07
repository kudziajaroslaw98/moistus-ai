import type { PluginHost } from '@/lib/plugins/runtime/plugin-host';

/** The plugin host, imported on first use so maps without plugins never load QuickJS. */
export async function loadPluginHost(): Promise<PluginHost> {
	return (
		await import('@/lib/plugins/runtime/plugin-host-instance')
	).getPluginHost();
}
