import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import {
	foldAnchoredAnnotationData,
	foldAnchoredAnnotationNodes,
} from './ai-anchored-annotations';
import { buildCounterpointPromptContext } from './ai-counterpoint-context';
import { buildMergePromptContext } from './ai-merge-context';
import { extractNodesForConnections } from './extract-connection-context';

function createData(
	id: string,
	nodeType: NodeData['node_type'],
	content: string,
	metadata: NodeData['metadata'] = {}
): NodeData {
	return {
		id,
		map_id: 'map-1',
		parent_id: null,
		content,
		position_x: 0,
		position_y: 0,
		node_type: nodeType,
		created_at: '2026-10-03T00:00:00.000Z',
		updated_at: '2026-10-03T00:00:00.000Z',
		metadata,
	};
}

const host = createData('host', 'defaultNode', 'Release plan');
const warning = createData('warn', 'annotationNode', 'Breaking change', {
	annotationType: 'warning',
	anchorNodeId: 'host',
});
const free = createData('free', 'annotationNode', 'Loose thought');
const dangling = createData('dangling', 'annotationNode', 'Orphan', {
	anchorNodeId: 'deleted',
});

describe('foldAnchoredAnnotationData', () => {
	it('drops anchored annotations and appends their text to the host', () => {
		const { nodes, hostByAnnotationId } = foldAnchoredAnnotationData([
			host,
			warning,
			free,
			dangling,
		]);

		expect(nodes.map((node) => node.id)).toEqual(['host', 'free', 'dangling']);
		expect(nodes[0].content).toBe('Release plan | note(warning): Breaking change');
		expect(hostByAnnotationId).toEqual(new Map([['warn', 'host']]));
		// input untouched
		expect(host.content).toBe('Release plan');
	});

	it('returns the same nodes when nothing is anchored', () => {
		const { nodes } = foldAnchoredAnnotationData([host, free]);
		expect(nodes).toEqual([host, free]);
	});
});

describe('AI context builders fold anchored annotations', () => {
	it('merge context never exposes anchored annotations as candidates', () => {
		const context = buildMergePromptContext([host, warning]);
		expect([...context.validNodeIds]).toEqual(['host']);
		expect(context.nodeRows).toHaveLength(1);
		expect(context.nodeRows[0]).toContain('note(warning): Breaking change');
	});

	it('connection candidates exclude anchored annotations', () => {
		const nodes = extractNodesForConnections([host, warning, free]);
		expect(nodes.map((node) => node.id)).toEqual(['host', 'free']);
		expect(nodes[0].semantic).toContain('note(warning): Breaking change');
	});

	it('counterpoints resolve an annotation source to its host', () => {
		const toAppNode = (data: NodeData): AppNode => ({
			id: data.id,
			type: data.node_type,
			position: { x: 0, y: 0 },
			data,
		});
		const { nodes } = foldAnchoredAnnotationNodes([toAppNode(host), toAppNode(warning)]);
		expect(nodes.map((node) => node.id)).toEqual(['host']);

		const context = buildCounterpointPromptContext({
			nodes: [toAppNode(host), toAppNode(warning)],
			edges: [],
			context: { sourceNodeId: 'warn', trigger: 'magic-wand' } as never,
		});
		expect(context.contextRows).toHaveLength(1);
		expect(context.contextRows[0]).toContain('Release plan');
		expect(context.contextRows[0]).toContain('note(warning)');
	});
});
