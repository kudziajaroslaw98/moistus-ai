/**
 * Action Factory - Creates reusable command actions
 * Eliminates duplication by providing centralized action creators
 */

import type { AvailableNodeTypes } from '@/registry';
import type {
	CommandAction,
	CommandContext,
	CommandResult,
} from '../command-types';

/**
 * Creates an action for switching node types
 */
export function createNodeTypeSwitchAction(
	nodeType: AvailableNodeTypes
): CommandAction {
	return (context: CommandContext): CommandResult => {
		// Remove trigger from text (supports both $ and / triggers)
		const triggerPattern = /[$\/]\w+\s*/;
		const processedText = context.text.replace(triggerPattern, '').trim();

		return {
			success: true,
			nodeType,
			replacement: processedText,
			cursorPosition: processedText.length,
			closePanel: true,
			message: `Switched to ${nodeType}`,
		};
	};
}

/**
 * Creates an action for inserting patterns
 */
export function createPatternInsertAction(
	patternGenerator: (context: CommandContext) => string
): CommandAction {
	return (context: CommandContext): CommandResult => {
		const insertText = patternGenerator(context);
		const newText = context.text.replace(/\/\w+/, insertText);

		return {
			success: true,
			replacement: newText,
			cursorPosition: newText.length,
			closePanel: true,
		};
	};
}

/**
 * Creates an action for text formatting
 */
export function createFormatAction(
	formatter: (text: string) => string,
	formatType: string
): CommandAction {
	return (context: CommandContext): CommandResult => {
		const { text: currentText, selection } = context;
		let newText = currentText;
		let newCursorPosition = context.cursorPosition;

		if (selection) {
			const { from, to, text } = selection;
			const formattedText = formatter(text);

			newText =
				currentText.substring(0, from) +
				formattedText +
				currentText.substring(to);
			newCursorPosition = from + formattedText.length;
		} else {
			// If no selection, insert format markers at cursor
			const beforeCursor = currentText.substring(0, context.cursorPosition);
			const afterCursor = currentText.substring(context.cursorPosition);
			const formattedText = formatter('');

			newText = beforeCursor + formattedText + afterCursor;
			// Position cursor in the middle of format markers
			newCursorPosition =
				beforeCursor.length + Math.floor(formattedText.length / 2);
		}

		return {
			success: true,
			replacement: newText,
			cursorPosition: newCursorPosition,
			closePanel: true,
			message: `Applied ${formatType} formatting`,
		};
	};
}

/**
 * Creates an action for inserting templates
 */
export function createTemplateAction(
	template: string | ((context: CommandContext) => string)
): CommandAction {
	return (context: CommandContext): CommandResult => {
		const templateText =
			typeof template === 'function' ? template(context) : template;

		const newText = context.text.replace(/\/\w+/, templateText);

		return {
			success: true,
			replacement: newText,
			cursorPosition: newText.length,
			closePanel: true,
		};
	};
}

/**
 * Creates a composite action that executes multiple actions in sequence
 */
export function createCompositeAction(
	...actions: CommandAction[]
): CommandAction {
	return async (context: CommandContext): Promise<CommandResult> => {
		let currentContext = { ...context };
		let lastResult: CommandResult = { success: false };

		for (const action of actions) {
			lastResult = await action(currentContext);

			if (!lastResult.success) {
				return lastResult;
			}

			// Update context for next action
			if (lastResult.replacement !== undefined) {
				currentContext = { ...currentContext, text: lastResult.replacement };
			}
			if (lastResult.cursorPosition !== undefined) {
				currentContext = {
					...currentContext,
					cursorPosition: lastResult.cursorPosition,
				};
			}
			if (lastResult.nodeType !== undefined) {
				currentContext = { ...currentContext, nodeType: lastResult.nodeType };
			}
		}

		return lastResult;
	};
}

/**
 * Pattern generators for common patterns
 */
export const patternGenerators = {
	currentDate: () => `^${new Date().toLocaleDateString()}`,
	currentTime: () => `^${new Date().toLocaleTimeString()}`,
	currentDateTime: () => `^${new Date().toLocaleString()}`,
	priority: (level: 'high' | 'medium' | 'low' = 'medium') => `#${level}`,
	tag: (name: string = 'tag') => `[${name}]`,
	assignee: (user: string = 'user') => `@${user}`,
	color: (color: string = 'blue') => `color:${color}`,
	fontSize: (size: string = '16px') => `sz:${size}`,
	alignment: (align: 'left' | 'center' | 'right' = 'left') => `align:${align}`,
};

/**
 * Text formatters for common formatting
 */
export const textFormatters = {
	bold: (text: string) => (text ? `**${text}**` : '****'),
	italic: (text: string) => (text ? `*${text}*` : '**'),
	underline: (text: string) => (text ? `__${text}__` : '____'),
	strikethrough: (text: string) => (text ? `~~${text}~~` : '~~~~'),
	code: (text: string) => (text ? `\`${text}\`` : '``'),
	codeBlock: (text: string, lang: string = '') =>
		text ? `\`\`\`${lang}\n${text}\n\`\`\`` : `\`\`\`${lang}\n\n\`\`\``,
	quote: (text: string) =>
		text
			.split('\n')
			.map((line) => `> ${line}`)
			.join('\n'),
	link: (text: string, url: string = '') => `[${text}](${url})`,
};

/**
 * Template generators for complex templates
 */
export const templateGenerators = {
	meetingNotes: (context: CommandContext) => `# Meeting Notes
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Attendees:
-

## Agenda
1.

## Discussion Points
-

## Action Items
- [ ]

## Next Steps
- `,

	dailyStandup: () => `## Daily Standup - ${new Date().toLocaleDateString()}

### Yesterday
-

### Today
-

### Blockers
- None`,

	projectChecklist: (
		projectName: string = 'Project'
	) => `# ${projectName} Checklist

## Planning
- [ ] Define requirements
- [ ] Create timeline
- [ ] Identify resources

## Development
- [ ] Setup environment
- [ ] Implement features
- [ ] Write tests

## Review
- [ ] Code review
- [ ] Testing
- [ ] Documentation

## Deployment
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Post-deployment verification`,

	bugReport: () => `## Bug Report

**Date:** ${new Date().toLocaleDateString()}
**Reporter:**
**Severity:** [Low/Medium/High/Critical]

### Description

### Steps to Reproduce
1.

### Expected Behavior

### Actual Behavior

### Environment
- OS:
- Browser:
- Version:

### Additional Information`,
};
