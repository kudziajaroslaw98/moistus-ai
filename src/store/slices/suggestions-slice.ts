import type { AiMergeSuggestion } from '@/types/ai-merge-suggestion';
import type { AppNode } from '@/types/app-node';
import type { AvailableNodeTypes } from '@/types/available-node-types';
import type { NodeSuggestion, SuggestionContext } from '@/types/ghost-node';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

export interface SuggestionsSlice {
	// State
	aiFeature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges';
	ghostNodes: AppNode[];
	isGeneratingSuggestions: boolean;
	suggestionError: string | null;
	mergeSuggestions: AiMergeSuggestion[];

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => void;
	addGhostNode: (suggestion: NodeSuggestion) => void;
	removeGhostNode: (nodeId: string) => void;
	clearGhostNodes: () => void;
	acceptSuggestion: (nodeId: string) => Promise<void>;
	rejectSuggestion: (nodeId: string) => void;
	generateSuggestions: (context: SuggestionContext) => Promise<void>;
	generateConnectionSuggestions: () => Promise<void>;
	generateMergeSuggestions: () => Promise<void>;
	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => void;

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

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => {
		set({ aiFeature: feature });
	},
	addGhostNode: (suggestion: NodeSuggestion) => {
		const { mapId } = get();
		const ghostNode: AppNode = {
			id: suggestion.id,
			type: 'ghostNode',
			position: suggestion.position,
			data: {
				id: suggestion.id,
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
		const { nodes, edges, mapId, addGhostNode } = get();

		set({
			isGeneratingSuggestions: true,
			suggestionError: null,
		});

		try {
			const suggestionContext = {
				nodes: nodes,
				edges: edges,
				mapId: mapId,
				context,
			};

			// Call the AI API endpoint
			const response = await fetch('/api/ai/suggestions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(suggestionContext),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to generate suggestions: ${response.statusText}`
				);
			}

			const sourceNode = nodes.find((node) => node.id === context.sourceNodeId);
			const { suggestions } = await response.json();

			// Add each suggestion as a ghost node
			if (suggestions && Array.isArray(suggestions)) {
				suggestions.forEach((suggestion: NodeSuggestion, index) => {
					addGhostNode({
						...suggestion,
						position: {
							x: (sourceNode?.position.x ?? 0) + index * 300 + index * 25,
							y:
								(sourceNode?.position.y ?? 0) +
								(sourceNode?.height ?? sourceNode?.data.height ?? 0) +
								50,
						},
					});
				});
			}
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
		const { nodes, edges, mapId, addEdge } = get();
		set({ isGeneratingSuggestions: true, suggestionError: null });

		try {
			const response = await fetch('/api/ai/suggest-connections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nodes, edges, mapId }),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to generate suggestions: ${response.statusText}`
				);
			}

			const { suggestions } = await response.json();

			if (suggestions && Array.isArray(suggestions)) {
				suggestions.forEach((s) =>
					addEdge(s.source, s.target, { label: s.label })
				);
			}
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

	generateMergeSuggestions: async () => {
		const { nodes, edges, mapId, setMergeSuggestions } = get();
		set({ isGeneratingSuggestions: true, suggestionError: null });

		try {
			const response = await fetch('/api/ai/suggest-merges', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nodes, edges, mapId }),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to generate suggestions: ${response.statusText}`
				);
			}

			const { suggestions } = await response.json();

			if (suggestions && Array.isArray(suggestions)) {
				setMergeSuggestions(suggestions);
			}
		} catch (error) {
			console.error('Error generating merge suggestions:', error);
			set({
				suggestionError:
					error instanceof Error
						? error.message
						: 'Failed to generate merge suggestions',
			});
		} finally {
			set({ isGeneratingSuggestions: false });
		}
	},

	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => {
		set({ mergeSuggestions: suggestions });
	},

	// Helper methods
	getGhostNodeById: (nodeId: string) => {
		return get().ghostNodes.find((node) => node.id === nodeId);
	},

	hasGhostNodes: () => {
		return get().ghostNodes.length > 0;
	},
});
