import { createNodeContextExtractor } from '@/helpers/extract-node-context';
import { createClient } from '@/helpers/supabase/server';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Zod schema for connection suggestion validation
const connectionSuggestionSchema = z.object({
	suggestions: z.array(
		z.object({
			id: z.string(),
			sourceNodeId: z.string(),
			targetNodeId: z.string(),
			label: z.string().nullable(),
			reason: z.string(),
			confidence: z.number().min(0).max(1),
			relationshipType: z.enum([
				'related-to',
				'leads-to',
				'is-example-of',
				'depends-on',
				'contradicts',
				'supports',
				'elaborates-on',
				'summarizes',
				'implements',
				'extends',
				'references',
				'causes',
				'prevents',
				'enables',
				'questions',
				'answers',
			]),
			metadata: z.object({
				strength: z.enum(['weak', 'moderate', 'strong']),
				bidirectional: z.boolean(),
				contextualRelevance: z.number().min(0).max(1),
			}),
		})
	),
});

// Request body validation schema
const requestBodySchema = z.object({
	mapId: z.string(),
});

// Set maximum duration for the API route
export const maxDuration = 30;

export async function POST(request: Request) {
	try {
		const body = await request.json();

		// Validate request body
		const validationResult = requestBodySchema.safeParse(body);

		if (!validationResult.success) {
			return Response.json(
				{
					error: 'Invalid request data',
					details: validationResult.error.issues,
				},
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		const { mapId } = validationResult.data;

		const { data: map_graph_aggregated_view, error } = await supabase
			.from('map_graph_aggregated_view')
			.select('nodes,edges')
			.eq('map_id', mapId)
			.single();

		if (map_graph_aggregated_view === null || error) {
			return Response.json(
				{
					error: 'Map not found',
					details: error.message,
				},
				{ status: 404 }
			);
		}

		console.table(map_graph_aggregated_view);

		const { nodes, edges } = map_graph_aggregated_view;

		// Validate minimum requirements
		if (!nodes || nodes.length < 2) {
			return Response.json(
				{
					suggestions: [],
					message: 'At least 2 nodes required for connection suggestions',
				},
				{ status: 200 }
			);
		}

		// Build comprehensive context for AI analysis
		const suggestionContext = buildConnectionContext(
			nodes as AppNode[],
			edges as AppEdge[]
		);

		// Create existing connections set for deduplication
		const existingConnections = new Set<string>(
			edges.map((edge: AppEdge) => `${edge.source}->${edge.target}`)
		);

		// Generate connection suggestions using AI with streaming
		//

		console.log('Generating connection suggestions...');

		const result = generateObject({
			model: openai('o4-mini'),
			output: 'object',
			schema: connectionSuggestionSchema,
			messages: [
				{
					role: 'system',
					content: CONNECTION_SUGGESTION_PROMPT,
				},
				{
					role: 'user',
					content: `
						Mind Map Context:
						${suggestionContext}

						Existing Connections:
						${formatExistingConnections(edges as AppEdge[], nodes as AppNode[])}

						Context Parameters:
						- Max Suggestions: ${5}

						Please suggest meaningful connections between nodes that don't already exist.
					`,
				},
			],
		});

		console.dir(result, { depth: 0 });

		// For now, we'll collect the final result instead of streaming
		// This can be converted to true streaming later if needed
		const finalResult = await result;

		console.log('Final results ', finalResult);

		// Post-process suggestions
		const processedSuggestions = await postProcessSuggestions(
			finalResult.object.suggestions || [],
			nodes as AppNode[],
			existingConnections
		);

		return Response.json({
			suggestions: processedSuggestions,
			metadata: {
				totalNodes: nodes.length,
				existingConnections: edges.length,
				suggestionsGenerated: processedSuggestions.length,
			},
		});
	} catch (error) {
		console.error('Error generating connection suggestions:', error);

		return Response.json(
			{
				error: 'Failed to generate connection suggestions',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

/**
 * Builds comprehensive context for AI connection analysis
 */
function buildConnectionContext(nodes: AppNode[], edges: AppEdge[]): string {
	// Use the extract-node-context helper for rich node information
	const maxConnections = 5;
	const nodeContextExtractor = createNodeContextExtractor({
		// Use default extractors for all node types
	});

	let contextString = '';

	// Add detailed node information
	contextString += 'NODES ANALYSIS:\n';
	contextString += '==================\n';

	nodes.forEach((node, index) => {
		const nodeContext = nodeContextExtractor(node);
		contextString += `${index + 1}. ${nodeContext}\n`;
	});

	contextString += '\n';

	// Add connection pattern analysis
	if (edges.length > 0) {
		contextString += 'EXISTING CONNECTION PATTERNS:\n';
		contextString += '============================\n';

		const connectionPatterns = analyzeConnectionPatterns(nodes, edges);
		contextString += connectionPatterns;
		contextString += '\n';
	}

	// Add semantic clustering analysis
	const semanticClusters = identifySemanticClusters(nodes);

	if (semanticClusters.length > 0) {
		contextString += 'SEMANTIC CLUSTERS:\n';
		contextString += '==================\n';
		semanticClusters.forEach((cluster, index) => {
			contextString += `Cluster ${index + 1}: ${cluster.theme}\n`;
			contextString += `Nodes: ${cluster.nodeIds.join(', ')}\n`;
			contextString += `Strength: ${cluster.strength}\n\n`;
		});
	}

	return contextString;
}

/**
 * Analyzes existing connection patterns to understand the mind map structure
 */
function analyzeConnectionPatterns(nodes: AppNode[], edges: AppEdge[]): string {
	const patterns = [];

	// Count connection types
	const connectionTypes = new Map<string, number>();
	const nodeConnections = new Map<string, number>();

	edges.forEach((edge) => {
		const label = edge.data?.label || 'unlabeled';
		connectionTypes.set(label, (connectionTypes.get(label) || 0) + 1);

		nodeConnections.set(
			edge.source,
			(nodeConnections.get(edge.source) || 0) + 1
		);
		nodeConnections.set(
			edge.target,
			(nodeConnections.get(edge.target) || 0) + 1
		);
	});

	// Find highly connected nodes (hubs)
	const hubs = Array.from(nodeConnections.entries())
		.filter(([_, count]) => count >= 3)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3);

	if (hubs.length > 0) {
		patterns.push('Hub Nodes (highly connected):');
		hubs.forEach(([nodeId, count]) => {
			const node = nodes.find((n) => n.id === nodeId);
			patterns.push(
				`  - ${node?.data?.content || nodeId}: ${count} connections`
			);
		});
	}

	// Connection type frequency
	if (connectionTypes.size > 0) {
		patterns.push('\nConnection Types:');
		Array.from(connectionTypes.entries())
			.sort(([, a], [, b]) => b - a)
			.forEach(([type, count]) => {
				patterns.push(`  - ${type}: ${count} instances`);
			});
	}

	return patterns.join('\n');
}

/**
 * Identifies semantic clusters based on node content and types
 */
function identifySemanticClusters(nodes: AppNode[]): Array<{
	theme: string;
	nodeIds: string[];
	strength: number;
}> {
	const clusters: Array<{
		theme: string;
		nodeIds: string[];
		strength: number;
	}> = [];

	// Group by node type
	const typeGroups = new Map<string, AppNode[]>();
	nodes.forEach((node) => {
		const type = node.data?.node_type || 'default';

		if (!typeGroups.has(type)) {
			typeGroups.set(type, []);
		}

		typeGroups.get(type)!.push(node);
	});

	// Create clusters for groups with 2+ nodes
	typeGroups.forEach((groupNodes, type) => {
		if (groupNodes.length >= 2) {
			clusters.push({
				theme: `${type} nodes`,
				nodeIds: groupNodes.map((n) => n.id),
				strength: Math.min(groupNodes.length / nodes.length, 1),
			});
		}
	});

	// Group by tags if available
	const tagGroups = new Map<string, AppNode[]>();
	nodes.forEach((node) => {
		const tags = node.data?.tags || [];
		tags.forEach((tag) => {
			if (!tagGroups.has(tag)) {
				tagGroups.set(tag, []);
			}

			tagGroups.get(tag)!.push(node);
		});
	});

	tagGroups.forEach((groupNodes, tag) => {
		if (groupNodes.length >= 2) {
			clusters.push({
				theme: `${tag} themed`,
				nodeIds: groupNodes.map((n) => n.id),
				strength: Math.min(groupNodes.length / nodes.length, 1),
			});
		}
	});

	return clusters?.slice(0, 5); // Limit to top 5 clusters
}

/**
 * Formats existing connections for AI context
 */
function formatExistingConnections(edges: AppEdge[], nodes: AppNode[]): string {
	if (edges.length === 0) {
		return 'No existing connections.';
	}

	const formatted = edges.map((edge) => {
		const sourceNode = nodes.find((n) => n.id === edge.source);
		const targetNode = nodes.find((n) => n.id === edge.target);
		const label = edge.data?.label ? ` (${edge.data.label})` : '';

		return `${sourceNode?.data?.content || edge.source} → ${targetNode?.data?.content || edge.target}${label}`;
	});

	return formatted.join('\n');
}

/**
 * Post-processes AI suggestions to ensure quality and validity
 */
async function postProcessSuggestions(
	suggestions: any[],
	nodes: AppNode[],
	existingConnections: Set<string>
): Promise<any[]> {
	const validNodeIds = new Set(nodes.map((n) => n.id));

	return suggestions
		.filter((suggestion) => {
			// Validate node IDs exist
			if (
				!validNodeIds.has(suggestion.sourceNodeId) ||
				!validNodeIds.has(suggestion.targetNodeId)
			) {
				return false;
			}

			// Ensure not self-connection
			if (suggestion.sourceNodeId === suggestion.targetNodeId) {
				return false;
			}

			// Check for duplicate connections
			const connectionKey = `${suggestion.sourceNodeId}->${suggestion.targetNodeId}`;
			const reverseKey = `${suggestion.targetNodeId}->${suggestion.sourceNodeId}`;

			return (
				!existingConnections.has(connectionKey) &&
				!existingConnections.has(reverseKey)
			);
		})
		.map((suggestion) => ({
			...suggestion,
			id:
				suggestion.id ||
				`connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		}))
		.sort((a, b) => b.confidence - a.confidence) // Sort by confidence
		.slice(0, 8); // Limit to top 8 suggestions
}

// Comprehensive AI prompt for connection suggestions
const CONNECTION_SUGGESTION_PROMPT = `
You are an expert min
d mapping AI specializing in identifying meaningful connections between concepts, ideas, and information nodes. Your task is to analyze a mind map and suggest intelligent connections that enhance understanding and reveal insights.

## Core Principles

1. **Semantic Relationships**: Identify connections based on meaning, not just surface-level similarities
2. **Cognitive Flow**: Suggest connections that support natural thinking patterns and knowledge building
3. **Insight Generation**: Prioritize connections that reveal new perspectives or deepen understanding
4. **Contextual Relevance**: Consider the overall theme and purpose of the mind map
5. **Avoiding Redundancy**: Never suggest connections that already exist or are obvious duplicates

## Connection Types & Relationship Analysis

**Logical Relationships:**
- 'leads-to': Causal or sequential relationships
- 'depends-on': Dependencies and prerequisites
- 'causes' / 'prevents': Direct causal impact
- 'enables': Facilitation or empowerment

**Conceptual Relationships:**
- 'related-to': General semantic similarity
- 'is-example-of': Specific-to-general abstraction
- 'elaborates-on': Detailed explanation or expansion
- 'summarizes': Condensation or abstraction
- 'extends': Building upon or enhancing

**Analytical Relationships:**
- supports/contradicts: Agreement or disagreement
- questions/answers: Inquiry and resolution
- references: Citation or allusion
- implements: Practical application

## Quality Metrics

**Confidence Scoring (0.0-1.0):**
- **0.9-1.0**: Extremely strong semantic relationship, high value
- **0.7-0.9**: Strong conceptual connection, clear benefit
- **0.5-0.7**: Moderate relationship, some value
- **0.3-0.5**: Weak connection, speculative
- **0.0-0.3**: Very weak, avoid suggesting

**Connection Strength:**
- **strong**: Direct, obvious, high-impact relationships
- **moderate**: Meaningful but less obvious connections
- **weak**: Subtle or tangential relationships

**Contextual Relevance (0.0-1.0):**
- How well the connection fits the overall mind map theme
- Consider user intent and focus areas

## Analysis Strategy

1. **Content Analysis**: Extract key concepts, themes, and semantic markers
2. **Structural Analysis**: Identify patterns, clusters, and gaps in existing connections
3. **Contextual Analysis**: Consider node types, metadata, and user focus
4. **Relationship Mapping**: Find meaningful semantic relationships between unconnected nodes
5. **Quality Filtering**: Prioritize high-confidence, high-value connections

## Response Guidelines

- Suggest 3-8 connections maximum, prioritizing quality over quantity
- Provide clear, concise reasoning for each suggestion
- Use appropriate relationship types from the defined taxonomy
- Include bidirectional flag when relationships work both ways
- Ensure diverse connection types when possible
- Focus on connections that add genuine insight or understanding

## Avoid These Common Mistakes

- Surface-level keyword matching without semantic understanding
- Obvious or trivial connections that don't add value
- Duplicate or near-duplicate existing connections
- Self-referential connections
- Connections between incompatible node types without clear rationale
- Generic "related-to" labels when more specific relationships exist

Generate thoughtful, meaningful connections that enhance the user's understanding and reveal new insights about their mind map content.
`;
