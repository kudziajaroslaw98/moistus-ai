import {
	buildSuggestionPromptContext,
	type SuggestionPromptInput,
} from './ai-suggestion-context';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

function createNode(
	id: string,
	content: string,
	overrides: (Omit<Partial<AppNode>, 'data'> & {
		data?: Record<string, unknown>;
	}) = {}
): AppNode {
	const { data: dataOverrides, ...nodeOverrides } = overrides;

	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content,
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			tags: null,
			created_at: '2026-04-15T00:00:00.000Z',
			updated_at: '2026-04-15T00:00:00.000Z',
			...(dataOverrides ?? {}),
		},
		...nodeOverrides,
	} as AppNode;
}

function createEdge(id: string, source: string, target: string): AppEdge {
	return {
		id,
		source,
		target,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
		},
	} as AppEdge;
}

function createBaseInput(
	overrides: Partial<SuggestionPromptInput> = {}
): SuggestionPromptInput {
	return {
		nodes: [],
		edges: [],
		mapMeta: {
			title: 'Launch Map',
			description: 'Product launch planning',
		},
		context: {
			trigger: 'magic-wand',
		},
		selectedLenses: ['risk', 'dependency'],
		recentSuggestions: [
			{
				content: 'Add retry budget for sync failures',
				sourceNodeId: 'root',
				trigger: 'magic-wand',
				timestamp: '2026-04-15T00:00:00.000Z',
			},
		],
		clickIndex: 2,
		requestNonce: 'nonce-1',
		...overrides,
	};
}

describe('buildSuggestionPromptContext', () => {
	it('builds full-map prompt context with all eligible anchors and compact rows', () => {
		const root = createNode('root', 'Launch planning');
		const child = createNode('child', 'Draft onboarding checklist');
		const ghost = createNode('ghost', 'Ghost helper', {
			type: 'ghostNode',
			data: { node_type: 'ghostNode' },
		});
		const promptContext = buildSuggestionPromptContext(
			createBaseInput({
				nodes: [root, child, ghost],
				edges: [createEdge('edge-1', 'root', 'child')],
			})
		);

		expect(promptContext.isWholeMapSuggestion).toBe(true);
		expect(promptContext.validAnchorNodeIds).toEqual(['root', 'child']);
		expect(promptContext.graph.mode).toBe('full-map');
		expect(promptContext.aliasMap.nodeIdToAlias.get('root')).toBe(1);
		expect(promptContext.aliasMap.nodeIdToAlias.get('child')).toBe(2);
		expect(promptContext.graphRows[0]).toContain('MAP=');
		expect(promptContext.graphRows).toEqual(
			expect.arrayContaining([
				expect.stringContaining('NODE=[1,'),
				expect.stringContaining('NODE=[2,'),
				expect.stringContaining('REL=["edge",1,2]'),
				expect.stringContaining('ANCHOR=[1,'),
				expect.stringContaining('ANCHOR=[2,'),
				expect.stringContaining('METRIC='),
			])
		);
		expect(promptContext.prompt).toContain('LENS=');
		expect(promptContext.prompt).toContain(
			'RECENT=["Add retry budget for sync failures",1,"magic-wand"]'
		);
		expect(promptContext.prompt).toContain('REQUEST=[2,"nonce-1"]');
		expect(promptContext.prompt).not.toContain('"ghost"');
	});

	it('builds focused-node prompt context with focus, ancestry, siblings, and relations', () => {
		const root = createNode('root', 'Growth strategy');
		const focus = createNode('focus', 'Launch referral program', {
			data: { tags: ['growth'] },
		});
		const sibling = createNode('sibling', 'Improve onboarding flow');
		const promptContext = buildSuggestionPromptContext(
			createBaseInput({
				nodes: [root, focus, sibling],
				edges: [
					createEdge('edge-1', 'root', 'focus'),
					createEdge('edge-2', 'root', 'sibling'),
				],
				context: {
					sourceNodeId: 'focus',
					trigger: 'magic-wand',
				},
			})
		);

		expect(promptContext.isWholeMapSuggestion).toBe(false);
		expect(promptContext.validAnchorNodeIds).toEqual([]);
		expect(promptContext.graph.mode).toBe('focused-node');
		expect(promptContext.graph.nodes[0].flags).toContain('focus');
		expect(promptContext.graph.nodes.map((node) => node.id)).toEqual(
			expect.arrayContaining(['focus', 'root', 'sibling'])
		);
		expect(promptContext.graph.relations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'parent',
					fromId: 'root',
					toId: 'focus',
				}),
				expect.objectContaining({
					kind: 'sibling',
					fromId: 'focus',
					toId: 'sibling',
				}),
			])
		);
		expect(promptContext.prompt).toContain('Requested source node: 2');
		expect(promptContext.prompt).toContain('active LENS rows');
	});
});
