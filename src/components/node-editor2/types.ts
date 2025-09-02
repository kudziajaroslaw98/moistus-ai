import type { AppNode } from '../../types/app-node';
import type { AvailableNodeTypes } from '../../types/available-node-types';
import type { NodeData } from '../../types/node-data';
import type { LucideIcon } from 'lucide-react';

// Pattern category types
export type PatternCategory =
	| 'metadata'
	| 'formatting'
	| 'content'
	| 'structure';

// Individual parsing pattern
export interface ParsingPattern {
	pattern: string; // The syntax pattern (e.g., "@date")
	description: string; // Human-readable description
	examples: string[]; // Array of example usage
	category: PatternCategory; // Pattern category for grouping
	insertText?: string; // Optional text to insert (if different from pattern)
	icon?: LucideIcon; // Optional icon for visual representation
}

// Field configuration types
export type FieldType =
	| 'text'
	| 'textarea'
	| 'select'
	| 'date'
	| 'array'
	| 'code'
	| 'url'
	| 'image'
	| 'checkbox'
	| 'task';

export interface FieldConfig {
	name: string;
	type: FieldType;
	label?: string;
	placeholder?: string;
	required?: boolean;
	options?: Array<{ value: string; label: string }>;
	itemType?: string;
	validation?: (value: any) => string | null;
}

// Node command configuration
export interface NodeCommand {
	command: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	nodeType: AvailableNodeTypes;
	category: 'content' | 'media' | 'interactive' | 'annotation';
	quickParse?: QuickParser;
	fields?: FieldConfig[];
	examples?: string[];
	isPro?: boolean;
	parsingPatterns?: ParsingPattern[];
}

// Parser types
export type QuickParser<T = any> = (input: string) => T;

// Parsed data types for each node type
export interface ParsedNoteData {
	content: string;
	tags?: string[];
	priority?: 'low' | 'medium' | 'high';
}

export interface ParsedTaskData {
	tasks: Array<{
		id: string;
		text: string;
		isComplete: boolean;
		patterns?: Array<{
			type: 'date' | 'priority' | 'color' | 'tag' | 'assignee';
			value: string;
			display: string;
		}>;
	}>;
	dueDate?: Date;
	priority?: 'low' | 'medium' | 'high';
	assignee?: string;
	tags?: string[];
}

export interface ParsedCodeData {
	language?: string;
	code: string;
	filename?: string;
	lineNumbers?: boolean;
}

export interface ParsedImageData {
	url?: string;
	alt?: string;
	caption?: string;
	source?: string;
}

export interface ParsedResourceData {
	url: string;
	title?: string;
	description?: string;
	type?: 'link' | 'document' | 'video' | 'other';
}

export interface ParsedAnnotationData {
	text: string;
	type?: 'note' | 'warning' | 'info' | 'success' | 'error';
	icon?: string;
}

export interface ParsedQuestionData {
	question: string;
	answer?: string;
	options?: string[];
	type?: 'open' | 'multiple-choice' | 'yes-no';
}

export interface ParsedTextData {
	content: string;
	metadata?: {
		fontSize?: string;
		fontWeight?: number | 'normal' | 'bold';
		fontStyle?: 'normal' | 'italic';
		textAlign?: 'left' | 'center' | 'right';
		textColor?: string;
	};
}

// Parsing utility types
export interface ParsedColor {
	value: string;
	type: 'hex' | 'rgb' | 'tailwind' | 'named';
	isValid: boolean;
}

export interface ParsedSize {
	value: number;
	unit: 'px' | 'rem' | 'em' | '%';
	isValid: boolean;
}

// Component props types
export interface CommandPaletteProps {
	commands: NodeCommand[];
	onSelectCommand: (command: NodeCommand) => void;
	filterQuery: string;
	onFilterChange: (query: string) => void;
	activeIndex: number | null;
	itemsRef: React.MutableRefObject<(HTMLElement | null)[]>;
}

export interface QuickInputProps {
	command: NodeCommand;
	parentNode: AppNode | null;
	position: { x: number; y: number };
	mode?: 'create' | 'edit';
	existingNode?: AppNode;
}

export interface StructuredInputProps {
	command: NodeCommand;
	parentNode: AppNode | null;
	position: { x: number; y: number };
	mode?: 'create' | 'edit';
	existingNode?: AppNode;
}

// New node editor props interface
export interface NodeEditorProps {
	mode: 'create' | 'edit';
	existingNode?: AppNode;
	position: { x: number; y: number };
	parentNode?: AppNode;
	command?: NodeCommand;
	onUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
	onCancel?: () => void;
}

export interface ModeToggleProps {
	mode: 'quick' | 'structured';
	onToggle: (mode: 'quick' | 'structured') => void;
	onShowTypePicker?: () => void;
	selectedCommand?: NodeCommand;
}

export interface CommandItemProps {
	command: NodeCommand;
	isSelected: boolean;
	onSelect: (command: NodeCommand) => void;
	style?: React.CSSProperties;
}

// Creation result type
export interface NodeCreationResult {
	success: boolean;
	nodeId?: string;
	error?: string;
}

// Component props for ParsingLegend
export interface ParsingLegendProps {
	patterns: ParsingPattern[];
	onPatternClick: (pattern: string, insertText?: string) => void;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	className?: string;
}

export interface PatternItemProps {
	pattern: ParsingPattern;
	onClick: (pattern: string, insertText?: string) => void;
	isInteractive?: boolean;
}

export interface PatternCategoryProps {
	category: PatternCategory;
	patterns: ParsingPattern[];
	onPatternClick: (pattern: string, insertText?: string) => void;
}
