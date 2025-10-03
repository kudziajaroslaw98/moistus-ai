/**
 * Node Type Commands - Commands for switching between node types
 *
 * AUTOMATICALLY GENERATED from NodeRegistry
 */

import { NodeRegistry, NODE_REGISTRY } from '@/registry';
import type { Command } from '../command-types';
import { createNodeTypeSwitchAction } from '../actions/action-factory';

/**
 * Generate node type commands from registry
 * This ensures commands stay in sync with registry configuration
 */
function generateNodeTypeCommands(): Command[] {
	const commands: Command[] = [];
	let priority = 1;

	// Get all types with command triggers
	for (const nodeType of NodeRegistry.getCreatableTypes()) {
		const config = NODE_REGISTRY[nodeType];

		// Skip nodes without command triggers (like groupNode)
		if (!config.commandTrigger) continue;

		commands.push({
			id: `node-type-${nodeType}`,
			trigger: config.commandTrigger,
			label: config.label,
			description: config.description,
			icon: config.icon,
			category: config.category === 'structure' ? 'interactive' :
			          config.category === 'ai' ? 'interactive' :
			          config.category,
			triggerType: 'node-type' as const,
			nodeType,
			action: createNodeTypeSwitchAction(nodeType),
			keywords: config.keywords,
			examples: config.examples,
			priority: priority++,
		});
	}

	return commands;
}

/**
 * Node type command definitions
 * Uses $ prefix for quick node type switching
 */
export const nodeTypeCommands: Command[] = generateNodeTypeCommands();

/**
 * Map trigger strings to node types for quick lookup
 * Generated from registry
 */
export const triggerToNodeType: Record<string, string> =
	NodeRegistry.getCommandTriggerMap();