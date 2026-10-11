import {
	describePluginNode,
	type PluginNodeInfo,
} from '@/lib/plugins/branch-context';
import { PLUGIN_REF_LIMITS } from '@/lib/plugins/limits';
import type { AppNode } from '@/types/app-node';

/**
 * `ctx.refs` for plugins with the `nodes:refs` power: a compact, read-only view of the
 * nodes the plugin's own data links to, keyed by node id. A link to a node that no longer
 * exists simply has no entry, which is how a plugin knows it was deleted. Only the linked
 * nodes are read, never the rest of the map, and nothing here leaves the browser because a
 * plugin that reads nodes can never reach a site.
 */
export type PluginRefNode = PluginNodeInfo;
export type PluginRefs = Record<string, PluginRefNode>;

export function buildPluginRefs(
	ids: readonly string[],
	nodes: readonly AppNode[]
): PluginRefs {
	const wanted = new Set(ids.slice(0, PLUGIN_REF_LIMITS.nodes));
	const refs: PluginRefs = {};
	for (const node of nodes) {
		// Suggestions that haven't been accepted yet aren't part of the map.
		if (!wanted.has(node.id) || node.type === 'ghostNode') continue;
		refs[node.id] = describePluginNode(node);
	}
	return refs;
}
