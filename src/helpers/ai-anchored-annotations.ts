import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';

/**
 * AI context treatment for anchored annotations.
 *
 * An anchored annotation is a note *about* its host, not a peer idea. Before any
 * AI prompt is built, anchored annotations are removed from the node list and
 * their text is appended to the host's content as `note(<type>): <text>`.
 * Every row builder (NODE rows, connection lines, topics, search) therefore sees
 * the note in host context, and the model can never target the annotation id.
 *
 * Only annotations whose host is present in the same node list are folded; an
 * annotation with a missing host stays a normal (free) node.
 */

export interface FoldedAnchoredAnnotations<T> {
	nodes: T[];
	/** folded annotation id -> host id */
	hostByAnnotationId: Map<string, string>;
}

function formatAnnotationNote(data: NodeData): string | null {
	const text = typeof data.content === 'string' ? data.content.trim() : '';
	if (!text) return null;
	return `note(${data.metadata?.annotationType ?? 'note'}): ${text}`;
}

function foldAnchoredAnnotations<T>(
	nodes: readonly T[],
	getData: (node: T) => NodeData | undefined,
	getId: (node: T) => string,
	isAnnotation: (node: T) => boolean,
	withContent: (node: T, content: string) => T
): FoldedAnchoredAnnotations<T> {
	const hostIds = new Set<string>();
	for (const node of nodes) {
		if (!isAnnotation(node)) hostIds.add(getId(node));
	}

	const hostByAnnotationId = new Map<string, string>();
	const notesByHost = new Map<string, string[]>();

	for (const node of nodes) {
		const data = getData(node);
		if (!data || !isAnnotation(node)) continue;
		const hostId = data.metadata?.anchorNodeId;
		if (!hostId || hostId === getId(node) || !hostIds.has(hostId)) continue;

		hostByAnnotationId.set(getId(node), hostId);
		const note = formatAnnotationNote(data);
		if (!note) continue;
		const notes = notesByHost.get(hostId);
		if (notes) notes.push(note);
		else notesByHost.set(hostId, [note]);
	}

	if (hostByAnnotationId.size === 0) {
		return { nodes: [...nodes], hostByAnnotationId };
	}

	const folded: T[] = [];
	for (const node of nodes) {
		const id = getId(node);
		if (hostByAnnotationId.has(id)) continue;
		const notes = notesByHost.get(id);
		if (!notes) {
			folded.push(node);
			continue;
		}
		const content = getData(node)?.content;
		folded.push(
			withContent(node, [content, ...notes].filter(Boolean).join(' | '))
		);
	}

	return { nodes: folded, hostByAnnotationId };
}

/** Fold anchored annotations for DB-shaped `NodeData[]` inputs. */
export function foldAnchoredAnnotationData(
	nodes: readonly NodeData[]
): FoldedAnchoredAnnotations<NodeData> {
	return foldAnchoredAnnotations(
		nodes,
		(node) => node,
		(node) => node.id,
		(node) => node.node_type === 'annotationNode',
		(node, content) => ({ ...node, content })
	);
}

/** Fold anchored annotations for React Flow `AppNode[]` inputs. */
export function foldAnchoredAnnotationNodes(
	nodes: readonly AppNode[]
): FoldedAnchoredAnnotations<AppNode> {
	return foldAnchoredAnnotations(
		nodes,
		(node) => node.data,
		(node) => node.id,
		(node) => (node.data?.node_type ?? node.type) === 'annotationNode',
		(node, content) => ({ ...node, data: { ...node.data, content } })
	);
}
