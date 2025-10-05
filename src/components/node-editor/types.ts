import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { LucideIcon } from 'lucide-react';
import { ComponentType } from 'react';
import type { AppNode } from '../../types/app-node';
import type { NodeData } from '../../types/node-data';
import type {
	Command,
	FieldType,
	FieldConfig,
	PatternCategory,
	ParsingPattern,
	QuickParser,
} from './core/commands/command-types';

// Re-export types from command-types for backwards compatibility
export type {
	FieldType,
	FieldConfig,
	PatternCategory,
	ParsingPattern,
	QuickParser,
} from './core/commands/command-types';

// Priority levels supported by the system
export type PriorityLevel =
	| 'low'
	| 'medium'
	| 'high'
	| 'critical'
	| 'urgent'
	| 'asap'
	| 'blocked'
	| 'waiting';

// Parsed data types for each node type
export interface ParsedNoteData {
	content: string;
	tags?: string[];
	priority?: PriorityLevel;
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
	priority?: PriorityLevel;
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
	commands: Command[];
	onSelectCommand: (command: Command) => void;
	filterQuery: string;
	onFilterChange: (query: string) => void;
	activeIndex: number | null;
	itemsRef: React.MutableRefObject<(HTMLElement | null)[]>;
}

export interface QuickInputProps {
	command: Command;
	parentNode: AppNode | null;
	position: { x: number; y: number };
	mode?: 'create' | 'edit';
	existingNode?: AppNode;
}

export interface StructuredInputProps {
	command: Command;
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
	command?: Command;
	onUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
	onCancel?: () => void;
}

export interface ModeToggleProps {
	mode: 'quick' | 'structured';
	onToggle: (mode: 'quick' | 'structured') => void;
	onShowTypePicker?: () => void;
	selectedCommand?: Command;
}

export interface CommandItemProps {
	command: Command;
	isSelected: boolean;
	onSelect: (command: Command) => void;
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
