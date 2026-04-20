import {
	getSuggestionStreamErrorMessage,
	isDuplicateSuggestion,
	processSuggestionElement,
	suggestionObjectSchema,
	toSuggestionChunk,
} from './ai-suggestion-postprocess';
import { createAiIdAliasMap } from './ai-id-alias-map';
import type { AppNode } from '@/types/app-node';

function createNode(id: string, content: string): AppNode {
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
		},
	} as AppNode;
}

describe('ai suggestion postprocess', () => {
	it('rejects exact and high-overlap duplicate suggestions', () => {
		expect(
			isDuplicateSuggestion({
				candidate: {
					content: 'Add retry budget for sync failures',
					sourceNodeId: 'node-1',
				},
				recentSuggestions: [
					{
						content: 'Retry budget for sync failures add',
						sourceNodeId: 'node-1',
					},
				],
				emittedSuggestions: [],
			})
		).toBe(true);

		expect(
			isDuplicateSuggestion({
				candidate: {
					content: 'Measure onboarding drop-off after the first tooltip',
					sourceNodeId: 'node-1',
				},
				recentSuggestions: [
					{
						content: 'Document enterprise billing migration risks',
						sourceNodeId: 'node-2',
					},
				],
				emittedSuggestions: [
					{
						content: 'Interview trial users about signup friction',
						sourceNodeId: 'node-1',
					},
				],
			})
		).toBe(false);
	});

	it('normalizes invalid whole-map anchors and enriches the streamed chunk', () => {
		const trialNode = createNode(
			'trial',
			'Trial collaborator limits confusing'
		);
		const billingNode = createNode(
			'billing',
			'Billing usage state is missing in settings'
		);
		const aliasMap = createAiIdAliasMap([trialNode, billingNode]);
		const processedSuggestion = processSuggestionElement({
			element: {
				id: 'suggestion-1',
				content: 'Clarify collaborator limit state before upgrade wall',
				nodeType: 'defaultNode',
				nodePayload: null,
				confidence: 0.88,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: 2,
					targetNodeId: null,
					relationshipType: 'reduces confusion',
					trigger: 'magic-wand',
				},
				reasoning: 'This addresses a concrete confusion point before upgrade.',
			},
			validAnchorNodeIds: new Set(['trial']),
			requestContext: {
				trigger: 'magic-wand',
			},
			recentSuggestions: [],
			emittedSuggestions: [],
			minConfidence: 0.4,
			maxSuggestions: 6,
			emittedCount: 0,
			aliasMap,
		});

		expect(processedSuggestion).not.toBeNull();
		expect(processedSuggestion?.suggestion.context.sourceNodeId).toBeNull();

		const chunk = toSuggestionChunk({
			processedSuggestion: {
				...processedSuggestion!,
				resolvedSourceNodeId: 'trial',
			},
			index: 0,
			nodes: [trialNode],
		});

		expect(chunk.type).toBe('data-node-suggestion');
		expect(chunk.data.index).toBe(0);
		expect(chunk.data.sourceNodeName).toContain('Trial collaborator');
		expect(chunk.data.sourceNodeContent).toBe(
			'Trial collaborator limits confusing'
		);
	});

	it('remaps aliased source and target ids back to UUIDs before filtering', () => {
		const trialNode = createNode(
			'trial',
			'Trial collaborator limits confusing'
		);
		const billingNode = createNode(
			'billing',
			'Billing usage state is missing in settings'
		);
		const aliasMap = createAiIdAliasMap([trialNode, billingNode]);

		const processedSuggestion = processSuggestionElement({
			element: {
				id: 'suggestion-2',
				content: 'Add fallback copy when billing usage is unavailable',
				nodeType: 'defaultNode',
				nodePayload: null,
				confidence: 0.84,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: 1,
					targetNodeId: 2,
					relationshipType: 'reduces confusion',
					trigger: 'magic-wand',
				},
				reasoning: 'This closes a gap around unavailable billing state.',
			},
			validAnchorNodeIds: new Set(['trial']),
			requestContext: {
				trigger: 'magic-wand',
			},
			recentSuggestions: [],
			emittedSuggestions: [],
			minConfidence: 0.4,
			maxSuggestions: 6,
			emittedCount: 0,
			aliasMap,
		});

		expect(processedSuggestion?.suggestion.context.sourceNodeId).toBe('trial');
		expect(processedSuggestion?.suggestion.context.targetNodeId).toBe('billing');
		expect(processedSuggestion?.resolvedSourceNodeId).toBe('trial');
	});

	it('keeps valid task payloads on task suggestions', () => {
		const processedSuggestion = processSuggestionElement({
			element: {
				id: 'suggestion-task',
				content: 'Upgrade copy fixes',
				nodeType: 'taskNode',
				nodePayload: {
					title: 'Upgrade copy fixes',
					tasks: [
						'Explain collaborator limits before the upgrade gate',
						'Show current collaborator count next to the limit',
					],
					answer: null,
					questionType: null,
					annotationType: null,
					language: null,
					fileName: null,
				},
				confidence: 0.9,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: null,
					targetNodeId: null,
					relationshipType: null,
					trigger: 'magic-wand',
				},
				reasoning: 'This turns a vague branch into executable work.',
			},
			validAnchorNodeIds: null,
			requestContext: {
				trigger: 'magic-wand',
			},
			recentSuggestions: [],
			emittedSuggestions: [],
			minConfidence: 0.4,
			maxSuggestions: 6,
			emittedCount: 0,
		});

		expect(processedSuggestion?.suggestion.nodeType).toBe('taskNode');
		expect(processedSuggestion?.suggestion.nodePayload).toEqual({
			title: 'Upgrade copy fixes',
			tasks: [
				'Explain collaborator limits before the upgrade gate',
				'Show current collaborator count next to the limit',
			],
			answer: null,
			questionType: null,
			annotationType: null,
			language: null,
			fileName: null,
		});
	});

	it('downgrades malformed task payloads to default nodes before streaming', () => {
		const processedSuggestion = processSuggestionElement({
			element: {
				id: 'suggestion-task-fallback',
				content: 'Upgrade copy fixes',
				nodeType: 'taskNode',
				confidence: 0.82,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: null,
					targetNodeId: null,
					relationshipType: null,
					trigger: 'magic-wand',
				},
				reasoning: 'Still useful as a plain note.',
			},
			validAnchorNodeIds: null,
			requestContext: {
				trigger: 'magic-wand',
			},
			recentSuggestions: [],
			emittedSuggestions: [],
			minConfidence: 0.4,
			maxSuggestions: 6,
			emittedCount: 0,
		});

		expect(processedSuggestion?.suggestion.nodeType).toBe('defaultNode');
		expect(processedSuggestion?.suggestion.nodePayload).toBeNull();
		expect(processedSuggestion?.suggestion.content).toBe('Upgrade copy fixes');
	});

	it('rejects unsupported media and resource node types in the suggestions schema', () => {
		expect(
			suggestionObjectSchema.safeParse({
				id: 'image-1',
				content: 'System diagram',
				nodeType: 'imageNode',
				nodePayload: null,
				confidence: 0.8,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: null,
					targetNodeId: null,
					relationshipType: null,
					trigger: 'magic-wand',
				},
				reasoning: 'Unsupported in this route.',
			}).success
		).toBe(false);

		expect(
			suggestionObjectSchema.safeParse({
				id: 'resource-1',
				content: 'Billing playbook',
				nodeType: 'resourceNode',
				nodePayload: null,
				confidence: 0.8,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: null,
					targetNodeId: null,
					relationshipType: null,
					trigger: 'magic-wand',
				},
				reasoning: 'Unsupported in this route.',
			}).success
		).toBe(false);
	});

	it('maps whole-map prompt overflow errors to the explicit full-map message', () => {
		expect(
			getSuggestionStreamErrorMessage({
				error: new Error(
					'This model maximum context length is exceeded because the input is too long.'
				),
				isWholeMapSuggestion: true,
			})
		).toBe(
			'Literal full-map suggestions exceeded the model request limit for this map. Reduce the map size or switch back to a summarized strategy.'
		);

		expect(
			getSuggestionStreamErrorMessage({
				error: new Error('Random upstream failure'),
				isWholeMapSuggestion: false,
			})
		).toBe('Random upstream failure');
	});
});
