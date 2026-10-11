'use client';

import { buildPluginRefs, type PluginRefs } from '@/lib/plugins/ref-context';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useMemo, useState } from 'react';

/** Waits this long after the last change to a linked node before the plugin redraws. */
const REFS_DEBOUNCE_MS = 300;

/**
 * `ctx.refs` for a `nodes:refs` plugin node: the nodes `ids` link to, updated (debounced)
 * when their content changes. Moving nodes doesn't count as a change. Null when the
 * plugin doesn't read linked nodes.
 */
export function usePluginRefs(
	ids: readonly string[],
	enabled: boolean
): PluginRefs | null {
	// A string, so the component only re-renders when the linked nodes' content changes.
	const json = useAppStore((state) =>
		enabled ? JSON.stringify(buildPluginRefs(ids, state.nodes)) : null
	);
	const [settled, setSettled] = useState(json);

	useEffect(() => {
		if (json === settled) return;
		const timer = setTimeout(() => setSettled(json), REFS_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [json, settled]);

	// Turning the power off (or on) applies at once; only content changes wait.
	const current = (json === null) === (settled === null) ? settled : json;
	return useMemo(
		() => (current ? (JSON.parse(current) as PluginRefs) : null),
		[current]
	);
}
