import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { createAiIdAliasMap } from './ai-id-alias-map';
import {
	buildContextPrompt,
	buildMapSuggestionContext,
	buildMapSummaryContext,
} from './extract-enhanced-node-context';

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
			created_at: '2026-04-14T00:00:00.000Z',
			updated_at: '2026-04-14T00:00:00.000Z',
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

describe('buildMapSuggestionContext', () => {
	it('uses full id-tagged context for small maps that fit within budget', () => {
		const nodes = [
			createNode('root', 'Launch planning'),
			createNode('child', 'Draft onboarding checklist'),
		];
		const edges = [createEdge('edge-1', 'root', 'child')];

		const result = buildMapSuggestionContext(nodes, edges, {
			title: 'Launch Map',
			description: 'Product launch work',
		});

		expect(result.mode).toBe('full');
		expect(result.context).toContain('MAP=');
		expect(result.context).toContain('NODE=');
		expect(result.context).toContain('ANCHOR=');
		expect(result.context).toContain('"root"');
		expect(result.context).toContain('"child"');
		expect(result.candidateNodeIds).toEqual(['root', 'child']);
		expect(result.truncated).toBe(false);
		expect(result.estimatedTokens).toBeLessThanOrEqual(5000);
		expect(result.context).not.toContain('Key Nodes:');
		expect(result.context).not.toContain('All Nodes (Valid Anchor IDs):');
	});

	it('keeps all eligible anchors even when legacy windowing options are passed', () => {
		const nodes = Array.from({ length: 30 }, (_, index) =>
			createNode(
				`node-${index}`,
				`Topic ${index} ${'detail '.repeat(20)}`,
				index === 0
					? {}
					: {
							position: { x: index * 10, y: index * 10 },
					  }
			)
		);
		const edges = nodes.slice(1).map((node, index) =>
			createEdge(`edge-${index}`, 'node-0', node.id)
		);

		const result = buildMapSuggestionContext(
			nodes,
			edges,
			{
				title: 'Large Map',
				description: 'Oversized map',
			},
			{
				tokenBudget: 400,
				maxAnchorCandidates: 4,
				anchorPoolSize: 8,
				anchorWindowOffset: 3,
			}
		);

		expect(result.mode).toBe('full');
		expect(result.context).toContain('MAP=');
		expect(result.context).toContain('ANCHOR=');
		expect(result.context).toContain('"node-29"');
		expect(result.candidateNodeIds).toHaveLength(30);
		expect(result.candidateNodeIds).toContain('node-29');
		expect(result.context).toContain('"node-0"');
		expect(result.truncated).toBe(false);
		expect(result.context).not.toContain('Valid Anchor Candidates:');
		expect(result.context).not.toContain('truncated for context limit');
	});

	it('no longer changes whole-map candidates when legacy anchor window offsets differ', () => {
		const nodes = Array.from({ length: 12 }, (_, index) =>
			createNode(`node-${index}`, `Topic ${index} ${'detail '.repeat(20)}`)
		);
		const edges = nodes.slice(1).map((node, index) =>
			createEdge(`edge-${index}`, 'node-0', node.id)
		);

		const firstResult = buildMapSuggestionContext(
			nodes,
			edges,
			{
				title: 'Rotation Map',
				description: 'Anchor window rotation',
			},
			{
				tokenBudget: 260,
				maxAnchorCandidates: 4,
				anchorPoolSize: 8,
				anchorWindowOffset: 0,
			}
		);
		const secondResult = buildMapSuggestionContext(
			nodes,
			edges,
			{
				title: 'Rotation Map',
				description: 'Anchor window rotation',
			},
			{
				tokenBudget: 260,
				maxAnchorCandidates: 4,
				anchorPoolSize: 8,
				anchorWindowOffset: 3,
			}
		);

		expect(firstResult.candidateNodeIds).toHaveLength(12);
		expect(secondResult.candidateNodeIds).toHaveLength(12);
		expect(secondResult.candidateNodeIds).toEqual(firstResult.candidateNodeIds);
		expect(secondResult.context).toEqual(firstResult.context);
	});

	it('keeps full anchor content instead of truncating individual values', () => {
		const longContent =
			'Subscriptions | fix not showing usage / billings in user settings test user subscriptions test user trial test user renewals test user usage outages test user privileges';
		const nodes = [createNode('anchor-node', longContent)];

		const result = buildMapSuggestionContext(nodes, [], {
			title: 'Billing Map',
			description: 'Long-form anchor preservation',
		});

		expect(result.context).toContain(longContent);
		expect(result.context).not.toContain('...');
	});

	it('aliases whole-map row ids while keeping candidateNodeIds on UUIDs', () => {
		const nodes = [
			createNode('root', 'Launch planning'),
			createNode('child', 'Draft onboarding checklist'),
		];
		const edges = [createEdge('edge-1', 'root', 'child')];
		const aliasMap = createAiIdAliasMap(nodes);

		const result = buildMapSuggestionContext(
			nodes,
			edges,
			{
				title: 'Launch Map',
				description: 'Product launch work',
			},
			{},
			{ aliasMap }
		);

		expect(result.context).toContain('NODE=[1,');
		expect(result.context).toContain('NODE=[2,');
		expect(result.context).toContain('ANCHOR=[1,');
		expect(result.context).toContain('ANCHOR=[2,');
		expect(result.context).not.toContain('"root"');
		expect(result.context).not.toContain('"child"');
		expect(result.candidateNodeIds).toEqual(['root', 'child']);
	});
});

describe('compact enhanced context builders', () => {
	it('formats focused-node context as hybrid rows without verbose labels', () => {
		const root = createNode('root', 'Growth strategy');
		const primary = createNode('focus', 'Launch referral program', {
			data: { tags: ['growth', 'acquisition'] },
		});
		const sibling = createNode('sib', 'Improve onboarding flow');
		const edges = [
			createEdge('edge-1', 'root', 'focus'),
			createEdge('edge-2', 'root', 'sib'),
		];

		const result = buildContextPrompt({
			primary,
			siblings: [sibling],
			parent: root,
			grandparent: null,
			siblingPatterns: {
				commonTags: ['growth'],
				nodeTypes: ['defaultNode'],
				avgContentLength: 24,
				topics: ['growth', 'referral'],
			},
			graphTopology: {
				isIsolated: false,
				degree: 2,
				inDegree: 1,
				outDegree: 1,
				depth: 1,
			},
		});

		expect(result).toContain('NODE=');
		expect(result).toContain('REL=');
		expect(result).toContain('TOPICS=');
		expect(result).not.toContain('Content:');
		expect(result).not.toContain('Hierarchy:');
		expect(result).not.toContain('Graph Position:');
	});

	it('formats map summaries as compact rows', () => {
		const nodes = [
			createNode('root', 'Product launch planning'),
			createNode('child', 'Draft onboarding checklist'),
			createNode('child-2', 'Referral incentives'),
		];
		const edges = [
			createEdge('edge-1', 'root', 'child'),
			createEdge('edge-2', 'root', 'child-2'),
		];

		const result = buildMapSummaryContext(nodes, edges, {
			title: 'Launch Map',
			description: 'Product launch work',
		});

		expect(result).toContain('MAP=');
		expect(result).toContain('METRIC=');
		expect(result).toContain('NODE=');
		expect(result).not.toContain('Key Topics:');
		expect(result).not.toContain('Key Nodes:');
		expect(result).not.toContain('Structure:');
	});

	it('aliases focused-node and summary row ids when an alias map is provided', () => {
		const root = createNode('root', 'Growth strategy');
		const primary = createNode('focus', 'Launch referral program');
		const sibling = createNode('sib', 'Improve onboarding flow');
		const aliasMap = createAiIdAliasMap([root, primary, sibling]);

		const focusedContext = buildContextPrompt(
			{
				primary,
				siblings: [sibling],
				parent: root,
				grandparent: null,
				siblingPatterns: {
					commonTags: [],
					nodeTypes: ['defaultNode'],
					avgContentLength: 20,
					topics: ['growth'],
				},
				graphTopology: {
					isIsolated: false,
					degree: 2,
					inDegree: 1,
					outDegree: 1,
					depth: 1,
				},
			},
			{ aliasMap }
		);

		expect(focusedContext).toContain('NODE=[2,');
		expect(focusedContext).toContain('NODE=[1,');
		expect(focusedContext).toContain('NODE=[3,');
		expect(focusedContext).toContain('REL=["parent",1,2]');
		expect(focusedContext).toContain('REL=["sibling",2,3]');
		expect(focusedContext).not.toContain('"focus"');
		expect(focusedContext).not.toContain('"root"');
		expect(focusedContext).not.toContain('"sib"');

		const summaryContext = buildMapSummaryContext(
			[root, primary, sibling],
			[
				createEdge('edge-1', 'root', 'focus'),
				createEdge('edge-2', 'root', 'sib'),
			],
			{
				title: 'Growth Map',
				description: 'Acquisition work',
			},
			{ aliasMap }
		);

		expect(summaryContext).toContain('NODE=[1,');
		expect(summaryContext).toContain('NODE=[2,');
		expect(summaryContext).toContain('NODE=[3,');
		expect(summaryContext).not.toContain('"focus"');
		expect(summaryContext).not.toContain('"root"');
		expect(summaryContext).not.toContain('"sib"');
	});
});
