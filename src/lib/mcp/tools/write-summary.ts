import type { GraphActor } from '@/types/extensions';
import { getOAuthClientName } from '../client-name';
import type { McpToolContext } from '../context';
import { buildShortIds } from '../format/short-ids';
import type { CommitResult } from '../graph/commit';
import type { WorkingGraph } from '../graph/edit-plan';

const MAX_LISTED_REFS = 60;

export async function agentActor(ctx: McpToolContext): Promise<{ actor: GraphActor; name: string }> {
	const name = await getOAuthClientName(ctx.clientId);
	return { actor: { kind: 'agent', id: ctx.clientId, label: name }, name };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "+12 nodes, 3 updated, …" plus the short ids of named (&ref) nodes. */
export function describeCommit(graph: WorkingGraph, result: CommitResult, appName: string): string {
	const { changes } = result;
	const parts = [
		changes.insertNodes.length > 0 ? `+${plural(changes.insertNodes.length, 'node')}` : null,
		changes.updateNodes.length > 0 ? `${changes.updateNodes.length} updated` : null,
		changes.deleteNodeIds.length > 0 ? `${changes.deleteNodeIds.length} deleted` : null,
		changes.insertEdges.length > 0 ? `+${plural(changes.insertEdges.length, 'link')}` : null,
		changes.updateEdges.length > 0 ? `${plural(changes.updateEdges.length, 'link')} relabeled` : null,
		changes.deleteEdgeIds.length > 0 ? `${plural(changes.deleteEdgeIds.length, 'link')} removed` : null,
	].filter(Boolean);

	const lines = [parts.length > 0 ? parts.join(', ') : 'No changes.'];

	if (graph.refs.size > 0) {
		const shortIds = buildShortIds(graph.nodes.keys());
		const refs = [...graph.refs].slice(0, MAX_LISTED_REFS).map(([ref, id]) => `${ref}=${shortIds.get(id)}`);
		const more = graph.refs.size > MAX_LISTED_REFS ? ` (+${graph.refs.size - MAX_LISTED_REFS} more)` : '';
		lines.push(`Refs: ${refs.join(' ')}${more}`);
	}
	lines.push(`The user can undo this from the map's History panel ("${appName}").`);
	if (!result.live) lines.push('Open canvases may need a reload to show it.');
	return lines.join('\n');
}
