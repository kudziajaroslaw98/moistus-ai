/**
 * Parser factory and exports
 * Centralized access to all node parsers with factory pattern
 */

// Export all parser modules
export * from './date-parser';
export * from './common-utilities';
export * from './task-parser';
export * from './content-parsers';
export * from './media-parsers';

// Import all parsers
import { parseTaskInput } from './task-parser';
import { parseNoteInput, parseTextInput, parseAnnotationInput, parseQuestionInput } from './content-parsers';
import { parseCodeInput, parseImageInput, parseResourceInput } from './media-parsers';

// Re-export for backward compatibility
export {
	parseTaskInput,
	parseNoteInput,
	parseTextInput,
	parseAnnotationInput,
	parseQuestionInput,
	parseCodeInput,
	parseImageInput,
	parseResourceInput,
};

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
} from '../../types';
import type { AvailableNodeTypes } from '@/types/available-node-types';

// Parser function type
export type ParserFunction<T = any> = (input: string) => T;

// Parser registry type
export interface ParserRegistry {
	task: ParserFunction<ParsedTaskData>;
	note: ParserFunction<ParsedNoteData>;
	text: ParserFunction<ParsedTextData>;
	annotation: ParserFunction<ParsedAnnotationData>;
	question: ParserFunction<ParsedQuestionData>;
	code: ParserFunction<ParsedCodeData>;
	image: ParserFunction<ParsedImageData>;
	resource: ParserFunction<ParsedResourceData>;
	defaultNode: ParserFunction<ParsedNoteData>; // Alias for backward compatibility
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
};

/**
 * Parser factory - get parser for a specific node type
 */
export const getParserForNodeType = <T = any>(nodeType: AvailableNodeTypes): ParserFunction<T> | null => {
	const parser = parserRegistry[nodeType as keyof ParserRegistry];
	return parser as ParserFunction<T> || null;
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