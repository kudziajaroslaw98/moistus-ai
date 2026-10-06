/** Preview box in SVG units; cards render it with `viewBox="0 0 240 120"`. */
export const MAP_PREVIEW_WIDTH = 240;
export const MAP_PREVIEW_HEIGHT = 120;
export const MAP_PREVIEW_MAX_NODES = 40;
/** Max map IDs per `POST /api/maps/previews` request. */
export const MAX_PREVIEW_MAP_IDS = 60;

const PADDING = 14;
// Flow-space size used when a node has no measured width/height yet.
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 60;
// Caps zoom so a 1-3 node map stays small instead of filling the box.
const MAX_SCALE = 0.25;

export interface PreviewSourceNode {
	id: string;
	position_x: number;
	position_y: number;
	width?: number | null;
	height?: number | null;
	node_type?: string | null;
}

export interface PreviewSourceEdge {
	source: string;
	target: string;
}

export interface MapPreviewRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface MapPreview {
	nodes: MapPreviewRect[];
	/** Pairs of indices into `nodes`. */
	edges: [number, number][];
}

/**
 * Scales a map's node layout into the fixed preview box (aspect ratio kept,
 * centered, whole numbers) and turns edges into node-index pairs.
 */
export function buildMapPreview(
	sourceNodes: PreviewSourceNode[],
	sourceEdges: PreviewSourceEdge[],
	{ maxNodes = MAP_PREVIEW_MAX_NODES }: { maxNodes?: number } = {}
): MapPreview {
	const nodes = sourceNodes
		.filter((node) => node.node_type !== 'ghostNode')
		.slice(0, maxNodes)
		.map((node) => ({
			id: node.id,
			x: node.position_x,
			y: node.position_y,
			w: node.width || DEFAULT_NODE_WIDTH,
			h: node.height || DEFAULT_NODE_HEIGHT,
		}));

	if (nodes.length === 0) return { nodes: [], edges: [] };

	const minX = Math.min(...nodes.map((n) => n.x));
	const minY = Math.min(...nodes.map((n) => n.y));
	const spanX = Math.max(...nodes.map((n) => n.x + n.w)) - minX;
	const spanY = Math.max(...nodes.map((n) => n.y + n.h)) - minY;

	const scale = Math.min(
		(MAP_PREVIEW_WIDTH - PADDING * 2) / spanX,
		(MAP_PREVIEW_HEIGHT - PADDING * 2) / spanY,
		MAX_SCALE
	);
	const offsetX = (MAP_PREVIEW_WIDTH - spanX * scale) / 2;
	const offsetY = (MAP_PREVIEW_HEIGHT - spanY * scale) / 2;

	// floor/ceil keep rounded rects inside the box.
	const rects = nodes.map((n) => {
		const x = Math.floor(offsetX + (n.x - minX) * scale);
		const y = Math.floor(offsetY + (n.y - minY) * scale);
		const right = Math.ceil(offsetX + (n.x - minX + n.w) * scale);
		const bottom = Math.ceil(offsetY + (n.y - minY + n.h) * scale);
		return {
			x,
			y,
			w: Math.max(2, Math.min(right, MAP_PREVIEW_WIDTH) - x),
			h: Math.max(2, Math.min(bottom, MAP_PREVIEW_HEIGHT) - y),
		};
	});

	const indexById = new Map(nodes.map((n, i) => [n.id, i]));
	const seenEdges = new Set<string>();
	const edges: [number, number][] = [];

	for (const edge of sourceEdges) {
		const from = indexById.get(edge.source);
		const to = indexById.get(edge.target);
		if (from === undefined || to === undefined || from === to) continue;

		const key = `${from}:${to}`;
		if (seenEdges.has(key)) continue;
		seenEdges.add(key);
		edges.push([from, to]);
	}

	return { nodes: rects, edges };
}
