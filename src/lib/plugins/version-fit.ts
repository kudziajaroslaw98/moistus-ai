import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { validatePluginData } from '@/lib/plugins/plugin-fields';
import type { NodeExtensionData } from '@/types/extensions';

/**
 * How many of a plugin's nodes hold data that `manifest` (another version) rejects:
 * their kind is gone or a field no longer fits. Those nodes keep their saved view.
 */
export function countNodesNotFitting(
	extensions: readonly NodeExtensionData[],
	manifest: PluginManifest
): number {
	return extensions.filter((extension) => {
		if (extension.pluginId !== manifest.id) return false;
		const kind = manifest.nodeKinds.find(
			(candidate) => candidate.kind === extension.kind
		);
		return !kind || !validatePluginData(kind, extension.data).ok;
	}).length;
}
