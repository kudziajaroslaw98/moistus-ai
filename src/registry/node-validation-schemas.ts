/**
 * Node Validation Schemas
 *
 * Zod schemas for validating node metadata at runtime.
 * Each node type has a corresponding schema that validates its metadata structure.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════
// BASE SCHEMAS (shared metadata)
// ═══════════════════════════════════════════════

const baseMetadataSchema = z.object({
	// Organization & workflow
	tags: z.array(z.string()).optional(),
	priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
	status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).optional(),
	assignee: z.array(z.string()).optional(),
	dueDate: z.string().optional(),

	// Visual customization
	accentColor: z.string().optional(),
	backgroundColor: z.string().optional(),
	borderColor: z.string().optional(),

	// Grouping
	groupId: z.string().optional(),
	isGroup: z.boolean().optional(),
	groupChildren: z.array(z.string()).optional(),
	groupPadding: z.number().optional(),

	// Layout & display
	isCollapsed: z.boolean().optional(),
	showBackground: z.boolean().optional(),
	label: z.string().optional(),
	title: z.string().optional(),
});

// ═══════════════════════════════════════════════
// NODE-SPECIFIC SCHEMAS
// ═══════════════════════════════════════════════

/**
 * defaultNode (Note) - Basic note with markdown support
 */
const defaultNodeSchema = baseMetadataSchema.extend({});

/**
 * textNode - Formatted text with style controls
 */
const textNodeSchema = baseMetadataSchema.extend({
	fontSize: z.union([z.string(), z.number()]).optional(),
	fontWeight: z.union([z.string(), z.number()]).optional(),
	fontStyle: z.enum(['normal', 'italic']).optional(),
	textAlign: z.enum(['left', 'center', 'right']).optional(),
	textColor: z.string().optional(),
});

/**
 * taskNode - Task list with progress tracking
 */
const taskNodeSchema = baseMetadataSchema.extend({
	tasks: z.array(
		z.object({
			id: z.string(),
			text: z.string(),
			isComplete: z.boolean(),
		})
	),
	dueDate: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

/**
 * imageNode - Display images with captions
 */
const imageNodeSchema = baseMetadataSchema.extend({
	imageUrl: z.string().optional(),
	image_url: z.string().optional(), // Alternative naming for compatibility
	altText: z.string().optional(),
	caption: z.string().optional(),
	showCaption: z.boolean().optional(),
	fitMode: z.enum(['cover', 'contain', 'fill']).optional(),
	aspectRatio: z.number().optional(),
	photographer: z.string().optional(),
	dimensions: z.string().optional(),
	fileSize: z.string().optional(),
	format: z.string().optional(),
	showInfo: z.boolean().optional(),
});

/**
 * resourceNode - External links with previews
 */
const resourceNodeSchema = baseMetadataSchema.extend({
	url: z.string().optional(),
	faviconUrl: z.string().optional(),
	thumbnailUrl: z.string().optional(),
	imageUrl: z.string().optional(),
	summary: z.string().optional(),
	showSummary: z.boolean().optional(),
	showThumbnail: z.boolean().optional(),
	title: z.string().optional(),
	resourceType: z.string().optional(),
});

/**
 * questionNode - Q&A format with AI answers
 */
const questionNodeSchema = baseMetadataSchema.extend({
	// Backward compatibility
	answer: z.string().optional(),
	source: z.string().optional(),

	// Question features
	questionType: z.enum(['binary', 'multiple']).optional(),
	isAnswered: z.boolean().optional(),
	userResponse: z.union([
		z.boolean(),
		z.string(),
		z.array(z.string())
	]).optional(),

	// Response format configuration
	responseFormat: z.object({
		options: z.array(
			z.object({
				id: z.string(),
				label: z.string(),
			})
		).optional(),
		allowMultiple: z.boolean().optional(),
	}).optional(),

	// Response tracking (for collaborative responses)
	responses: z.array(
		z.object({
			userId: z.string().optional(),
			answer: z.union([
				z.boolean(),
				z.string(),
				z.array(z.string())
			]),
			timestamp: z.string(),
		})
	).optional(),
});

/**
 * codeNode - Syntax-highlighted code blocks
 */
const codeNodeSchema = baseMetadataSchema.extend({
	language: z.string().optional(),
	showLineNumbers: z.boolean().optional(),
	fileName: z.string().optional(),
	isExecutable: z.boolean().optional(),
	lastExecuted: z.string().optional(),
	executionTime: z.number().optional(),
});

/**
 * annotationNode - Notes, ideas, and quotes
 */
const annotationNodeSchema = baseMetadataSchema.extend({
	annotationType: z.enum(['note', 'idea', 'quote', 'summary']).optional(),
	fontSize: z.union([z.string(), z.number()]).optional(),
	fontWeight: z.union([z.string(), z.number()]).optional(),
	author: z.string().optional(),
	timestamp: z.string().optional(),
});

/**
 * groupNode - Container for organizing nodes
 */
const groupNodeSchema = baseMetadataSchema.extend({
	isGroup: z.literal(true),
	groupChildren: z.array(z.string()),
	groupPadding: z.number(),
	label: z.string(),
	backgroundColor: z.string().optional(),
	borderColor: z.string().optional(),
});

/**
 * referenceNode - Links to other nodes or maps
 */
const referenceNodeSchema = baseMetadataSchema.extend({
	targetNodeId: z.string().optional(),
	targetMapId: z.string().optional(),
	targetMapTitle: z.string().optional(),
	contentSnippet: z.string().optional(),
});

/**
 * commentNode - Discussion thread nodes
 */
const commentNodeSchema = baseMetadataSchema.extend({
	totalMessages: z.number().default(0),
	participants: z.array(z.string()).default([]),
	lastActivityAt: z.string().optional(),
});

/**
 * ghostNode - AI-generated node suggestions (system-only)
 */
const ghostNodeSchema = z.object({
	suggestedContent: z.string(),
	suggestedType: z.enum([
		'defaultNode',
		'textNode',
		'imageNode',
		'resourceNode',
		'questionNode',
		'annotationNode',
		'codeNode',
		'taskNode',
		'referenceNode',
		'commentNode',
	]),
	confidence: z.number().min(0).max(1),
	context: z.object({
		trigger: z.enum(['magic-wand', 'dangling-edge', 'auto']),
		sourceNodeId: z.string().optional(),
		targetNodeId: z.string().optional(),
		relationshipType: z.string().optional(),
	}).optional(),
});

// ═══════════════════════════════════════════════
// EXPORT SCHEMAS
// ═══════════════════════════════════════════════

export const nodeValidationSchemas = {
	defaultNode: defaultNodeSchema,
	textNode: textNodeSchema,
	taskNode: taskNodeSchema,
	imageNode: imageNodeSchema,
	resourceNode: resourceNodeSchema,
	questionNode: questionNodeSchema,
	codeNode: codeNodeSchema,
	annotationNode: annotationNodeSchema,
	groupNode: groupNodeSchema,
	referenceNode: referenceNodeSchema,
	commentNode: commentNodeSchema,
	ghostNode: ghostNodeSchema,
} as const;

// Type-safe schema access
export type NodeValidationSchemaType = keyof typeof nodeValidationSchemas;

/**
 * Helper function to validate metadata for a specific node type
 */
export function validateNodeMetadata<T extends NodeValidationSchemaType>(
	nodeType: T,
	metadata: unknown
) {
	return nodeValidationSchemas[nodeType].safeParse(metadata);
}

/**
 * Helper function to get schema for a node type
 */
export function getNodeSchema<T extends NodeValidationSchemaType>(
	nodeType: T
): z.ZodType {
	return nodeValidationSchemas[nodeType];
}

export default nodeValidationSchemas;
