'use client';

import useAppStore from '@/store/mind-map-store';
import type { SuggestionContext } from '@/types/ghost-node';
import { useCallback, useState } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

// Schema for ghost node suggestion validation
const ghostNodeSuggestionSchema = z.object({
	suggestions: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			nodeType: z.enum([
				'defaultNode',
				'textNode',
				'imageNode',
				'resourceNode',
				'questionNode',
				'annotationNode',
				'codeNode',
				'taskNode',
				'builderNode',
			] as const),
			confidence: z.number().min(0).max(1),
			position: z.object({
				x: z.number(),
				y: z.number(),
			}),
			context: z.object({
				sourceNodeId: z.string().optional(),
				targetNodeId: z.string().optional(),
				relationshipType: z.string().optional(),
				trigger: z.enum(['magic-wand', 'dangling-edge', 'auto']),
			}),
			reasoning: z.string().optional(),
		})
	),
});

export function useNodeSuggestion() {
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		nodes,
		edges,
		mapId,
		addGhostNode,
		clearGhostNodes,
		generateSuggestions,
		generateConnectionSuggestions,
		generateMergeSuggestions,
		reactFlowInstance,
	} = useAppStore(
		useShallow((state) => ({
			nodes: state.nodes,
			edges: state.edges,
			mapId: state.mapId,
			addGhostNode: state.addGhostNode,
			clearGhostNodes: state.clearGhostNodes,
			generateSuggestions: state.generateSuggestions,
			generateConnectionSuggestions: state.generateConnectionSuggestions,
			generateMergeSuggestions: state.generateMergeSuggestions,
			reactFlowInstance: state.reactFlowInstance,
		}))
	);

	const generateSuggestionsForNode = useCallback(
		async (
			nodeId: string,
			trigger: 'magic-wand' | 'dangling-edge' | 'auto' = 'magic-wand'
		) => {
			try {
				const context: SuggestionContext = {
					sourceNodeId: nodeId,
					trigger,
				};

				generateSuggestions(context);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to generate suggestions';
				setError(errorMessage);
				console.error('Error generating suggestions:', err);
			}
		},
		[reactFlowInstance, mapId, generateSuggestions]
	);

	const generateSuggestionsForPosition = useCallback(
		async (
			position: { x: number; y: number },
			trigger: 'magic-wand' | 'dangling-edge' | 'auto' = 'auto',
			sourceNodeId?: string,
			relationshipType?: string
		) => {
			if (!reactFlowInstance || !mapId) {
				setError('ReactFlow instance or map ID is not available');
				return;
			}

			setIsGenerating(true);
			setError(null);

			try {
				const context: SuggestionContext = {
					sourceNodeId,
					relationshipType,
					trigger,
				};

				// Override the generateSuggestions to use custom position
				const suggestionContext = {
					nodes,
					edges,
					mapId,
					context,
					position, // Custom position for dangling edge suggestions
				};

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

				const data = await response.json();
				const validatedData = ghostNodeSuggestionSchema.parse(data);

				// Add each suggestion as a ghost node with the custom position
				if (
					validatedData.suggestions &&
					Array.isArray(validatedData.suggestions)
				) {
					validatedData.suggestions.forEach((suggestion) => {
						addGhostNode({
							...suggestion,
							position, // Use the provided position
						});
					});
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to generate suggestions';
				setError(errorMessage);
				console.error('Error generating suggestions:', err);
			} finally {
				setIsGenerating(false);
			}
		},
		[reactFlowInstance, mapId, nodes, edges, addGhostNode]
	);

	const generateSuggestionsForConnection = useCallback(
		async (
			sourceNodeId: string,
			targetPosition: { x: number; y: number },
			relationshipType?: string
		) => {
			return generateSuggestionsForPosition(
				targetPosition,
				'dangling-edge',
				sourceNodeId,
				relationshipType
			);
		},
		[generateSuggestionsForPosition]
	);

	const generateInitialSuggestions = useCallback(async () => {
		if (!mapId) {
			setError('Map ID is not available');
			return;
		}

		setIsGenerating(true);
		setError(null);

		try {
			await generateConnectionSuggestions();
			await generateMergeSuggestions();
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: 'Failed to generate initial suggestions';
			setError(errorMessage);
			console.error('Error generating initial suggestions:', err);
		} finally {
			setIsGenerating(false);
		}
	}, [mapId, generateConnectionSuggestions, generateMergeSuggestions]);

	const clearAllSuggestions = useCallback(() => {
		clearGhostNodes();
		setError(null);
	}, [clearGhostNodes]);

	const retry = useCallback(() => {
		setError(null);
	}, []);

	return {
		// State
		isGenerating,
		error,
		hasError: !!error,

		// Methods
		generateSuggestionsForNode,
		generateSuggestionsForPosition,
		generateSuggestionsForConnection,
		generateInitialSuggestions,
		clearAllSuggestions,
		retry,

		// Utilities
		canGenerateSuggestions: !!reactFlowInstance && !!mapId,
	};
}
