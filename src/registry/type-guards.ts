/**
 * Type Guards for Node Registry Types
 *
 * Runtime type validation utilities for node types derived from the registry.
 * These guards provide type-safe runtime checks with TypeScript narrowing.
 */

import { NODE_REGISTRY } from './node-registry';
import type {
	AvailableNodeTypes,
	ActiveNodeTypes,
	CreatableNodeTypes,
	AISuggestableNodeTypes,
	InlineCreatableNodeTypes,
} from './node-registry';

/**
 * Type guard: Check if a value is a valid AvailableNodeTypes
 *
 * @param value - Value to check
 * @returns True if value is a valid node type from the registry
 *
 * @example
 * ```ts
 * const nodeType = "defaultNode";
 * if (isAvailableNodeType(nodeType)) {
 *   // nodeType is AvailableNodeTypes
 *   const config = NODE_REGISTRY[nodeType];
 * }
 * ```
 */
export function isAvailableNodeType(value: unknown): value is AvailableNodeTypes {
	return typeof value === 'string' && value in NODE_REGISTRY;
}

/**
 * Type guard: Check if a value is an active (non-deprecated) node type
 *
 * @param value - Value to check
 * @returns True if value is an active node type
 */
export function isActiveNodeType(value: unknown): value is ActiveNodeTypes {
	return (
		isAvailableNodeType(value) &&
		(NODE_REGISTRY[value].status as string) !== 'deprecated'
	);
}

/**
 * Type guard: Check if a value is a user-creatable node type
 *
 * @param value - Value to check
 * @returns True if value is a user-creatable node type
 */
export function isCreatableNodeType(value: unknown): value is CreatableNodeTypes {
	return (
		isAvailableNodeType(value) &&
		NODE_REGISTRY[value].availability.userCreatable
	);
}

/**
 * Type guard: Check if a value is an AI-suggestable node type
 *
 * @param value - Value to check
 * @returns True if value is an AI-suggestable node type
 */
export function isAISuggestableNodeType(
	value: unknown
): value is AISuggestableNodeTypes {
	return (
		isAvailableNodeType(value) &&
		NODE_REGISTRY[value].availability.aiSuggestable
	);
}

/**
 * Type guard: Check if a value is an inline-creatable node type
 *
 * @param value - Value to check
 * @returns True if value is an inline-creatable node type
 */
export function isInlineCreatableNodeType(
	value: unknown
): value is InlineCreatableNodeTypes {
	return (
		isAvailableNodeType(value) &&
		NODE_REGISTRY[value].availability.inlineCreatable
	);
}

/**
 * Assert that a value is a valid AvailableNodeTypes, throwing if invalid
 *
 * @param value - Value to assert
 * @param context - Optional context for error message
 * @throws TypeError if value is not a valid node type
 *
 * @example
 * ```ts
 * try {
 *   assertAvailableNodeType(userInput, "onNodeTypeChange");
 *   // userInput is now typed as AvailableNodeTypes
 * } catch (error) {
 *   console.error(error.message); // "Invalid node type 'xyz' in onNodeTypeChange"
 * }
 * ```
 */
export function assertAvailableNodeType(
	value: unknown,
	context?: string
): asserts value is AvailableNodeTypes {
	if (!isAvailableNodeType(value)) {
		const contextMsg = context ? ` in ${context}` : '';
		throw new TypeError(
			`Invalid node type '${String(value)}'${contextMsg}. Expected one of: ${Object.keys(NODE_REGISTRY).join(', ')}`
		);
	}
}

/**
 * Assert with logging: Validates node type and logs assertion result
 *
 * @param value - Value to assert
 * @param context - Optional context for logging
 * @returns True if value is AvailableNodeTypes, false otherwise
 *
 * @example
 * ```ts
 * if (assertAvailableNodeTypeWithLog(event.detail?.nodeType, "handleNodeTypeChange")) {
 *   // Logs: "xyz is AvailableNodeTypes"
 *   onNodeTypeChange(event.detail.nodeType);
 * }
 * ```
 */
export function assertAvailableNodeTypeWithLog(
	value: unknown,
	context?: string
): value is AvailableNodeTypes {
	const isValid = isAvailableNodeType(value);

	if (isValid) {
		console.log(`${String(value)} is AvailableNodeTypes`);
	} else {
		const contextMsg = context ? ` (${context})` : '';
		console.warn(
			`${String(value)} is NOT AvailableNodeTypes${contextMsg}. Valid types: ${Object.keys(NODE_REGISTRY).join(', ')}`
		);
	}

	return isValid;
}
