/**
 * Action Factory - Creates reusable command actions
 * Simplified to only node-type switching (actually used)
 */

import type { AvailableNodeTypes } from '@/registry/node-registry';
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
