/**
 * Parser factory and exports
 * Centralized access to all node parsers with factory pattern
 */

// Export main parser functions
export { parseTaskInput } from './task-parser';
export { parseNoteInput, parseTextInput, parseAnnotationInput, parseQuestionInput } from './content-parsers';
export { parseCodeInput, parseImageInput, parseResourceInput } from './media-parsers';

// Export utility types (no conflicts expected)
export type { PatternType } from './common-utilities';

// Import all parsers for registry
import { parseTaskInput } from './task-parser';
import { parseNoteInput, parseTextInput, parseAnnotationInput, parseQuestionInput } from './content-parsers';
import { parseCodeInput, parseImageInput, parseResourceInput } from './media-parsers';

// Import types
import type {
	ParsedTaskData,
	ParsedNoteData,
	ParsedTextData,
	ParsedAnnotationData,
	ParsedQuestionData,
	ParsedCodeData,
	ParsedImageData,
	ParsedResourceData,
	QuickParser,
} from '../types';
import type { AvailableNodeTypes } from '../../../types/available-node-types';

// Parser registry type
export interface ParserRegistry {
	task: QuickParser<ParsedTaskData>;
	note: QuickParser<ParsedNoteData>;
	text: QuickParser<ParsedTextData>;
	annotation: QuickParser<ParsedAnnotationData>;
	question: QuickParser<ParsedQuestionData>;
	code: QuickParser<ParsedCodeData>;
	image: QuickParser<ParsedImageData>;
	resource: QuickParser<ParsedResourceData>;
	defaultNode: QuickParser<ParsedNoteData>; // Alias for backward compatibility
	taskNode: QuickParser<ParsedTaskData>; // Alias for backward compatibility
	textNode: QuickParser<ParsedTextData>; // Alias for backward compatibility
	annotationNode: QuickParser<ParsedAnnotationData>; // Alias for backward compatibility
	questionNode: QuickParser<ParsedQuestionData>; // Alias for backward compatibility
	codeNode: QuickParser<ParsedCodeData>; // Alias for backward compatibility
	imageNode: QuickParser<ParsedImageData>; // Alias for backward compatibility
	resourceNode: QuickParser<ParsedResourceData>; // Alias for backward compatibility
}

/**
 * Parser registry - maps node types to their parsers
 */
export const parserRegistry: ParserRegistry = {
	task: parseTaskInput,
	note: parseNoteInput,
	text: parseTextInput,
	annotation: parseAnnotationInput,
	question: parseQuestionInput,
	code: parseCodeInput,
	image: parseImageInput,
	resource: parseResourceInput,
	defaultNode: parseNoteInput, // Default node uses note parser
	taskNode: parseTaskInput,
	textNode: parseTextInput,
	annotationNode: parseAnnotationInput,
	questionNode: parseQuestionInput,
	codeNode: parseCodeInput,
	imageNode: parseImageInput,
	resourceNode: parseResourceInput,
};

/**
 * Parser factory - get parser for a specific node type
 */
export const getParserForNodeType = <T = any>(nodeType: AvailableNodeTypes): QuickParser<T> | null => {
	const parser = parserRegistry[nodeType as keyof ParserRegistry];
	return parser as QuickParser<T> || null;
};

/**
 * Parse input using the appropriate parser for node type
 */
export const parseInputForNodeType = <T = any>(nodeType: AvailableNodeTypes, input: string): T | null => {
	const parser = getParserForNodeType<T>(nodeType);
	if (!parser) {
		console.warn(`No parser found for node type: ${nodeType}`);
		return null;
	}
	
	try {
		return parser(input);
	} catch (error) {
		console.error(`Parser error for node type ${nodeType}:`, error);
		return null;
	}
};

/**
 * Check if a parser exists for a node type
 */
export const hasParserForNodeType = (nodeType: AvailableNodeTypes): boolean => {
	return nodeType in parserRegistry;
};

/**
 * Get list of supported node types
 */
export const getSupportedNodeTypes = (): AvailableNodeTypes[] => {
	return Object.keys(parserRegistry) as AvailableNodeTypes[];
};

/**
 * Default parser fallback - uses note parser
 */
export const parseWithFallback = (input: string): ParsedNoteData => {
	try {
		return parseNoteInput(input);
	} catch (error) {
		console.error('Parser fallback error:', error);
		return { content: input || '' };
	}
};