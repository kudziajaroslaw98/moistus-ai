import { Gauge } from 'lucide-react';
import type { Command } from './command-types';

// The real built-ins come from the node registry, which loads every node component.
jest.mock('./definitions/node-type-commands', () => ({ nodeTypeCommands: [] }));

import { processNodeTypeSwitch } from './command-executor';
import { commandRegistry } from './command-registry';

const pluginCommand = (
	kind: string,
	overrides: Partial<Command> = {}
): Command => ({
	id: `plugin:dev.example:${kind}`,
	trigger: `$${kind}`,
	label: kind,
	description: 'Plugin node kind',
	icon: Gauge,
	category: 'interactive',
	triggerType: 'node-type',
	nodeType: 'extensionNode',
	extension: { pluginId: 'dev.example', kind },
	...overrides,
});

describe('processNodeTypeSwitch with plugin kinds', () => {
	it('switches to the exact plugin kind and carries it along', () => {
		const cleanups = [
			commandRegistry.register(pluginCommand('metrics')),
			commandRegistry.register(pluginCommand('metric')),
		];

		const result = processNodeTypeSwitch('$metric Weekly users target:10');

		expect(result).toMatchObject({
			hasSwitch: true,
			nodeType: 'extensionNode',
			extension: { pluginId: 'dev.example', kind: 'metric' },
			processedText: 'Weekly users target:10',
		});
		cleanups.forEach((cleanup) => cleanup());
	});

	it('ignores triggers that only partly match a registered one', () => {
		const cleanup = commandRegistry.register(pluginCommand('metrics'));

		expect(processNodeTypeSwitch('$metric hello').hasSwitch).toBe(false);
		cleanup();
	});
});
