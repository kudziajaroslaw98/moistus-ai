/**
 * Node Registry - Public API
 *
 * Central export point for all node registry functionality.
 * Import from '@/registry' to access node types, utilities, and factories.
 */

// ═══════════════════════════════════════════════
// REGISTRY & CONFIGURATION
// ═══════════════════════════════════════════════

export {
	NODE_REGISTRY,
	NodeRegistry,
	type NodeRegistryConfig,
} from './node-registry';

// ═══════════════════════════════════════════════
// TYPES (Derived from Registry)
// ═══════════════════════════════════════════════

export type {
	AvailableNodeTypes,
	ActiveNodeTypes,
	CreatableNodeTypes,
	AISuggestableNodeTypes,
	InlineCreatableNodeTypes,
} from './node-registry';

// ═══════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════

export {
	NodeFactory,
	type CreateNodeOptions,
	type CreateReactFlowNodeOptions,
	// Convenience functions
	createDefaultNode,
	createTextNode,
	createTaskNode,
	createImageNode,
	createResourceNode,
	createQuestionNode,
	createCodeNode,
	createAnnotationNode,
	createGroupNode,
	createReferenceNode,
} from './node-factory';

// ═══════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════

export {
	nodeValidationSchemas,
	validateNodeMetadata,
	getNodeSchema,
	type NodeValidationSchemaType,
} from './node-validation-schemas';

// ═══════════════════════════════════════════════
// RE-EXPORT DEFAULT
// ═══════════════════════════════════════════════

export { default } from './node-registry';
