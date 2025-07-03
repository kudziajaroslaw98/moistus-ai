import generateUuid from '@/helpers/generate-uuid';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { AiConnectionSuggestion } from '@/types/ai-connection-suggestion';
import type { AiMergeSuggestion } from '@/types/ai-merge-suggestion';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { AvailableNodeTypes } from '@/types/available-node-types';
import type { NodeSuggestion, SuggestionContext } from '@/types/ghost-node';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

interface StreamTrigger {
	id: string; // Unique ID for this request
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
	rawStreamContent: string;
	chunks: unknown[];
	lastProcessedIndex: number; // New state to track stream parsing

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

	generateConnectionSuggestions: () => Promise<void>;
	acceptConnectionSuggestion: (edgeId: string) => Promise<void>;
	rejectConnectionSuggestion: (edgeId: string) => void;
	addConnectionSuggestion: (suggestion: AiConnectionSuggestion) => void;

	generateMergeSuggestions: () => Promise<void>;
	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => void;
	acceptMerge: (suggestion: AiMergeSuggestion) => Promise<void>;
	rejectMerge: (suggestion: AiMergeSuggestion) => void;

	triggerStream: (
		api: string,
		body: Record<string, unknown>,
		onStreamChunk: (chunk: any) => void
	) => void;
	updateStreamContent: (streamId: string, contentChunk: string) => void;
	finishStream: (streamId: string) => void;
	abortStream: (reason: string) => void;

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
	rawStreamContent: '',
	chunks: [],
	lastProcessedIndex: 0,

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => {
		set({ aiFeature: feature });
	},

	addGhostNode: (suggestion: NodeSuggestion) => {
		const { mapId } = get();
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

		set((state) => ({
			ghostNodes: [...state.ghostNodes, ghostNode],
		}));
	},

	removeGhostNode: (nodeId: string) => {
		set((state) => ({
			ghostNodes: state.ghostNodes.filter((node) => node.id !== nodeId),
		}));
	},

	clearGhostNodes: () => {
		set({ ghostNodes: [] });
	},

	acceptSuggestion: async (nodeId: string) => {
		const state = get();
		const ghostNode = state.getGhostNodeById(nodeId);

		if (!ghostNode || !ghostNode.data.metadata) {
			console.warn(`Ghost node with ID ${nodeId} not found`);
			return;
		}

		const ghostMetadata = ghostNode.data.metadata;

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
		// Simply remove the ghost node
		get().removeGhostNode(nodeId);
	},

	generateSuggestions: async (context: SuggestionContext) => {
		const {
			nodes,
			edges,
			mapId,
			addGhostNode,
			clearGhostNodes,
			triggerStream,
		} = get();

		try {
			const suggestionContext = {
				nodes: nodes,
				edges: edges,
				mapId: mapId,
				context,
			};

			console.log('before trigger');

			clearGhostNodes();

			const sourceNode = nodes.find((node) => node.id === context.sourceNodeId);

			// Trigger the stream with a specific callback for handling node suggestions
			triggerStream(
				'/api/ai/suggestions', // Ensure you create this endpoint
				suggestionContext,
				(suggestionChunk: NodeSuggestion & { index: number }) => {
					// This is the callback! It's specific to this action.
					// Here, we can validate the chunk with Zod if desired.
					console.log('chunk', suggestionChunk);

					if (suggestionChunk) {
						addGhostNode({
							...suggestionChunk,
							position: {
								x:
									(sourceNode?.position.x ?? 0) +
									suggestionChunk.index * 300 +
									suggestionChunk.index * 25,
								y:
									(sourceNode?.position.y ?? 0) +
									(sourceNode?.height ?? sourceNode?.data.height ?? 0) +
									50,
							},
						});
					}
				}
			);

			// // Call the AI API endpoint
			// const response = await fetch('/api/ai/suggestions', {
			// 	method: 'POST',
			// 	headers: {
			// 		'Content-Type': 'application/json',
			// 	},
			// 	body: JSON.stringify(suggestionContext),
			// });

			// if (!response.ok) {
			// 	throw new Error(
			// 		`Failed to generate suggestions: ${response.statusText}`
			// 	);
			// }

			// const sourceNode = nodes.find((node) => node.id === context.sourceNodeId);
			// const { suggestions } = await response.json();

			// // Add each suggestion as a ghost node
			// if (suggestions && Array.isArray(suggestions)) {
			// 	suggestions.forEach((suggestion: NodeSuggestion, index) => {
			// 		addGhostNode({
			// 			...suggestion,
			// 			position: {
			// 				x: (sourceNode?.position.x ?? 0) + index * 300 + index * 25,
			// 				y:
			// 					(sourceNode?.position.y ?? 0) +
			// 					(sourceNode?.height ?? sourceNode?.data.height ?? 0) +
			// 					50,
			// 			},
			// 		});
			// 	});
			// }
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

	generateConnectionSuggestions: async () => {
		const { mapId, triggerStream, addConnectionSuggestion } = get();
		set({ isGeneratingSuggestions: true, suggestionError: null });

		try {
			// TEMPORARY: Create test suggestion for debugging
			triggerStream(
				'/api/ai/suggest-connections', // Ensure you create this endpoint
				{ mapId },
				(suggestionChunk: AiConnectionSuggestion) => {
					// This is the callback! It's specific to this action.
					// Here, we can validate the chunk with Zod if desired.
					console.log('chunk', suggestionChunk);

					if (suggestionChunk) {
						addConnectionSuggestion(suggestionChunk);
					}
				}
			);
		} catch (error) {
			console.error('Error generating connection suggestions:', error);
			set({
				suggestionError:
					error instanceof Error
						? error.message
						: 'Failed to generate connection suggestions',
			});
		} finally {
			set({ isGeneratingSuggestions: false });
		}
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
		const { sourceNodeId, targetNodeId, reason } = suggestion;

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
			label: null,
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
				label: null,
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

	generateMergeSuggestions: withLoadingAndToast(
		async (toastId?: string) => {
			const { mapId, edges, triggerStream } = get();

			if (!mapId) {
				// We throw an error here so the HOF can catch it and show a toast.
				throw new Error('A map must be loaded to suggest merges.');
			}

			// Reset previous error state at the start of the operation.
			set({ suggestionError: null });

			try {
				triggerStream(
					'/api/ai/suggest-merges', // Ensure you create this endpoint
					{ mapId },
					(suggestion: AiMergeSuggestion) => {
						// This is the callback! It's specific to this action.
						// Here, we can validate the chunk with Zod if desired.
						console.log('chunk', suggestion);

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
									suggestion,
									confidence: suggestion.confidence || 0.8, // Use score or default
									reason: suggestion.reason || 'AI suggested merge',
									similarityScore: suggestion.similarityScore,
								},
							},
						};

						set((state) => ({
							...state,
							edges: [...state.edges, newEdge], // Clear old merge suggestions and add new ones
						}));
					}
				);
				// // Call our new API route
				// const response = await fetch('/api/ai/suggest-merges', {
				// 	method: 'POST',
				// 	headers: { 'Content-Type': 'application/json' },
				// 	body: JSON.stringify({ mapId }),
				// });

				// if (!response.ok) {
				// 	const errorData = await response.json();
				// 	throw new Error(
				// 		errorData.error || `Server responded with ${response.status}`
				// 	);
				// }

				// const result = await response.json();
				// const suggestions: AiMergeSuggestion[] = result.data.suggestions;

				// if (suggestions && suggestions.length > 0) {
				// 	const newEdges: AppEdge[] = suggestions.map((suggestion) => {
				// 		// Create a new "suggestedMerge" edge for each suggestion
				// 		const edgeId = `merge-suggestion-${suggestion.node1Id}-${suggestion.node2Id}`;
				// 		return {
				// 			id: edgeId,
				// 			source: suggestion.node1Id,
				// 			target: suggestion.node2Id,
				// 			type: 'suggestedMerge', // This matches the key in edgeTypes
				// 			animated: true,
				// 			label: null, // Label is handled inside the component
				// 			data: {
				// 				id: edgeId,
				// 				map_id: mapId,
				// 				user_id: 'system', // AI is the user
				// 				source: suggestion.node1Id,
				// 				target: suggestion.node2Id,
				// 				type: 'suggestedMerge',
				// 				label: null,
				// 				created_at: new Date().toISOString(),
				// 				updated_at: new Date().toISOString(),
				// 				animated: true,
				// 				style: {
				// 					stroke: '#9333ea', // purple-600
				// 					strokeWidth: 2,
				// 					strokeDasharray: '5 5',
				// 				},
				// 				metadata: {
				// 					pathType: 'smoothstep' as const,
				// 					interactionMode: 'both' as const,
				// 				},
				// 				aiData: {
				// 					isSuggested: true,
				// 					suggestion,
				// 					confidence: suggestion.confidence || 0.8, // Use score or default
				// 					reason: suggestion.reason || 'AI suggested merge',
				// 					similarityScore: suggestion.similarityScore,
				// 				},
				// 			},
				// 		};
				// 	});

				// 	set({
				// 		edges: [
				// 			...edges.filter((e) => e.type !== 'suggestedMerge'),
				// 			...newEdges,
				// 		], // Clear old merge suggestions and add new ones
				// 	});

				// Return a success message for the HOF to display
				// 	toast.success(
				// 		`Found ${suggestions.length} potential merge(s) for you to review.`,
				// 		{ id: toastId }
				// 	);
				// } else {
				// 	// Return an info message
				// 	toast.info('No new merge suggestions found.', { id: toastId });
				// }
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
		'isSuggestingMerges',
		{
			initialMessage: 'AI is looking for nodes to merge...',
			errorMessage: 'Failed to get merge suggestions.',
			successMessage: null,
		}
	),
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
			addStateToHistory,
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
		get().rejectMerge(suggestion);
		addStateToHistory('acceptMerge');
	},

	rejectMerge: (suggestion) => {
		set((state) => ({
			mergeSuggestions: state.mergeSuggestions.filter((s) => s !== suggestion),
			edges: state.edges.filter(
				(e) =>
					!(
						e.data.aiData?.suggestion?.node1Id === suggestion.node1Id &&
						e.data.aiData?.suggestion?.node2Id === suggestion.node2Id
					)
			),
		}));
	},

	triggerStream: (api, body, onStreamChunk) => {
		const { isStreaming } = get();

		if (isStreaming === true) {
			return;
		}

		const streamId = `stream_${Date.now()}`;
		set({
			isStreaming: true,
			suggestionError: null,
			rawStreamContent: '',
			lastProcessedIndex: 0, // Reset for new stream
			activeStreamId: streamId,
			streamTrigger: {
				id: streamId,
				api,
				body,
				onStreamChunk, // Store the callback
			},
		});
	},

	updateStreamContent: (streamId, newContent) => {
		if (get().activeStreamId !== streamId) return;

		console.log(newContent);

		set({ rawStreamContent: newContent });

		const { streamTrigger, lastProcessedIndex } = get();
		if (!streamTrigger) return;

		let currentIndex = lastProcessedIndex;
		let updatedIndex = lastProcessedIndex;

		// Skip initial array bracket if present
		if (currentIndex === 0 && newContent.startsWith('[')) {
			currentIndex = 1;
		}

		while (currentIndex < newContent.length) {
			let braceCount = 0;
			let objectStartIndex = -1;

			// Find the start of the next potential object
			for (let i = currentIndex; i < newContent.length; i++) {
				if (newContent[i] === '{') {
					objectStartIndex = i;
					break;
				}
			}

			if (objectStartIndex === -1) break; // No more objects to start parsing

			// Find the end of this object by matching braces
			let objectEndIndex = -1;
			braceCount = 1;

			for (let i = objectStartIndex + 1; i < newContent.length; i++) {
				if (newContent[i] === '{') braceCount++;
				if (newContent[i] === '}') braceCount--;

				if (braceCount === 0) {
					objectEndIndex = i;
					break;
				}
			}

			if (objectEndIndex !== -1) {
				const objectStr = newContent.substring(
					objectStartIndex,
					objectEndIndex + 1
				);

				try {
					const parsedObject = JSON.parse(objectStr);
					// Success! Execute the callback with the parsed object.
					streamTrigger.onStreamChunk(parsedObject);
					// Move the index to process the next part of the stream
					updatedIndex = objectEndIndex + 1;
					currentIndex = updatedIndex;
				} catch (e) {
					// Incomplete JSON object, wait for more data.
					break;
				}
			} else {
				// Incomplete object, break and wait for more data.
				break;
			}
		}

		// Save our parsing progress
		set({ lastProcessedIndex: updatedIndex });
	},

	finishStream: (streamId) => {
		if (get().activeStreamId !== streamId) return;
		// Final parse attempt could be added here if needed, but the current `updateStreamContent` is robust.
		set({
			isStreaming: false,
			activeStreamId: null,
			streamTrigger: null,
			chunks: [],
		});
	},

	abortStream: (reason) => {
		set({
			isStreaming: false,
			suggestionError: reason,
			activeStreamId: null,
			streamTrigger: null,
			chunks: [],
		});
	},

	// Helper methods
	getGhostNodeById: (nodeId: string) => {
		return get().ghostNodes.find((node) => node.id === nodeId);
	},

	hasGhostNodes: () => {
		return get().ghostNodes.length > 0;
	},
});
