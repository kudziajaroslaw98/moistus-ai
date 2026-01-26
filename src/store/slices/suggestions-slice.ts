import generateUuid from '@/helpers/generate-uuid';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { AiConnectionSuggestion } from '@/types/ai-connection-suggestion';
import type { AiMergeSuggestion } from '@/types/ai-merge-suggestion';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeSuggestion, SuggestionContext } from '@/types/ghost-node';
import {
	DEFAULT_SUGGESTION_CONFIG,
	type PartialSuggestionConfig,
	type SuggestionConfig,
} from '@/types/suggestion-config';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

interface StreamTrigger {
	id: string | null; // Unique ID for this request
	body: Record<string, unknown>;
	api: string; // The API endpoint to hit
	onStreamChunk: (chunk: unknown) => void;
}

export interface SuggestionsSlice {
	// State
	aiFeature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges';
	ghostNodes: AppNode[];
	isGeneratingSuggestions: boolean;
	suggestionError: string | null;
	mergeSuggestions: AiMergeSuggestion[];
	isStreaming: boolean;
	streamingError: string | null;

	activeStreamId: string | null;
	streamTrigger: StreamTrigger | null;
	chunks: unknown[];
	streamingAPI: string | null;
	stopStreamCallback: (() => void) | null;

	// Configuration and timing (new)
	suggestionConfig: SuggestionConfig;
	lastTriggerTime: number;
	pendingAnimations: Map<string, boolean>;

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => void;
	removeGhostNode: (nodeId: string) => void;
	addGhostNode: (suggestion: NodeSuggestion) => void;
	clearGhostNodes: () => void;

	generateSuggestions: (context: SuggestionContext) => Promise<void>;
	acceptSuggestion: (nodeId: string) => Promise<void>;
	rejectSuggestion: (nodeId: string) => void;

	generateConnectionSuggestions: (sourceNodeId?: string) => void;
	acceptConnectionSuggestion: (edgeId: string) => Promise<void>;
	rejectConnectionSuggestion: (edgeId: string) => void;
	addConnectionSuggestion: (suggestion: AiConnectionSuggestion) => void;

	generateMergeSuggestions: (sourceNodeId?: string) => void;
	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => void;
	acceptMerge: (suggestion: AiMergeSuggestion) => Promise<void>;
	rejectMerge: (suggestion: AiMergeSuggestion) => void;

	// Counterpoints
	generateCounterpointsForNode: (nodeId: string) => void;

	triggerStream: (
		api: string,
		body: Record<string, unknown>,
		onStreamChunk: (chunk: any) => void
	) => void;
	finishStream: (streamId: string) => void;
	abortStream: (reason: string) => void;
	stopStream: () => void;
	setStopStreamCallback: (callback: () => void) => void;

	// Configuration and animation management (new)
	updateSuggestionConfig: (config: PartialSuggestionConfig) => void;
	canTriggerSuggestion: () => boolean;
	startEdgeAnimation: (edgeId: string) => void;
	completeEdgeAnimation: (edgeId: string) => void;
	isAnimationPending: (edgeId: string) => boolean;

	// Helper methods
	getGhostNodeById: (nodeId: string) => AppNode | undefined;
	hasGhostNodes: () => boolean;
}

export const createSuggestionsSlice: StateCreator<
	AppState,
	[],
	[],
	SuggestionsSlice
> = (set, get) => ({
	// Initial state
	aiFeature: 'suggest-nodes',
	ghostNodes: [],
	isGeneratingSuggestions: false,
	suggestionError: null,
	mergeSuggestions: [],
	isStreaming: false,
	streamingError: null,

	activeStreamId: null,
	streamTrigger: null,
	chunks: [],
	streamingAPI: null,
	stopStreamCallback: null,

	// Configuration and timing (new)
	suggestionConfig: DEFAULT_SUGGESTION_CONFIG,
	lastTriggerTime: 0,
	pendingAnimations: new Map(),

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => {
		set({ aiFeature: feature });
	},

	addGhostNode: (suggestion: NodeSuggestion) => {
		const { mapId, edges } = get();
		const ghostId = generateUuid();
		const ghostNode: AppNode = {
			id: ghostId,
			type: 'ghostNode',
			position: suggestion.position,
			data: {
				id: ghostId,
				map_id: mapId || '',
				parent_id: null,
				content: suggestion.content,
				position_x: suggestion.position.x,
				position_y: suggestion.position.y,
				node_type: 'ghostNode',
				width: null,
				height: null,
				tags: null,
				status: null,
				importance: null,
				sourceUrl: null,
				metadata: {
					suggestedContent: suggestion.content,
					suggestedType: suggestion.nodeType,
					confidence: suggestion.confidence,
					context: suggestion.context,
					sourceNodeName: suggestion.sourceNodeName,
				},
				aiData: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			draggable: false,
			selectable: false,
			deletable: false,
			connectable: true,
		};

		// Auto-create animated ghost edge if source node exists
		const newEdges = [...edges];
		if (suggestion.context.sourceNodeId) {
			const ghostEdgeId = `ghost-edge-${suggestion.context.sourceNodeId}-${ghostId}`;
			const ghostEdge: AppEdge = {
				id: ghostEdgeId,
				source: suggestion.context.sourceNodeId,
				target: ghostId,
				type: 'animatedGhostEdge',
				animated: true,
				style: {
					stroke: 'rgba(168, 85, 247, 0.6)', // Purple color for ghost edges
					strokeWidth: 2,
					strokeDasharray: '5 5',
				},
				markerEnd: 'arrowclosed',
				data: {
					id: ghostEdgeId,
					map_id: mapId || '',
					user_id: 'system',
					source: suggestion.context.sourceNodeId,
					target: ghostId,
					type: 'animatedGhostEdge',
					label: suggestion.context.relationshipType || null,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					animated: true,
					markerEnd: 'arrowclosed',
					style: {
						stroke: 'rgba(168, 85, 247, 0.6)',
						strokeWidth: 2,
						strokeDasharray: '5 5',
					},
					metadata: {
						pathType: 'smoothstep' as const,
						isGhostEdge: true, // Mark as ghost edge for cleanup
					},
					aiData: {
						isSuggested: true,
					},
				},
			};
			newEdges.push(ghostEdge);
		}

		set((state) => ({
			ghostNodes: [...state.ghostNodes, ghostNode],
			edges: newEdges,
		}));
	},

	removeGhostNode: (nodeId: string) => {
		set((state) => ({
			ghostNodes: state.ghostNodes.filter((node) => node.id !== nodeId),
			// Also remove any ghost edges connected to this node
			edges: state.edges.filter(
				(edge) =>
					!(
						edge.data?.metadata?.isGhostEdge &&
						(edge.source === nodeId || edge.target === nodeId)
					)
			),
		}));
	},

	clearGhostNodes: () => {
		set((state) => ({
			ghostNodes: [],
			// Also clear all ghost edges
			edges: state.edges.filter((edge) => !edge.data?.metadata?.isGhostEdge),
		}));
	},

	acceptSuggestion: async (nodeId: string) => {
		const state = get();
		const ghostNode = state.getGhostNodeById(nodeId);

		if (!ghostNode || !ghostNode.data.metadata) {
			console.warn(`Ghost node with ID ${nodeId} not found`);
			return;
		}

		const ghostMetadata = ghostNode.data.metadata;

		// Clean up any pending animations for edges connected to this ghost node
		const edges = state.edges.filter(
			(edge) => edge.source === nodeId || edge.target === nodeId
		);

		edges.forEach((edge) => {
			if (state.pendingAnimations.has(edge.id)) {
				state.completeEdgeAnimation(edge.id);
			}
		});

		// Add the new node to the main nodes array using the proper method signature
		await state.addNode({
			parentNode: null,
			content: ghostMetadata.suggestedContent,
			nodeType: ghostMetadata.suggestedType as AvailableNodeTypes,
			position: { x: ghostNode.position.x, y: ghostNode.position.y },
			data: {},
		});

		// Remove the ghost node
		state.removeGhostNode(nodeId);

		// If there's a connection context, create the edge
		if (ghostMetadata.context?.sourceNodeId) {
			// Find the newly created node to get its actual ID
			const newlyCreatedNode = state.nodes.find(
				(node) =>
					node.data.content === ghostMetadata.suggestedContent &&
					node.position.x === ghostNode.position.x &&
					node.position.y === ghostNode.position.y
			);

			if (newlyCreatedNode) {
				await state.addEdge(
					ghostMetadata.context.sourceNodeId,
					newlyCreatedNode.id,
					{
						label: ghostMetadata.context.relationshipType || null,
						edge_type: 'default',
						animated: false,
						marker_end: 'arrowclosed',
					}
				);
			}
		}
	},

	rejectSuggestion: (nodeId: string) => {
		const state = get();

		// Clean up any pending animations for edges connected to this ghost node
		const edges = state.edges.filter(
			(edge) => edge.source === nodeId || edge.target === nodeId
		);

		edges.forEach((edge) => {
			if (state.pendingAnimations.has(edge.id)) {
				state.completeEdgeAnimation(edge.id);
			}
		});

		// Remove the ghost node
		state.removeGhostNode(nodeId);
	},

	generateSuggestions: async (context: SuggestionContext) => {
		const {
			nodes,
			edges,
			mapId,
			addGhostNode,
			clearGhostNodes,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			hideStreamingToast,
			setStreamSteps,
		} = get();

		set({
			streamingAPI: '/api/ai/suggestions',
		});

		try {
			const suggestionContext = {
				nodes: nodes,
				edges: edges,
				mapId: mapId,
				context,
			};

			// Clear any existing ghost nodes before generating new suggestions
			clearGhostNodes();

			const sourceNode = nodes.find((node) => node.id === context.sourceNodeId);

			// Define the specific chunk handler for THIS process
			const handleChunk = (chunk: any) => {
				if (!chunk || !chunk.type) return;

				switch (chunk.type) {
					case 'data-stream-info':
						if (chunk.data?.steps) {
							setStreamSteps(chunk.data.steps);
						}

						break;

					case 'data-stream-status':
						if (chunk.data.error) {
							setStreamingToastError(chunk.data.error);
						} else {
							updateStreamingToast(chunk.data);
						}

						break;

					case 'data-node-suggestion':
						if (chunk.data) {
							const suggestionChunk = chunk.data;
							addGhostNode({
								...suggestionChunk,
								position: {
									x:
										(sourceNode?.position.x ?? 0) +
										(suggestionChunk.index || 0) * 300 +
										(suggestionChunk.index || 0) * 25,
									y:
										(sourceNode?.position.y ?? 0) +
										(sourceNode?.height ?? sourceNode?.data.height ?? 0) +
										50,
								},
							});
						}

						break;

					default:
						// Ignore 'start' or other event types if no action is needed
						break;
				}
			};

			// Show the initial toast
			showStreamingToast('Generating Node Suggestions');

			// Trigger the stream with a specific callback for handling node suggestions
			triggerStream(
				'/api/ai/suggestions', // Ensure you create this endpoint
				suggestionContext,
				handleChunk
			);
		} catch (error) {
			console.error('Error generating suggestions:', error);
			set({
				suggestionError:
					error instanceof Error
						? error.message
						: 'Failed to generate suggestions',
			});
		} finally {
			set({ isGeneratingSuggestions: false });
		}
	},

	generateConnectionSuggestions: (sourceNodeId?: string) => {
		const {
			mapId,
			triggerStream,
			clearGhostNodes,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			hideStreamingToast,
			addConnectionSuggestion,
			setStreamSteps,
		} = get();

		if (!mapId) {
			console.error('Cannot suggest connections without a mapId.');
			return;
		}

		// 1. Define the specific chunk handler for THIS process.
		// This function knows how to interpret the data from the stream.
		// If sourceNodeId is provided, filter suggestions to only include
		// connections where the source or target matches that node.
		const handleChunk = (chunk: any) => {
			if (!chunk || !chunk.type) return;

			switch (chunk.type) {
				case 'data-stream-info':
					if (chunk.data?.steps) {
						setStreamSteps(chunk.data.steps);
					}

					break;
				// This is a status update for our toast UI.
				case 'data-stream-status':
					if (chunk.data.error) {
						setStreamingToastError(chunk.data.error);
					} else {
						updateStreamingToast(chunk.data);
					}

					break;

				// This is a streamed AI-generated object.
				case 'data-connection-suggestion':
					// If sourceNodeId provided, filter to only connections involving that node
					if (sourceNodeId) {
						const suggestion = chunk.data;
						if (
							suggestion.sourceNodeId === sourceNodeId ||
							suggestion.targetNodeId === sourceNodeId
						) {
							addConnectionSuggestion(suggestion);
						}
					} else {
						addConnectionSuggestion(chunk.data);
					}
					break;

				default:
					// Ignore 'start' or other event types if no action is needed
					break;
			}
		};

		// 2. Clear previous suggestions and show the initial toast
		clearGhostNodes();
		showStreamingToast(
			sourceNodeId ? 'Finding Node Connections' : 'Suggesting Connections'
		);

		// 3. Trigger the generic stream mediator.
		// Pass sourceNodeId in the body for potential API-side filtering
		triggerStream(
			'/api/ai/suggest-connections', // The API endpoint to call
			{ mapId, sourceNodeId }, // The body for the request
			handleChunk // The specific callback to process the stream data
		);
	},

	acceptConnectionSuggestion: async (edgeId: string) => {
		const { edges, addEdge } = get();
		const edge = edges.find((e) => e.id === edgeId);

		if (!edge?.data?.aiData?.isSuggested) {
			console.warn(`Edge ${edgeId} is not a suggestion or not found`);
			return;
		}

		const connectionId = generateUuid();

		try {
			// Convert suggestion to regular edge
			await addEdge(edge.source, edge.target, {
				...edge.data,
				id: connectionId,
				aiData: {
					...edge.data.aiData,
					isSuggested: false,
				},
				style: {
					...edge.data.style,
					stroke: '#6c757d', // Regular edge color
				},
			});

			// Remove the suggestion edge
			get().rejectConnectionSuggestion(edgeId);
		} catch (error) {
			console.error('Failed to accept connection suggestion:', error);
			throw error;
		}
	},

	rejectConnectionSuggestion: (edgeId: string) => {
		const { edges } = get();
		const edge = edges.find((e) => e.id === edgeId);

		if (edge) {
			set({ edges: edges.filter((e) => e.id !== edgeId) });
		}
	},

	addConnectionSuggestion: (suggestion: AiConnectionSuggestion) => {
		const { edges, mapId } = get();
		const { sourceNodeId, targetNodeId, reason, label } = suggestion;

		// Check if suggestion already exists
		const existingEdge = edges.find(
			(e) =>
				e.source === sourceNodeId &&
				e.target === targetNodeId &&
				e.data?.aiData?.isSuggested
		);

		if (existingEdge) {
			console.warn('Connection suggestion already exists, skipping');
			return;
		}

		// Create suggestion edge
		const suggestionEdge: AppEdge = {
			id: `suggestion-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
			source: sourceNodeId,
			target: targetNodeId,
			type: 'suggestedConnection',
			animated: false,
			label: label,
			style: {
				stroke: '#f59e0b',
				strokeWidth: 2,
			},
			markerEnd: 'arrowclosed',
			data: {
				id: `suggestion-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
				map_id: mapId || '',
				user_id: 'system', // AI suggestions are system-generated
				source: sourceNodeId,
				target: targetNodeId,
				type: 'suggestedConnection',
				label: label,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				animated: false,
				markerEnd: 'arrowclosed',
				style: {
					stroke: '#f59e0b',
					strokeWidth: 2,
				},
				metadata: {
					pathType: 'smoothstep' as const,
				},
				aiData: {
					isSuggested: true,
					reason: reason || 'AI suggested connection',
				},
			},
		};

		// Add to edges array
		set((state) => ({
			edges: [...state.edges, suggestionEdge],
		}));
	},

	generateCounterpointsForNode: (nodeId: string) => {
		const {
			nodes,
			edges,
			mapId,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			setStreamSteps,
			addGhostNode,
		} = get();

		if (!mapId) {
			console.error('Cannot generate counterpoints without a mapId.');
			return;
		}

		const sourceNode = nodes.find((n) => n.id === nodeId);

		const handleChunk = (chunk: any) => {
			if (!chunk || !chunk.type) return;

			switch (chunk.type) {
				case 'data-stream-info':
					if (chunk.data?.steps) setStreamSteps(chunk.data.steps);
					break;
				case 'data-stream-status':
					if (chunk.data?.error) setStreamingToastError(chunk.data.error);
					else updateStreamingToast(chunk.data);
					break;
				case 'data-node-suggestion':
					if (chunk.data) {
						const suggestion = chunk.data;
						addGhostNode({
							...suggestion,
							position: {
								x:
									(sourceNode?.position.x ?? 0) +
									(suggestion.index || 0) * 300 +
									(suggestion.index || 0) * 25,
								y:
									(sourceNode?.position.y ?? 0) +
									(sourceNode?.height ?? sourceNode?.data.height ?? 0) +
									50,
							},
						});
					}
					break;
				default:
					break;
			}
		};

		showStreamingToast('Generating Counterpoints');

		const body = {
			nodes,
			edges,
			mapId,
			context: { sourceNodeId: nodeId, trigger: 'magic-wand' as const },
		};

		triggerStream('/api/ai/counterpoints', body, handleChunk);
	},

	generateMergeSuggestions: (sourceNodeId?: string) => {
		const {
			mapId,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			setStreamSteps,
		} = get();

		if (!mapId) {
			// We throw an error here so the HOF can catch it and show a toast.
			throw new Error('A map must be loaded to suggest merges.');
		}

		// Reset previous error state at the start of the operation.
		set({ suggestionError: null });

		try {
			// Define the specific chunk handler for merge suggestions
			// If sourceNodeId is provided, filter suggestions to only include
			// merges where node1 or node2 matches that node.
			const handleChunk = (chunk: any) => {
				if (!chunk || !chunk.type) return;

				switch (chunk.type) {
					case 'data-stream-info':
						setStreamSteps(chunk.data.steps);

						break;

					case 'data-stream-status':
						if (chunk.data.error) {
							setStreamingToastError(chunk.data.error);
						} else {
							updateStreamingToast(chunk.data);
						}

						break;

					case 'data-merge-suggestion':
						const suggestion = chunk.data;

						// If sourceNodeId provided, filter to only merges involving that node
						if (sourceNodeId) {
							if (
								suggestion.node1Id !== sourceNodeId &&
								suggestion.node2Id !== sourceNodeId
							) {
								// Skip suggestions that don't involve the source node
								break;
							}
						}

						const edgeId = `merge-suggestion-${suggestion.node1Id}-${suggestion.node2Id}`;
						const newEdge = {
							id: edgeId,
							source: suggestion.node1Id,
							target: suggestion.node2Id,
							type: 'suggestedMerge', // This matches the key in edgeTypes
							animated: true,
							label: null, // Label is handled inside the component
							data: {
								id: edgeId,
								map_id: mapId,
								user_id: 'system', // AI is the user
								source: suggestion.node1Id,
								target: suggestion.node2Id,
								type: 'suggestedMerge',
								label: null,
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString(),
								animated: true,
								style: {
									stroke: '#9333ea', // purple-600
									strokeWidth: 2,
									strokeDasharray: '5 5',
								},
								metadata: {
									pathType: 'smoothstep' as const,
									interactionMode: 'both' as const,
								},
								aiData: {
									isSuggested: true,
									suggestion: {
										node1Id: suggestion.node1Id,
										node2Id: suggestion.node2Id,
										confidence: suggestion.confidence || 0.8,
										reason: suggestion.reason || 'AI suggested merge',
										similarityScore: suggestion.similarityScore,
									},
								},
							},
						};

						set((state) => ({
							...state,
							edges: [...state.edges, newEdge], // Clear old merge suggestions and add new ones
						}));

						break;

					default:
						// Ignore 'start' or other event types if no action is needed
						break;
				}
			};

			// Show the initial toast
			showStreamingToast(
				sourceNodeId ? 'Finding Similar Nodes' : 'Suggesting Node Merges'
			);

			// Pass sourceNodeId in the body for potential API-side filtering
			triggerStream(
				'/api/ai/suggest-merges', // Ensure you create this endpoint
				{ mapId, sourceNodeId },
				handleChunk
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to generate merge suggestions.';
			console.error(errorMessage, error);
			set({ suggestionError: errorMessage });

			// Re-throw the error to be caught by the HOF
			throw new Error(errorMessage);
		}
	},
	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => {
		set({ mergeSuggestions: suggestions });
	},

	acceptMerge: async (suggestion) => {
		const {
			nodes,
			edges,
			updateNode,
			deleteNodes,
			deleteEdges,
		} = get();

		const nodeToKeep = nodes.find((n) => n.id === suggestion.node1Id);
		const nodeToRemove = nodes.find((n) => n.id === suggestion.node2Id);

		if (!nodeToKeep || !nodeToRemove) {
			console.error('Nodes for merge not found');
			return;
		}

		// 1. Merge content
		const mergedContent = `${nodeToKeep.data.content}\n\n---\n*Merged from "${nodeToRemove.data.content}"*`;
		await updateNode({
			nodeId: nodeToKeep.id,
			data: { content: mergedContent },
		});

		// 2. Re-parent children of the removed node
		const edgesToReparent = edges.filter((e) => e.source === nodeToRemove.id);

		for (const edge of edgesToReparent) {
			// Create a new edge from the kept node to the child
			await get().addEdge(nodeToKeep.id, edge.target, {});
		}

		// 3. Delete the now-merged node and its associated edges
		const edgesToDelete = edges.filter(
			(e) => e.source === nodeToRemove.id || e.target === nodeToRemove.id
		);
		await deleteEdges(edgesToDelete);
		await deleteNodes([nodeToRemove]);

		// 4. Clean up the suggestion from the UI
		// (History is tracked via underlying operations: updateNode, deleteEdges, deleteNodes)
		get().rejectMerge(suggestion);
	},

	rejectMerge: (suggestion) => {
		set((state) => ({
			mergeSuggestions: state.mergeSuggestions.filter((s) => s !== suggestion),
			edges: state.edges.filter(
				(e: AppEdge) =>
					!(
						e.data?.aiData?.suggestion?.node1Id === suggestion.node1Id &&
						e.data?.aiData?.suggestion?.node2Id === suggestion.node2Id
					)
			),
		}));
	},

	triggerStream: (api, body, onStreamChunk) => {
		const { isStreaming, canTriggerSuggestion } = get();

		if (isStreaming === true) {
			return;
		}

		// Check throttling (except for manual triggers)
		const isSuggestionAPI = api.includes('/suggestions') || api.includes('/suggest-');
		if (isSuggestionAPI && !canTriggerSuggestion()) {
			console.log('Suggestion trigger throttled - too soon since last trigger');
			return;
		}

		const streamId = `stream_${Date.now()}`;
		set({
			isStreaming: true,
			suggestionError: null,
			activeStreamId: streamId,
			streamTrigger: {
				id: streamId,
				api,
				body,
				onStreamChunk, // Store the callback
			},
			streamingAPI: api,
			lastTriggerTime: Date.now(), // Update trigger time
		});
	},

	finishStream: () => {
		get().hideStreamingToast();
		set({
			isStreaming: false,
			activeStreamId: null,
			streamTrigger: null,
			streamingAPI: null,
			chunks: [],
			stopStreamCallback: null,
		});
	},

	abortStream: (reason) => {
		get().hideStreamingToast();
		set({
			isStreaming: false,
			suggestionError: reason,
			activeStreamId: null,
			streamTrigger: null,
			streamingAPI: null,
			chunks: [],
			stopStreamCallback: null,
		});
	},

	stopStream: () => {
		const { stopStreamCallback } = get();
		if (stopStreamCallback) {
			stopStreamCallback();
		}
		get().hideStreamingToast();
		set({
			isStreaming: false,
			activeStreamId: null,
			streamTrigger: null,
			streamingAPI: null,
			chunks: [],
			stopStreamCallback: null,
		});
	},

	setStopStreamCallback: (callback) => {
		set({ stopStreamCallback: callback });
	},

	// Configuration and animation management
	updateSuggestionConfig: (config: PartialSuggestionConfig) => {
		set((state) => ({
			suggestionConfig: {
				...state.suggestionConfig,
				...config,
				timing: { ...state.suggestionConfig.timing, ...config.timing },
				quality: { ...state.suggestionConfig.quality, ...config.quality },
				context: { ...state.suggestionConfig.context, ...config.context },
				animation: {
					...state.suggestionConfig.animation,
					...config.animation,
					easing: {
						...state.suggestionConfig.animation.easing,
						...config.animation?.easing,
					},
				},
				triggers: config.triggers || state.suggestionConfig.triggers,
			},
		}));
	},

	canTriggerSuggestion: () => {
		const state = get();
		const { lastTriggerTime, suggestionConfig, isStreaming } = state;

		// Don't trigger if already streaming
		if (isStreaming) {
			return false;
		}

		// Check if enough time has passed since last trigger
		const now = Date.now();
		const timeSinceLastTrigger = now - lastTriggerTime;

		return (
			timeSinceLastTrigger >= suggestionConfig.timing.minTimeBetweenSuggestions
		);
	},

	startEdgeAnimation: (edgeId: string) => {
		set((state) => {
			const newMap = new Map(state.pendingAnimations);
			newMap.set(edgeId, true);
			return { pendingAnimations: newMap };
		});
	},

	completeEdgeAnimation: (edgeId: string) => {
		set((state) => {
			const newMap = new Map(state.pendingAnimations);
			newMap.delete(edgeId);
			return { pendingAnimations: newMap };
		});
	},

	isAnimationPending: (edgeId: string) => {
		return get().pendingAnimations.has(edgeId);
	},

	// Helper methods
	getGhostNodeById: (nodeId: string) => {
		return get().ghostNodes.find((node) => node.id === nodeId);
	},

	hasGhostNodes: () => {
		return get().ghostNodes.length > 0;
	},
});
