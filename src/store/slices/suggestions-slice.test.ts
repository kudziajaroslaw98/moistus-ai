import generateUuid from '@/helpers/generate-uuid';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { createSuggestionsSlice } from './suggestions-slice';

jest.mock('@/helpers/generate-uuid', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockGenerateUuid = generateUuid as jest.MockedFunction<typeof generateUuid>;
const mockGenerateUuidString = mockGenerateUuid as unknown as jest.Mock<string, []>;
const SUGGESTION_NOVELTY_STORAGE_KEY = 'mind-map-suggestion-novelty';
const AI_SUGGESTION_EDGE_Z_INDEX = 50_000;
const AI_GHOST_NODE_Z_INDEX = 60_000;

function createNode(
	id: string,
	position: { x: number; y: number },
	height: number
): AppNode {
	return {
		id,
		type: 'defaultNode',
		position,
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: position.x,
			position_y: position.y,
			node_type: 'defaultNode',
			height,
			tags: null,
			created_at: '2026-04-14T00:00:00.000Z',
			updated_at: '2026-04-14T00:00:00.000Z',
		},
		height,
	} as AppNode;
}

function createVisibleNodes(ids: string[]): AppNode[] {
	return ids.map((id, index) =>
		createNode(id, { x: index * 120, y: 0 }, 80)
	);
}

function createGhostNode(
	id: string,
	content: string,
	context: { sourceNodeId?: string | null; trigger?: 'magic-wand' | 'dangling-edge' | 'auto' } = {},
	overrides: {
		suggestedType?: AppNode['data']['node_type'];
		nodePayload?: Record<string, unknown> | null;
	} = {}
): AppNode {
	return {
		id,
		type: 'ghostNode',
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content,
			position_x: 0,
			position_y: 0,
			node_type: 'ghostNode',
			tags: null,
			metadata: {
				suggestedContent: content,
				suggestedType: overrides.suggestedType ?? 'textNode',
				nodePayload: overrides.nodePayload,
				confidence: 0.9,
				context: {
					sourceNodeId: context.sourceNodeId ?? null,
					targetNodeId: null,
					relationshipType: null,
					trigger: context.trigger ?? 'magic-wand',
				},
			},
			created_at: '2026-04-14T00:00:00.000Z',
			updated_at: '2026-04-14T00:00:00.000Z',
		},
	} as AppNode;
}

function createRegularEdge(
	id: string,
	source: string,
	target: string
): AppEdge {
	return {
		id,
		source,
		target,
		type: 'floatingEdge',
		animated: false,
		label: null,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			type: 'floatingEdge',
			label: null,
			created_at: '2026-04-19T00:00:00.000Z',
			updated_at: '2026-04-19T00:00:00.000Z',
			animated: false,
			aiData: {
				isSuggested: false,
			},
		},
	} as AppEdge;
}

function createSuggestedConnectionEdge(
	id: string,
	source: string,
	target: string
): AppEdge {
	return {
		id,
		source,
		target,
		type: 'suggestedConnection',
		animated: false,
		label: 'depends-on',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'system',
			source,
			target,
			type: 'suggestedConnection',
			label: 'depends-on',
			created_at: '2026-04-19T00:00:00.000Z',
			updated_at: '2026-04-19T00:00:00.000Z',
			animated: false,
			metadata: {
				pathType: 'smoothstep',
			},
			aiData: {
				isSuggested: true,
				reason: 'AI suggested connection',
			},
		},
	} as AppEdge;
}

function createSuggestedMergeEdge(
	id: string,
	source: string,
	target: string
): AppEdge {
	return {
		id,
		source,
		target,
		type: 'suggestedMerge',
		animated: true,
		label: null,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'system',
			source,
			target,
			type: 'suggestedMerge',
			label: null,
			created_at: '2026-04-19T00:00:00.000Z',
			updated_at: '2026-04-19T00:00:00.000Z',
			animated: true,
			metadata: {
				pathType: 'smoothstep',
				interactionMode: 'both',
			},
			aiData: {
				isSuggested: true,
				suggestion: {
					node1Id: source,
					node2Id: target,
					reason: 'Merge these',
					confidence: 0.9,
				},
			},
		},
	} as AppEdge;
}

function createSuggestionsSliceHarness(overrides: Record<string, unknown> = {}) {
	let state: Record<string, any> = {
		mapId: 'map-1',
		mindMap: {
			id: 'map-1',
			user_id: 'user-1',
			title: 'Mind Map',
			description: 'Map description',
			created_at: '2026-04-14T00:00:00.000Z',
			updated_at: '2026-04-14T00:00:00.000Z',
		},
		nodes: [],
		edges: [],
		isStreaming: false,
		reactFlowInstance: {
			screenToFlowPosition: jest.fn(() => ({ x: 640, y: 360 })),
		},
		showStreamingToast: jest.fn(),
		updateStreamingToast: jest.fn(),
		setStreamingToastError: jest.fn(),
		hideStreamingToast: jest.fn(),
		setStreamSteps: jest.fn(),
		addNode: jest.fn(),
		addEdge: jest.fn(),
		deleteEdges: jest.fn(),
		deleteNodes: jest.fn(),
		getNode: jest.fn(),
		pendingAnimations: new Map<string, boolean>(),
		completeEdgeAnimation: jest.fn(),
		getVisibleNodes: jest.fn(() => state.nodes),
		...overrides,
	};

	const set = (partial: any) => {
		const patch = typeof partial === 'function' ? partial(state) : partial;
		state = { ...state, ...(patch ?? {}) };
	};

	const get = () => state;
	const slice = createSuggestionsSlice(set as never, get as never, {} as never);
	state = { ...state, ...slice, ...overrides };

	return {
		getState: () => state,
	};
}

function streamSuggestion(
	harness: ReturnType<typeof createSuggestionsSliceHarness>,
	suggestion: Record<string, unknown>
) {
	streamChunk(harness, {
		type: 'data-node-suggestion',
		data: suggestion,
	});
}

function streamChunk(
	harness: ReturnType<typeof createSuggestionsSliceHarness>,
	chunk: Record<string, unknown>
) {
	const streamTrigger = harness.getState().streamTrigger;
	if (!streamTrigger) {
		throw new Error('Expected stream trigger to be initialized');
	}

	streamTrigger.onStreamChunk(chunk);
}

function streamConnectionSuggestion(
	harness: ReturnType<typeof createSuggestionsSliceHarness>,
	suggestion: Record<string, unknown>
) {
	streamChunk(harness, {
		type: 'data-connection-suggestion',
		data: suggestion,
	});
}

function streamMergeSuggestion(
	harness: ReturnType<typeof createSuggestionsSliceHarness>,
	suggestion: Record<string, unknown>
) {
	streamChunk(harness, {
		type: 'data-merge-suggestion',
		data: suggestion,
	});
}

describe('suggestions slice', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		window.localStorage.clear();
	});

	it('anchors map suggestions to the AI-returned source node when it is valid', async () => {
		mockGenerateUuidString.mockReturnValueOnce('ghost-1');
		const harness = createSuggestionsSliceHarness({
			nodes: [
				createNode('request-node', { x: 20, y: 40 }, 60),
				createNode('ai-anchor', { x: 300, y: 200 }, 80),
			],
			edges: [],
		});

		await harness.getState().generateSuggestions({
			sourceNodeId: 'request-node',
			trigger: 'magic-wand',
		});

		streamSuggestion(harness, {
			id: 'suggestion-1',
			content: 'AI suggestion',
			nodeType: 'textNode',
			confidence: 0.9,
			position: { x: 0, y: 0 },
			context: {
				sourceNodeId: 'ai-anchor',
				targetNodeId: null,
				relationshipType: null,
				trigger: 'magic-wand',
			},
		});

		const nextState = harness.getState();

		expect(nextState.ghostNodes).toHaveLength(1);
		expect(nextState.ghostNodes[0].position).toEqual({ x: 300, y: 330 });
		expect(nextState.ghostNodes[0].zIndex).toBe(AI_GHOST_NODE_Z_INDEX);
		expect(nextState.edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'ai-anchor',
					target: 'ghost-1',
				}),
			])
		);
	});

	it('falls back to viewport placement for whole-map suggestions with invalid anchors', async () => {
		mockGenerateUuidString.mockReturnValueOnce('ghost-2');
		const harness = createSuggestionsSliceHarness({
			nodes: [createNode('existing-node', { x: 10, y: 20 }, 70)],
			edges: [],
		});

		await harness.getState().generateSuggestions({
			trigger: 'magic-wand',
		});

		streamSuggestion(harness, {
			id: 'suggestion-2',
			content: 'Floating idea',
			nodeType: 'textNode',
			confidence: 0.85,
			position: { x: 0, y: 0 },
			context: {
				sourceNodeId: 'missing-node',
				targetNodeId: null,
				relationshipType: null,
				trigger: 'magic-wand',
			},
		});

		const nextState = harness.getState();

		expect(nextState.ghostNodes).toHaveLength(1);
		expect(nextState.ghostNodes[0].position).toEqual({ x: 640, y: 360 });
		expect(nextState.edges).toEqual([]);
	});

	it('keeps node-scoped suggestions anchored to the request node and fans out repeated results', async () => {
		mockGenerateUuidString
			.mockReturnValueOnce('ghost-3')
			.mockReturnValueOnce('ghost-4');
		const harness = createSuggestionsSliceHarness({
			nodes: [createNode('source-node', { x: 100, y: 150 }, 70)],
			edges: [],
		});

		await harness.getState().generateSuggestions({
			sourceNodeId: 'source-node',
			trigger: 'magic-wand',
		});

		streamSuggestion(harness, {
			id: 'suggestion-3',
			content: 'First child',
			nodeType: 'textNode',
			confidence: 0.9,
			position: { x: 0, y: 0 },
			context: {
				sourceNodeId: null,
				targetNodeId: null,
				relationshipType: null,
				trigger: 'magic-wand',
			},
		});
		streamSuggestion(harness, {
			id: 'suggestion-4',
			content: 'Second child',
			nodeType: 'textNode',
			confidence: 0.88,
			position: { x: 0, y: 0 },
			context: {
				sourceNodeId: null,
				targetNodeId: null,
				relationshipType: null,
				trigger: 'magic-wand',
			},
		});

		const nextState = harness.getState();

		expect(nextState.ghostNodes).toHaveLength(2);
		expect(nextState.ghostNodes[0].position).toEqual({ x: 100, y: 270 });
		expect(nextState.ghostNodes[1].position).toEqual({ x: 425, y: 270 });
		expect(nextState.edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ source: 'source-node', target: 'ghost-3' }),
				expect.objectContaining({ source: 'source-node', target: 'ghost-4' }),
			])
		);
	});

	it('approves task ghost nodes with checklist metadata instead of empty task shells', async () => {
		mockGenerateUuidString
			.mockReturnValueOnce('approved-node-1')
			.mockReturnValueOnce('approved-task-1')
			.mockReturnValueOnce('approved-task-2');

		const addNode = jest.fn().mockResolvedValue(undefined);
		const addEdge = jest.fn().mockResolvedValue(undefined);
		const harness = createSuggestionsSliceHarness({
			addNode,
			addEdge,
			ghostNodes: [
				createGhostNode(
					'ghost-task-1',
					'Upgrade copy fixes',
					{ sourceNodeId: 'source-node', trigger: 'magic-wand' },
						{
							suggestedType: 'taskNode',
							nodePayload: {
								title: 'Upgrade copy fixes',
								taskTexts: [
									'Explain collaborator limits before the upgrade gate',
									'Show current collaborator count next to the limit',
								],
							},
					}
				),
			],
			pendingAnimations: new Map<string, boolean>(),
		});

		await harness.getState().acceptSuggestion('ghost-task-1');

		expect(addNode).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: 'approved-node-1',
				nodeType: 'taskNode',
				content: '',
				data: {
					metadata: {
						title: 'Upgrade copy fixes',
						status: 'pending',
						tasks: [
							{
								id: 'approved-task-1',
								text: 'Explain collaborator limits before the upgrade gate',
								isComplete: false,
							},
							{
								id: 'approved-task-2',
								text: 'Show current collaborator count next to the limit',
								isComplete: false,
							},
						],
					},
				},
			})
		);
		expect(addEdge).toHaveBeenCalledWith('source-node', 'approved-node-1', {
			label: null,
			animated: false,
		});
		expect(harness.getState().ghostNodes).toEqual([]);
	});

	it('increments click count and rotates lens pairs across repeated clicks', async () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
		const harness = createSuggestionsSliceHarness();

		await harness.getState().generateSuggestions({
			trigger: 'magic-wand',
		});

		const firstBody = harness.getState().streamTrigger?.body as Record<string, unknown>;
		expect(firstBody.clickIndex).toBe(1);
		expect(firstBody.selectedLenses).toHaveLength(2);

		harness.getState().finishStream('stream-1');

		await harness.getState().generateSuggestions({
			trigger: 'magic-wand',
		});

		const secondBody = harness.getState().streamTrigger?.body as Record<
			string,
			unknown
		>;
		expect(secondBody.clickIndex).toBe(2);
		expect(secondBody.selectedLenses).toHaveLength(2);
		expect(secondBody.selectedLenses).not.toEqual(firstBody.selectedLenses);

		randomSpy.mockRestore();
	});

	it('captures current ghost suggestions before clearing them and sends them as recent history', async () => {
		const harness = createSuggestionsSliceHarness({
			nodes: [createNode('source-node', { x: 20, y: 20 }, 60)],
			ghostNodes: [
				createGhostNode('ghost-existing', 'Existing idea', {
					sourceNodeId: 'source-node',
				}),
			],
		});

		await harness.getState().generateSuggestions({
			sourceNodeId: 'source-node',
			trigger: 'magic-wand',
		});

		const body = harness.getState().streamTrigger?.body as Record<string, unknown>;
		expect(body.recentSuggestions).toEqual([
			expect.objectContaining({
				content: 'Existing idea',
				sourceNodeId: 'source-node',
				trigger: 'magic-wand',
			}),
		]);
		expect(harness.getState().ghostNodes).toEqual([]);
	});

	it('restores novelty state per map from localStorage', async () => {
		const firstHarness = createSuggestionsSliceHarness();

		await firstHarness.getState().generateSuggestions({
			trigger: 'magic-wand',
		});
		firstHarness.getState().finishStream('stream-1');

		const storedState = JSON.parse(
			window.localStorage.getItem(
				`${SUGGESTION_NOVELTY_STORAGE_KEY}:map-1`
			) || '{}'
		);
		expect(storedState.clickCount).toBe(1);

		const secondHarness = createSuggestionsSliceHarness();
		await secondHarness.getState().generateSuggestions({
			trigger: 'magic-wand',
		});

		const secondBody = secondHarness.getState().streamTrigger?.body as Record<
			string,
			unknown
		>;
		expect(secondBody.clickIndex).toBe(2);
	});

	it('adds all streamed map-wide connection suggestions in a single run', () => {
		const harness = createSuggestionsSliceHarness({
			nodes: createVisibleNodes(['node-1', 'node-2', 'node-3', 'node-4']),
			edges: [],
		});

		harness.getState().generateConnectionSuggestions();

		streamConnectionSuggestion(harness, {
			sourceNodeId: 'node-1',
			targetNodeId: 'node-2',
			label: 'depends-on',
			reason: 'First connection',
		});
		streamConnectionSuggestion(harness, {
			sourceNodeId: 'node-3',
			targetNodeId: 'node-4',
			label: 'supports',
			reason: 'Second connection',
		});

		const nextState = harness.getState();
		const suggestionEdges = nextState.edges.filter(
			(edge: AppEdge) =>
				edge.type === 'suggestedConnection' &&
				edge.data?.aiData?.isSuggested === true
		);

		expect(suggestionEdges).toHaveLength(2);
		expect(
			suggestionEdges.every((edge: AppEdge) => edge.zIndex === AI_SUGGESTION_EDGE_Z_INDEX)
		).toBe(true);
		expect(
			suggestionEdges.map((edge: AppEdge) => `${edge.source}->${edge.target}`)
		).toEqual(['node-1->node-2', 'node-3->node-4']);
	});

	it('replaces prior connection suggestions on rerun while preserving ghosts and real edges', () => {
		const harness = createSuggestionsSliceHarness({
			nodes: createVisibleNodes([
				'node-1',
				'node-2',
				'node-3',
				'node-4',
				'node-7',
				'node-8',
				'node-9',
				'node-10',
			]),
			ghostNodes: [
				createGhostNode('ghost-connection-context', 'Keep me visible', {
					sourceNodeId: 'source-node',
				}),
			],
			edges: [
				createSuggestedConnectionEdge(
					'old-connection-suggestion',
					'node-1',
					'node-2'
				),
				createRegularEdge('real-edge', 'node-9', 'node-10'),
				createSuggestedMergeEdge('merge-edge', 'node-7', 'node-8'),
			],
		});

		harness.getState().generateConnectionSuggestions();

		let nextState = harness.getState();
		expect(nextState.ghostNodes).toHaveLength(1);
		expect(nextState.edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'real-edge' }),
				expect.objectContaining({ id: 'merge-edge' }),
			])
		);
		expect(nextState.edges).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'old-connection-suggestion' }),
			])
		);

		streamConnectionSuggestion(harness, {
			sourceNodeId: 'node-1',
			targetNodeId: 'node-2',
			label: 'depends-on',
			reason: 'Re-added same pair after cleanup',
		});
		streamConnectionSuggestion(harness, {
			sourceNodeId: 'node-3',
			targetNodeId: 'node-4',
			label: 'supports',
			reason: 'Another fresh pair',
		});

		nextState = harness.getState();
		const suggestionEdges = nextState.edges.filter(
			(edge: AppEdge) =>
				edge.type === 'suggestedConnection' &&
				edge.data?.aiData?.isSuggested === true
		);

		expect(
			suggestionEdges.map((edge: AppEdge) => `${edge.source}->${edge.target}`)
		).toEqual(['node-1->node-2', 'node-3->node-4']);
	});

	it('replaces prior connection suggestions on rerun and still filters node-scoped results', () => {
		const harness = createSuggestionsSliceHarness({
			nodes: createVisibleNodes([
				'focus-node',
				'node-2',
				'node-3',
				'node-4',
				'node-5',
				'node-6',
				'node-7',
			]),
			edges: [
				createSuggestedConnectionEdge(
					'old-node-connection',
					'focus-node',
					'node-2'
				),
				createSuggestedConnectionEdge(
					'old-unrelated-connection',
					'node-3',
					'node-4'
				),
			],
		});

		harness.getState().generateConnectionSuggestions('focus-node');

		streamConnectionSuggestion(harness, {
			sourceNodeId: 'focus-node',
			targetNodeId: 'node-5',
			label: 'supports',
			reason: 'Involves the focused node',
		});
		streamConnectionSuggestion(harness, {
			sourceNodeId: 'node-6',
			targetNodeId: 'node-7',
			label: 'depends-on',
			reason: 'Does not involve the focused node',
		});

		const nextState = harness.getState();
		const suggestionEdges = nextState.edges.filter(
			(edge: AppEdge) =>
				edge.type === 'suggestedConnection' &&
				edge.data?.aiData?.isSuggested === true
		);

		expect(suggestionEdges).toHaveLength(1);
		expect(suggestionEdges[0]).toEqual(
			expect.objectContaining({
				source: 'focus-node',
				target: 'node-5',
			})
		);
	});

	it('proxies hidden connection endpoints to collapsed ancestors and preserves original ids for accept', async () => {
		const collapsedAncestor = createNode('collapsed-parent', { x: 0, y: 0 }, 80);
		collapsedAncestor.data.metadata = {
			...(collapsedAncestor.data.metadata ?? {}),
			isCollapsed: true,
		};
		const hiddenChild = createNode('hidden-child', { x: 0, y: 140 }, 80);
		const visibleNode = createNode('visible-node', { x: 260, y: 0 }, 80);
		const addEdge = jest.fn().mockResolvedValue(undefined);

		const harness = createSuggestionsSliceHarness({
			nodes: [collapsedAncestor, hiddenChild, visibleNode],
			edges: [createRegularEdge('hierarchy', 'collapsed-parent', 'hidden-child')],
			getVisibleNodes: jest.fn(() => [collapsedAncestor, visibleNode]),
			addEdge,
		});

		harness.getState().generateConnectionSuggestions();
		streamConnectionSuggestion(harness, {
			sourceNodeId: 'hidden-child',
			targetNodeId: 'visible-node',
			label: 'depends-on',
			reason: 'Hidden endpoint should proxy',
		});

		const suggestionEdge = harness
			.getState()
			.edges.find((edge: AppEdge) => edge.type === 'suggestedConnection');
		expect(suggestionEdge).toBeDefined();
		expect(suggestionEdge?.zIndex).toBe(AI_SUGGESTION_EDGE_Z_INDEX);
		expect(suggestionEdge?.source).toBe('collapsed-parent');
		expect(suggestionEdge?.target).toBe('visible-node');
		expect(suggestionEdge?.data?.aiData?.connectionProxy).toEqual({
			originalSourceNodeId: 'hidden-child',
			originalTargetNodeId: 'visible-node',
			displaySourceNodeId: 'collapsed-parent',
			displayTargetNodeId: 'visible-node',
			sourceHiddenChildLabel: 'hidden-child',
			targetHiddenChildLabel: undefined,
		});

		await harness.getState().acceptConnectionSuggestion(suggestionEdge!.id);
		expect(addEdge).toHaveBeenCalledWith(
			'hidden-child',
			'visible-node',
			expect.objectContaining({
				aiData: expect.objectContaining({
					isSuggested: false,
					connectionProxy: null,
				}),
			})
		);
	});

	it('does not clear existing connection suggestions when stream trigger is rejected', () => {
		const harness = createSuggestionsSliceHarness({
			nodes: createVisibleNodes(['node-1', 'node-2']),
			edges: [createSuggestedConnectionEdge('existing-suggestion', 'node-1', 'node-2')],
			isStreaming: true,
		});

		harness.getState().generateConnectionSuggestions();

		expect(harness.getState().streamTrigger).toBeNull();
		expect(harness.getState().edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'existing-suggestion' }),
			])
		);
	});

	it('replaces prior merge suggestions on rerun and streams a fresh set', () => {
		const harness = createSuggestionsSliceHarness({
			edges: [
				createSuggestedMergeEdge('old-merge-suggestion', 'node-1', 'node-2'),
				createRegularEdge('real-edge', 'node-9', 'node-10'),
				createSuggestedConnectionEdge(
					'connection-edge',
					'node-7',
					'node-8'
				),
			],
			mergeSuggestions: [
				{
					node1Id: 'node-1',
					node2Id: 'node-2',
					reason: 'Old merge',
					confidence: 0.8,
					similarityScore: 0.8,
				},
			],
		});

		harness.getState().generateMergeSuggestions();

		let nextState = harness.getState();
		expect(nextState.mergeSuggestions).toEqual([]);
		expect(nextState.edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'real-edge' }),
				expect.objectContaining({ id: 'connection-edge' }),
			])
		);
		expect(nextState.edges).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'old-merge-suggestion' }),
			])
		);

		streamMergeSuggestion(harness, {
			node1Id: 'node-1',
			node2Id: 'node-2',
			reason: 'Fresh merge suggestion',
			confidence: 0.91,
			similarityScore: 0.87,
		});
		streamMergeSuggestion(harness, {
			node1Id: 'node-3',
			node2Id: 'node-4',
			reason: 'Second fresh merge suggestion',
			confidence: 0.83,
			similarityScore: 0.79,
		});

		nextState = harness.getState();
		const mergeEdges = nextState.edges.filter(
			(edge: AppEdge) =>
				edge.type === 'suggestedMerge' &&
				edge.data?.aiData?.isSuggested === true
		);

		expect(
			mergeEdges.map((edge: AppEdge) => `${edge.source}->${edge.target}`)
		).toEqual(['node-1->node-2', 'node-3->node-4']);
		expect(
			mergeEdges.every((edge: AppEdge) => edge.zIndex === AI_SUGGESTION_EDGE_Z_INDEX)
		).toBe(true);
	});

	it('does not clear existing merge suggestions when stream trigger is rejected', () => {
		const harness = createSuggestionsSliceHarness({
			edges: [createSuggestedMergeEdge('existing-merge', 'node-1', 'node-2')],
			mergeSuggestions: [
				{
					node1Id: 'node-1',
					node2Id: 'node-2',
					reason: 'Keep existing',
					confidence: 0.8,
					similarityScore: 0.8,
				},
			],
			isStreaming: true,
		});

		harness.getState().generateMergeSuggestions();

		expect(harness.getState().streamTrigger).toBeNull();
		expect(harness.getState().edges).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: 'existing-merge' })])
		);
		expect(harness.getState().mergeSuggestions).toEqual([
			expect.objectContaining({
				node1Id: 'node-1',
				node2Id: 'node-2',
			}),
		]);
	});
});
