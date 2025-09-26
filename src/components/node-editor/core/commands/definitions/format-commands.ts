/**
 * Format Commands - Commands for text formatting and styling
 */

import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Code,
	Italic,
	Link,
	Quote,
	Strikethrough,
	Underline,
} from 'lucide-react';
import type { Command } from '../command-types';
import { createFormatAction, textFormatters } from '../actions/action-factory';

/**
 * Text formatting command definitions
 * Uses keyboard shortcuts for quick formatting
 */
export const formatCommands: Command[] = [
	{
		id: 'format-bold',
		trigger: 'bold',
		label: 'Bold',
		description: 'Make text bold',
		icon: Bold,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction(textFormatters.bold, 'bold'),
		shortcuts: ['Ctrl+B', 'Cmd+B'],
		keywords: ['bold', 'strong', 'emphasis', 'weight'],
		examples: ['**text**', '__text__'],
		priority: 20,
	},
	{
		id: 'format-italic',
		trigger: 'italic',
		label: 'Italic',
		description: 'Make text italic',
		icon: Italic,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction(textFormatters.italic, 'italic'),
		shortcuts: ['Ctrl+I', 'Cmd+I'],
		keywords: ['italic', 'emphasis', 'slant', 'style'],
		examples: ['*text*', '_text_'],
		priority: 21,
	},
	{
		id: 'format-underline',
		trigger: 'underline',
		label: 'Underline',
		description: 'Underline text',
		icon: Underline,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction(textFormatters.underline, 'underline'),
		shortcuts: ['Ctrl+U', 'Cmd+U'],
		keywords: ['underline', 'underscore', 'line'],
		examples: ['__text__'],
		priority: 22,
	},
	{
		id: 'format-strikethrough',
		trigger: 'strikethrough',
		label: 'Strikethrough',
		description: 'Strike through text',
		icon: Strikethrough,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction(textFormatters.strikethrough, 'strikethrough'),
		shortcuts: ['Ctrl+Shift+S', 'Cmd+Shift+S'],
		keywords: ['strikethrough', 'strike', 'cross', 'delete'],
		examples: ['~~text~~'],
		priority: 23,
	},
	{
		id: 'format-code',
		trigger: 'code',
		label: 'Inline Code',
		description: 'Format as inline code',
		icon: Code,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction(textFormatters.code, 'code'),
		shortcuts: ['Ctrl+`', 'Cmd+`'],
		keywords: ['code', 'inline', 'monospace', 'snippet'],
		examples: ['`code`'],
		priority: 24,
	},
	{
		id: 'format-quote',
		trigger: 'quote',
		label: 'Quote',
		description: 'Format as blockquote',
		icon: Quote,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction(textFormatters.quote, 'quote'),
		shortcuts: ['Ctrl+Shift+Q', 'Cmd+Shift+Q'],
		keywords: ['quote', 'blockquote', 'citation'],
		examples: ['> quoted text'],
		priority: 25,
	},
	{
		id: 'format-link',
		trigger: 'link',
		label: 'Link',
		description: 'Create a hyperlink',
		icon: Link,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction((text) => textFormatters.link(text, 'https://'), 'link'),
		shortcuts: ['Ctrl+K', 'Cmd+K'],
		keywords: ['link', 'hyperlink', 'url', 'href'],
		examples: ['[text](url)'],
		priority: 26,
	},
];

/**
 * Alignment command definitions
 */
export const alignmentCommands: Command[] = [
	{
		id: 'align-left',
		trigger: 'align-left',
		label: 'Align Left',
		description: 'Align text to the left',
		icon: AlignLeft,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction((text) => `${text} align:left`, 'align-left'),
		shortcuts: ['Ctrl+Shift+L', 'Cmd+Shift+L'],
		keywords: ['align', 'left', 'alignment', 'justify'],
		examples: ['align:left'],
		priority: 27,
	},
	{
		id: 'align-center',
		trigger: 'align-center',
		label: 'Align Center',
		description: 'Center align text',
		icon: AlignCenter,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction((text) => `${text} align:center`, 'align-center'),
		shortcuts: ['Ctrl+Shift+C', 'Cmd+Shift+C'],
		keywords: ['align', 'center', 'alignment', 'middle'],
		examples: ['align:center'],
		priority: 28,
	},
	{
		id: 'align-right',
		trigger: 'align-right',
		label: 'Align Right',
		description: 'Align text to the right',
		icon: AlignRight,
		category: 'format',
		triggerType: 'shortcut',
		action: createFormatAction((text) => `${text} align:right`, 'align-right'),
		shortcuts: ['Ctrl+Shift+R', 'Cmd+Shift+R'],
		keywords: ['align', 'right', 'alignment', 'justify'],
		examples: ['align:right'],
		priority: 29,
	},
];

// Combine all formatting commands
export const allFormatCommands = [...formatCommands, ...alignmentCommands];