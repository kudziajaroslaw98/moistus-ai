import type { AppNode } from '@/types/app-node';

/**
 * Plugin nodes whose data links to other nodes (`ref: "node"`, saved with `noCopy`) can't
 * be copied: a copy gets new ids, so it would keep pointing at the originals, and two nodes
 * would then claim the same links. Copy, paste and map templates leave them out.
 */
export function isCopyBlockedMetadata(metadata: unknown): boolean {
	if (typeof metadata !== 'object' || metadata === null) return false;
	const extension = (metadata as { extension?: unknown }).extension;
	return (
		typeof extension === 'object' &&
		extension !== null &&
		(extension as { noCopy?: unknown }).noCopy === true
	);
}

export function isNodeCopyBlocked(node: Pick<AppNode, 'data'>): boolean {
	return isCopyBlockedMetadata(node.data.metadata);
}

/** "Threads nodes", "Threads and Budget nodes": what a copy left behind, for the toast. */
export function describeBlockedNodes(nodes: readonly Pick<AppNode, 'data'>[]): string {
	const labels = [
		...new Set(
			nodes.map((node) => node.data.metadata?.extension?.kindLabel ?? 'Plugin')
		),
	];
	const names =
		labels.length <= 1
			? labels[0]
			: `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
	return nodes.length === 1 ? `The ${names} node` : `${names} nodes`;
}
