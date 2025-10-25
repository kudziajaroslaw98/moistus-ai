import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

/**
 * Sibling pattern analysis results
 */
export interface SiblingPatterns {
	commonTags: string[];
	nodeTypes: string[];
	avgContentLength: number;
	topics: string[];
}

/**
 * Enhanced context for multi-level analysis
 */
export interface EnhancedNodeContext {
	// Level 1: Primary node
	primary: AppNode;

	// Level 2: Siblings (nodes with same parent)
	siblings: AppNode[];

	// Level 3: Ancestry (parent and grandparent)
	parent: AppNode | null;
	grandparent: AppNode | null;

	// Sibling patterns analysis
	siblingPatterns: SiblingPatterns;

	// Graph topology metrics
	graphTopology: {
		isIsolated: boolean;
		degree: number; // Total connections (in + out)
		inDegree: number; // Incoming connections
		outDegree: number; // Outgoing connections (children)
		depth: number; // Distance from root
	};
}

/**
 * Configuration for context extraction
 */
export interface ContextExtractionConfig {
	/**
	 * Include sibling analysis (Level 2)
	 * @default true
	 */
	includeSiblings: boolean;

	/**
	 * Include ancestry analysis (Level 3)
	 * @default true
	 */
	includeAncestry: boolean;

	/**
	 * Include graph topology (Level 4)
	 * @default false
	 */
	includeTopology: boolean;

	/**
	 * Maximum number of siblings to analyze
	 * @default 20
	 */
	maxSiblings: number;
}

const DEFAULT_CONFIG: ContextExtractionConfig = {
	includeSiblings: true,
	includeAncestry: true,
	includeTopology: false,
	maxSiblings: 20,
};

/**
 * Performance limits for large maps
 */
const PERFORMANCE_LIMITS = {
	/** Maximum nodes to consider for context analysis */
	MAX_NODES_FOR_ANALYSIS: 1000,
	/** Maximum siblings to analyze */
	MAX_SIBLINGS: 50,
	/** Maximum depth to traverse */
	MAX_DEPTH: 100,
} as const;

/**
 * Safely extract enhanced context with graceful error handling
 *
 * This wrapper function catches errors and returns a minimal fallback context
 * instead of throwing, making it safe to use in UI components.
 *
 * @param nodeId - The ID of the node to analyze
 * @param nodes - All nodes in the mind map
 * @param edges - All edges in the mind map
 * @param config - Optional configuration overrides
 * @returns Enhanced context or minimal fallback on error
 *
 * @example
 * const context = safeExtractEnhancedContext('node-123', nodes, edges);
 * // Never throws - always returns valid context
 */
export function safeExtractEnhancedContext(
	nodeId: string,
	nodes: AppNode[],
	edges: AppEdge[],
	config: Partial<ContextExtractionConfig> = {}
): EnhancedNodeContext | null {
	try {
		return extractEnhancedContext(nodeId, nodes, edges, config);
	} catch (error) {
		console.error(
			`Failed to extract enhanced context for node ${nodeId}:`,
			error
		);

		// Try to find the node for minimal fallback
		const primary = nodes.find((n) => n.id === nodeId);
		if (!primary) {
			// Can't even find the node - return null
			return null;
		}

		// Return minimal fallback context
		return {
			primary,
			siblings: [],
			parent: null,
			grandparent: null,
			siblingPatterns: {
				commonTags: [],
				nodeTypes: [],
				avgContentLength: 0,
				topics: [],
			},
			graphTopology: {
				isIsolated: true,
				degree: 0,
				inDegree: 0,
				outDegree: 0,
				depth: 0,
			},
		};
	}
}

/**
 * Extract enhanced multi-level context for a node
 *
 * This function analyzes a node and its surroundings to provide rich context
 * for AI-powered suggestions. It examines siblings, ancestry, and graph topology
 * to understand the node's position and purpose within the mind map.
 *
 * @param nodeId - The ID of the node to analyze
 * @param nodes - All nodes in the mind map
 * @param edges - All edges in the mind map
 * @param config - Configuration for context extraction
 * @returns Enhanced context with multi-level analysis
 *
 * @throws Error if the node is not found
 *
 * @example
 * const context = extractEnhancedContext('node-123', nodes, edges);
 * console.log(`Node has ${context.siblings.length} siblings`);
 * console.log(`Depth in tree: ${context.graphTopology.depth}`);
 */
export function extractEnhancedContext(
	nodeId: string,
	nodes: AppNode[],
	edges: AppEdge[],
	config: Partial<ContextExtractionConfig> = {}
): EnhancedNodeContext {
	// Validate inputs
	if (!nodeId || typeof nodeId !== 'string') {
		throw new Error('Invalid nodeId: must be a non-empty string');
	}

	if (!Array.isArray(nodes)) {
		throw new Error('Invalid nodes: must be an array');
	}

	if (!Array.isArray(edges)) {
		throw new Error('Invalid edges: must be an array');
	}

	// Handle empty map gracefully
	if (nodes.length === 0) {
		throw new Error('Cannot extract context from empty map (no nodes)');
	}

	// Performance warning for large maps
	if (nodes.length > PERFORMANCE_LIMITS.MAX_NODES_FOR_ANALYSIS) {
		console.warn(
			`Large map detected: ${nodes.length} nodes. Context analysis may be slow. Consider disabling siblings/ancestry for performance.`
		);
	}

	const cfg = {
		...DEFAULT_CONFIG,
		...config,
		// Enforce maximum siblings limit
		maxSiblings: Math.min(
			config.maxSiblings || DEFAULT_CONFIG.maxSiblings,
			PERFORMANCE_LIMITS.MAX_SIBLINGS
		),
	};

	// Find primary node
	const primary = nodes.find((n) => n.id === nodeId);
	if (!primary) {
		throw new Error(`Node with ID ${nodeId} not found in map with ${nodes.length} nodes`);
	}

	// Initialize context
	const context: EnhancedNodeContext = {
		primary,
		siblings: [],
		parent: null,
		grandparent: null,
		siblingPatterns: {
			commonTags: [],
			nodeTypes: [],
			avgContentLength: 0,
			topics: [],
		},
		graphTopology: {
			isIsolated: false,
			degree: 0,
			inDegree: 0,
			outDegree: 0,
			depth: 0,
		},
	};

	// Level 2: Find parent and siblings
	if (cfg.includeSiblings || cfg.includeAncestry) {
		const parentEdge = edges.find((e) => e.target === nodeId);
		if (parentEdge) {
			context.parent = nodes.find((n) => n.id === parentEdge.source) || null;

			// Find siblings (nodes with same parent)
			if (cfg.includeSiblings && context.parent) {
				const siblingEdges = edges
					.filter(
						(e) => e.source === context.parent!.id && e.target !== nodeId
					)
					.slice(0, cfg.maxSiblings);

				context.siblings = siblingEdges
					.map((e) => nodes.find((n) => n.id === e.target))
					.filter((n): n is AppNode => n !== undefined);

				// Analyze sibling patterns
				context.siblingPatterns = analyzeSiblingPatterns(context.siblings);
			}
		}
	}

	// Level 3: Find grandparent
	if (cfg.includeAncestry && context.parent) {
		const grandparentEdge = edges.find((e) => e.target === context.parent!.id);
		if (grandparentEdge) {
			context.grandparent =
				nodes.find((n) => n.id === grandparentEdge.source) || null;
		}
	}

	// Level 4: Calculate graph topology
	if (cfg.includeTopology) {
		context.graphTopology = calculateGraphTopology(nodeId, nodes, edges);
	} else {
		// Basic topology always calculated (for trigger conditions)
		const connections = edges.filter(
			(e) => e.source === nodeId || e.target === nodeId
		);
		const incomingEdges = edges.filter((e) => e.target === nodeId);
		const outgoingEdges = edges.filter((e) => e.source === nodeId);

		context.graphTopology.degree = connections.length;
		context.graphTopology.inDegree = incomingEdges.length;
		context.graphTopology.outDegree = outgoingEdges.length;
		context.graphTopology.isIsolated = connections.length === 0;

		// Calculate depth (distance from root)
		context.graphTopology.depth = calculateNodeDepth(nodeId, edges, nodes);
	}

	return context;
}

/**
 * Analyze patterns across sibling nodes
 */
function analyzeSiblingPatterns(siblings: AppNode[]): SiblingPatterns {
	if (siblings.length === 0) {
		return {
			commonTags: [],
			nodeTypes: [],
			avgContentLength: 0,
			topics: [],
		};
	}

	// Extract all tags from siblings
	const allTags: string[] = siblings.flatMap((s) => (s.data.tags || []) as string[]);
	const tagCounts: Record<string, number> = {};
	allTags.forEach((tag: string) => {
		tagCounts[tag] = (tagCounts[tag] || 0) + 1;
	});

	// Tags that appear in >= 50% of siblings are "common"
	const commonTags = Object.entries(tagCounts)
		.filter(([_, count]) => count >= siblings.length * 0.5)
		.map(([tag]) => tag)
		.sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0)); // Sort by frequency

	// Extract unique node types (filter out undefined)
	const nodeTypes: string[] = Array.from(
		new Set(
			siblings
				.map((s) => s.data.node_type)
				.filter((type): type is NonNullable<typeof type> => type !== undefined)
		)
	);

	// Calculate average content length (handle null content)
	const totalLength = siblings.reduce(
		(sum, s) => sum + (s.data.content?.length || 0),
		0
	);
	const avgContentLength = totalLength / siblings.length;

	// Extract topics (filter out null content)
	const contentStrings = siblings
		.map((s) => s.data.content)
		.filter((content): content is string => !!content);
	const topics = extractTopics(contentStrings);

	return {
		commonTags,
		nodeTypes,
		avgContentLength,
		topics,
	};
}

/**
 * Calculate graph topology metrics for a node
 */
function calculateGraphTopology(
	nodeId: string,
	nodes: AppNode[],
	edges: AppEdge[]
): EnhancedNodeContext['graphTopology'] {
	const incomingEdges = edges.filter((e) => e.target === nodeId);
	const outgoingEdges = edges.filter((e) => e.source === nodeId);
	const allConnections = edges.filter(
		(e) => e.source === nodeId || e.target === nodeId
	);

	const inDegree = incomingEdges.length;
	const outDegree = outgoingEdges.length;
	const degree = allConnections.length;
	const isIsolated = degree === 0;

	// Calculate depth (distance from root)
	const depth = calculateNodeDepth(nodeId, edges, nodes);

	return {
		isIsolated,
		degree,
		inDegree,
		outDegree,
		depth,
	};
}

/**
 * Calculate the depth of a node in the tree (distance from root)
 */
function calculateNodeDepth(
	nodeId: string,
	edges: AppEdge[],
	nodes: AppNode[]
): number {
	let depth = 0;
	let currentNodeId = nodeId;
	const visited = new Set<string>();

	// Walk up the tree until we reach a root node (no parent) or detect a cycle
	while (true) {
		// Prevent infinite loops in case of cycles
		if (visited.has(currentNodeId)) {
			console.warn(
				`Cycle detected in graph while calculating depth for node ${nodeId}`
			);
			break;
		}
		visited.add(currentNodeId);

		// Find parent edge
		const parentEdge = edges.find((e) => e.target === currentNodeId);
		if (!parentEdge) {
			// Reached root node (no parent)
			break;
		}

		depth++;
		currentNodeId = parentEdge.source;

		// Safety: max depth limit to prevent infinite loops
		if (depth > PERFORMANCE_LIMITS.MAX_DEPTH) {
			console.warn(
				`Maximum depth (${PERFORMANCE_LIMITS.MAX_DEPTH}) reached while calculating depth for node ${nodeId}. Possible cycle or very deep tree.`
			);
			break;
		}
	}

	return depth;
}

/**
 * Extract main topics from content (simple frequency-based approach)
 *
 * This is a basic implementation that could be enhanced with:
 * - TF-IDF scoring
 * - Stopword filtering
 * - Stemming/lemmatization
 * - Named entity recognition
 */
function extractTopics(contents: string[], maxTopics: number = 5): string[] {
	// Combine all content
	const combined = contents.join(' ').toLowerCase();

	// Remove common stop words
	const stopWords = new Set([
		'the',
		'a',
		'an',
		'and',
		'or',
		'but',
		'in',
		'on',
		'at',
		'to',
		'for',
		'of',
		'with',
		'by',
		'from',
		'is',
		'are',
		'was',
		'were',
		'be',
		'been',
		'being',
		'have',
		'has',
		'had',
		'do',
		'does',
		'did',
		'will',
		'would',
		'should',
		'could',
		'can',
		'may',
		'might',
		'must',
		'this',
		'that',
		'these',
		'those',
		'it',
		'its',
	]);

	// Extract words (alphanumeric only, 3+ chars)
	const words = combined.match(/\b[a-z0-9]{3,}\b/g) || [];

	// Count word frequency (excluding stop words)
	const wordCounts = words
		.filter((w) => !stopWords.has(w))
		.reduce(
			(acc, word) => {
				acc[word] = (acc[word] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

	// Get top N words
	const topics = Object.entries(wordCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxTopics)
		.map(([word]) => word);

	return topics;
}

/**
 * Build a context summary string for AI prompts
 *
 * This formats the enhanced context into a human-readable string
 * suitable for inclusion in AI prompts.
 *
 * @param context - The enhanced context to format
 * @returns A formatted string describing the context
 */
export function buildContextPrompt(context: EnhancedNodeContext): string {
	const lines: string[] = [];

	// Primary node
	lines.push('**Primary Node:**');
	lines.push(`Content: "${context.primary.data.content}"`);
	lines.push(`Type: ${context.primary.data.node_type}`);
	const primaryTags = (context.primary.data.tags || []) as string[];
	if (primaryTags.length > 0) {
		lines.push(`Tags: ${primaryTags.join(', ')}`);
	}
	lines.push('');

	// Siblings
	if (context.siblings.length > 0) {
		lines.push('**Sibling Nodes (same parent):**');
		context.siblings.slice(0, 5).forEach((sibling) => {
			lines.push(`- ${sibling.data.content} (${sibling.data.node_type})`);
		});
		if (context.siblings.length > 5) {
			lines.push(`... and ${context.siblings.length - 5} more siblings`);
		}
		lines.push('');
	}

	// Hierarchy
	if (context.parent || context.grandparent) {
		lines.push('**Hierarchy:**');
		if (context.grandparent) {
			lines.push(`Grandparent: ${context.grandparent.data.content}`);
		}
		if (context.parent) {
			lines.push(`Parent: ${context.parent.data.content}`);
		}
		lines.push('');
	}

	// Graph position
	lines.push('**Graph Position:**');
	lines.push(`Depth: ${context.graphTopology.depth}`);
	lines.push(`Connections: ${context.graphTopology.degree} total`);
	if (context.graphTopology.isIsolated) {
		lines.push('Status: Isolated (no connections)');
	}
	lines.push('');

	// Patterns
	if (context.siblingPatterns.commonTags.length > 0) {
		lines.push('**Patterns:**');
		lines.push(`Common sibling tags: ${context.siblingPatterns.commonTags.join(', ')}`);
	}
	if (context.siblingPatterns.topics.length > 0) {
		lines.push(`Topics: ${context.siblingPatterns.topics.join(', ')}`);
	}

	return lines.join('\n');
}

/**
 * Check if a node should trigger suggestions based on context
 *
 * This applies the trigger conditions defined in the suggestion config
 * to determine if auto-suggestions should fire.
 *
 * @param context - The enhanced context for the node
 * @param condition - The trigger condition function
 * @returns Whether the trigger should fire
 */
export function shouldTriggerSuggestion(
	context: EnhancedNodeContext,
	condition?: (node: { id: string; children: number; degree: number }) => boolean
): boolean {
	if (!condition) {
		return true; // No condition means always trigger
	}

	return condition({
		id: context.primary.id,
		children: context.graphTopology.outDegree,
		degree: context.graphTopology.degree,
	});
}
