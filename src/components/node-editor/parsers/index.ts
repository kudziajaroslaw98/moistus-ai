/**
 * Universal Parser Exports
 * Single source of truth for all node parsing functionality
 */

// Export the main universal parser function
export { parseInput } from './common-utilities';

// Export command parser functions (still needed for command system)
export {
	debugParseText,
	detectNodeTypeSwitch,
	detectSlashCommand,
	extractAllCommandTriggers,
	getValidNodeTypeTriggers,
	getValidSlashCommands,
	hasCommandTriggers,
	isValidNodeTypeTrigger,
	isValidSlashCommand,
	processNodeTypeSwitch,
} from './command-parser';

// Export utility functions from common-utilities
export {
	detectLanguageFromContent,
	extractAllPatterns,
	formatColorValue,
	formatDateForDisplay,
	formatPriorityForDisplay,
	hasCheckboxSyntax,
	hasEmbeddedPatterns,
	isValidDateString,
	isValidUrl,
	parseDateString,
} from './common-utilities';

// Export types
export type { ExtractedData, PatternType } from './common-utilities';

// Export command parser types
export type {
	CommandTrigger,
	NodeTypeSwitchResult,
	NodeTypeTrigger,
} from './command-parser';

// Import the universal parser for backward compatibility helpers
import type { AvailableNodeTypes } from '../../../types/available-node-types';
import type { NodeData } from '../../../types/node-data';
import { parseInput } from './common-utilities';

/**
 * Universal parser function - replaces all node-specific parsers
 * @param input - Text input to parse
 * @returns Partial NodeData with universal metadata extraction
 */
export const parseUniversalInput = (input: string): Partial<NodeData> => {
	return parseInput(input);
};

/**
 * Backward compatibility: Parse input for any node type using universal parser
 * @param nodeType - Node type (ignored - universal parsing)
 * @param input - Text input to parse
 * @returns Partial NodeData with universal metadata
 */
export const parseInputForNodeType = (
	nodeType: AvailableNodeTypes,
	input: string
): Partial<NodeData> => {
	// Universal parsing - node type doesn't matter for metadata extraction
	return parseInput(input);
};

/**
 * Check if universal parser can handle input (always true)
 * @param nodeType - Node type (ignored)
 * @returns Always true - universal parser handles all inputs
 */
export const hasParserForNodeType = (nodeType: AvailableNodeTypes): boolean => {
	return true; // Universal parser handles all node types
};

/**
 * Get list of supported node types (all types)
 * @returns All available node types
 */
export const getSupportedNodeTypes = (): AvailableNodeTypes[] => {
	return [
		'defaultNode',
		'taskNode',
		'textNode',
		'annotationNode',
		'questionNode',
		'codeNode',
		'imageNode',
		'resourceNode',
		'groupNode',
		'referenceNode',
	];
};

/**
 * Default parser fallback - uses universal parser
 * @param input - Text input to parse
 * @returns Partial NodeData with universal metadata
 */
export const parseWithFallback = (input: string): Partial<NodeData> => {
	try {
		return parseInput(input);
	} catch (error) {
		console.error('Universal parser error:', error);
		return { content: input || '' };
	}
};
