import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { LayoutDirection } from '@/types/layout-types';
import dagre from 'dagre';

const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
	nodes: AppNode[],
	edges: AppEdge[],
	direction: LayoutDirection = 'TB'
) => {
	g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 150 });

	nodes.forEach((node) => {
		const nodeWidth = node.width || 320;
		const nodeHeight = node.height || 100;
		g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge) => {
		g.setEdge(edge.source, edge.target);
	});

	dagre.layout(g);

	const layoutedNodes = nodes.map((node) => {
		const nodeWithPosition = g.node(node.id);

		if (!nodeWithPosition) {
			console.warn(`Dagre could not find node ${node.id} during layout.`);
			return node;
		}

		const nodeWidth = node.width || 320;
		const nodeHeight = node.height || 100;

		return {
			...node,
			position: {
				x: nodeWithPosition.x - nodeWidth / 2,
				y: nodeWithPosition.y - nodeHeight / 2,
			},
			data: node.data, // Preserve existing node data
		};
	});

	return { layoutedNodes, layoutedEdges: edges }; // Edges are not modified by dagre layout
};

export default getLayoutedElements;
