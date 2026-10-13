/**
 * Pure helpers for publishing a user's map as a system template.
 * Rows are copied with fresh IDs, remapped parent/edge references and
 * `user_id: null` (template content must never cascade with a user account).
 */

/** Explicit lists: `nodes.content_tsv` is generated and must not be inserted. */
export const TEMPLATE_SOURCE_NODE_COLUMNS =
	'id, parent_id, content, position_x, position_y, node_type, metadata, tags, status, importance, sourceUrl, height, width, aiData';
export const TEMPLATE_SOURCE_EDGE_COLUMNS =
	'id, source, target, label, type, metadata, aiData, markerEnd, markerStart, style, animated';

export type TemplateSourceNodeRow = {
	id: string;
	parent_id: string | null;
	node_type: string | null;
	[column: string]: unknown;
};

export type TemplateSourceEdgeRow = {
	id: string;
	source: string | null;
	target: string | null;
	[column: string]: unknown;
};

export interface ClonedTemplateGraph {
	nodes: Array<Record<string, unknown>>;
	edges: Array<Record<string, unknown>>;
}

export function cloneGraphForTemplate(
	sourceNodes: TemplateSourceNodeRow[],
	sourceEdges: TemplateSourceEdgeRow[],
	templateMapId: string,
	generateId: () => string
): ClonedTemplateGraph {
	// Ghost nodes are transient AI suggestions, never template content.
	const keptNodes = sourceNodes.filter((node) => node.node_type !== 'ghostNode');

	const idMap = new Map<string, string>();
	for (const node of keptNodes) {
		idMap.set(node.id, generateId());
	}

	const nodes = keptNodes.map((node) => ({
		...node,
		id: idMap.get(node.id),
		map_id: templateMapId,
		user_id: null,
		parent_id: node.parent_id ? (idMap.get(node.parent_id) ?? null) : null,
	}));

	const edges = sourceEdges.flatMap((edge) => {
		const source = edge.source ? idMap.get(edge.source) : undefined;
		const target = edge.target ? idMap.get(edge.target) : undefined;
		if (!source || !target) return [];

		return [
			{
				...edge,
				id: generateId(),
				map_id: templateMapId,
				user_id: null,
				source,
				target,
			},
		];
	});

	return { nodes, edges };
}

/** Stable, URL-safe `metadata.templateId` used by `/api/templates/[id]` slug lookup. */
export function buildTemplateSlug(title: string, suffix: string): string {
	const base = title
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);

	return `${base || 'template'}-${suffix}`;
}
