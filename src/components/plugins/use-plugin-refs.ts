'use client';

import {
	buildPluginRefs,
	pickLinkedNodes,
	type PluginRefs,
} from '@/lib/plugins/ref-context';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

/** Waits this long after the last change to a linked node's content before the plugin redraws. */
const REFS_DEBOUNCE_MS = 300;

/**
 * `ctx.refs` for a `nodes:refs` plugin node: the nodes `ids` link to. A change to which
 * nodes are linked applies at once, because a missing entry means "deleted" to the plugin
 * and a node that was just picked must not look deleted. Changes to the linked nodes'
 * content (typing in one of them) wait (debounced). Moving nodes doesn't count as a
 * change. Null when the plugin doesn't read linked nodes.
 */
export function usePluginRefs(
	ids: readonly string[],
	enabled: boolean
): PluginRefs | null {
	const idsKey = ids.join('\n');
	// Only the linked nodes: other nodes changing (a drag) leaves this array equal, so
	// nothing is described or compared for them.
	const linked = useAppStore(
		useShallow((state) => (enabled ? pickLinkedNodes(ids, state.nodes) : []))
	);
	// A string, so a node that moved or changed in ways a plugin can't see changes nothing.
	const json = useMemo(
		() => (enabled ? JSON.stringify(buildPluginRefs(ids, linked)) : null),
		[enabled, ids, linked]
	);
	const [settled, setSettled] = useState({ idsKey, json });

	useEffect(() => {
		if (settled.idsKey === idsKey && settled.json === json) return;
		const timer = setTimeout(
			() => setSettled({ idsKey, json }),
			settled.idsKey === idsKey ? REFS_DEBOUNCE_MS : 0
		);
		return () => clearTimeout(timer);
	}, [idsKey, json, settled]);

	// New links and turning the power off or on apply at once; only content waits.
	const immediate =
		settled.idsKey !== idsKey || (json === null) !== (settled.json === null);
	const current = immediate ? json : settled.json;
	return useMemo(
		() => (current ? (JSON.parse(current) as PluginRefs) : null),
		[current]
	);
}
