'use client';

import {
	buildPluginBranch,
	type PluginBranchNode,
} from '@/lib/plugins/branch-context';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useMemo, useState } from 'react';

/** Waits this long after the last branch change before the plugin redraws. */
const BRANCH_DEBOUNCE_MS = 300;

/**
 * `ctx.branch` for a `branch:read` plugin node: the nodes under `nodeId`, updated
 * (debounced) when they change. Moving nodes doesn't count as a change. Null when the
 * plugin doesn't read the branch.
 */
export function usePluginBranch(
	nodeId: string | null,
	enabled: boolean
): PluginBranchNode[] | null {
	// A string, so the component only re-renders when the branch's content changes.
	const json = useAppStore((state) =>
		enabled && nodeId
			? JSON.stringify(buildPluginBranch(nodeId, state.nodes, state.edges))
			: null
	);
	const [settled, setSettled] = useState(json);

	useEffect(() => {
		if (json === settled) return;
		const timer = setTimeout(() => setSettled(json), BRANCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [json, settled]);

	// Turning the power off (or on) applies at once; only content changes wait.
	const current = (json === null) === (settled === null) ? settled : json;
	return useMemo(
		() => (current ? (JSON.parse(current) as PluginBranchNode[]) : null),
		[current]
	);
}
