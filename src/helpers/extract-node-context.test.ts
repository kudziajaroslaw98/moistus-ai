import type { NodeData } from '@/types/node-data';
import { createAiIdAliasMap } from './ai-id-alias-map';
import { extractNodesContext } from './extract-node-context';

function createNode(
	id: string,
	nodeType: NodeData['node_type'],
	overrides: Partial<NodeData> = {}
): NodeData {
	return {
		id,
		map_id: 'map-1',
		parent_id: null,
		content: 'Default content',
		position_x: 0,
		position_y: 0,
		node_type: nodeType,
		created_at: '2026-04-14T00:00:00.000Z',
		updated_at: '2026-04-14T00:00:00.000Z',
		metadata: null,
		...overrides,
	};
}

describe('extractNodesContext', () => {
	it('renders default nodes as stable hybrid rows', () => {
		const nodes = [
			createNode('node-1', 'defaultNode', {
				content: 'Launch roadmap',
				metadata: {
					title: 'Q3 plan',
					tags: ['strategy', 'launch'],
				},
			}),
		];

		const [row] = extractNodesContext(nodes);

		expect(row).toBe(
			'NODE=["node-1","default","Q3 plan | Launch roadmap",["strategy","launch"]]'
		);
	});

	it('preserves type-specific semantic fields in compact rows', () => {
		const nodes = [
			createNode('task-1', 'taskNode', {
				content: 'Ship checklist',
				metadata: {
					title: 'Launch tasks',
					priority: 'high',
					tasks: [
						{ id: 't1', text: 'Draft email', isComplete: true },
						{ id: 't2', text: 'Publish changelog', isComplete: false },
					],
				},
			}),
			createNode('question-1', 'questionNode', {
				content: 'What blocks launch?',
				metadata: {
					answer: 'Approval timeline',
				},
			}),
		];

		const rows = extractNodesContext(nodes);

		expect(rows[0]).toContain('NODE=["task-1","task"');
		expect(rows[0]).toContain('Launch tasks | Ship checklist');
		expect(rows[0]).toContain('priority:high');
		expect(rows[0]).toContain('subtasks:1/2');
		expect(rows[0]).toContain('done:Draft email, todo:Publish changelog');
		expect(rows[1]).toBe(
			'NODE=["question-1","question","What blocks launch? | Approval timeline",[]]'
		);
	});

	it('normalizes empty optional values instead of expanding them into prose', () => {
		const nodes = [
			createNode('text-1', 'textNode', {
				content: 'A short note',
				metadata: {
					label: 'Memo',
				},
			}),
		];

		const [row] = extractNodesContext(nodes);

		expect(row).toContain('NODE=');
		expect(row).not.toContain('Label:');
		expect(row).not.toContain('Text:');
		expect(row).not.toContain('Tags:');
	});

	it('aliases row ids and embedded node references when an alias map is provided', () => {
		const nodes = [
			createNode('target-node', 'defaultNode', {
				content: 'Launch roadmap',
			}),
			createNode('annotation-node', 'annotationNode', {
				content: 'Needs callout',
				metadata: {
					targetNodeId: 'target-node',
				},
			}),
		];
		const aliasMap = createAiIdAliasMap(nodes);

		const rows = extractNodesContext(nodes, { aliasMap });

		expect(rows[0]).toBe('NODE=[1,"default","Launch roadmap",[]]');
		expect(rows[1]).toBe(
			'NODE=[2,"annotation","Needs callout | target:1",[]]'
		);
	});
});
