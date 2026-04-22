'use client';

import useAppStore from '@/store/mind-map-store';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { SuggestionContext, NodeSuggestion } from '@/types/ghost-node';
import { useCallback, useState } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

const suggestionRouteNodeTypes = [
	'defaultNode',
	'textNode',
	'taskNode',
	'questionNode',
	'annotationNode',
	'codeNode',
] as const;

// Schema for ghost node suggestion validation
// Mirrors the safe typed-node contract for /api/ai/suggestions
const ghostNodeSuggestionSchema = z.object({
	suggestions: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			nodeType: z.enum(suggestionRouteNodeTypes),
			nodePayload: z
				.object({
					title: z.string().nullable().optional(),
					tasks: z.array(z.string()).nullable().optional(),
					answer: z.string().nullable().optional(),
					questionType: z.enum(['binary', 'multiple']).nullable().optional(),
					annotationType: z
						.enum([
							'note',
							'idea',
							'quote',
							'summary',
							'warning',
							'success',
							'info',
							'error',
						])
						.nullable()
						.optional(),
					language: z.string().nullable().optional(),
					fileName: z.string().nullable().optional(),
				})
				.nullable()
				.optional(),
			confidence: z.number().min(0).max(1),
			position: z.object({
				x: z.number(),
				y: z.number(),
			}),
			context: z.object({
				sourceNodeId: z.string().nullable().optional(),
				targetNodeId: z.string().nullable().optional(),
				relationshipType: z.string().nullable().optional(),
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
							nodeType: suggestion.nodeType as AvailableNodeTypes,
							position, // Use the provided position
						} as NodeSuggestion);
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
