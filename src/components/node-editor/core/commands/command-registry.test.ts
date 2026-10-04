import { FileText, Puzzle } from 'lucide-react';
import type { Command } from './command-types';

// The real built-ins come from the node registry, which loads every node component.
jest.mock('./definitions/node-type-commands', () => ({
	nodeTypeCommands: [
		{
			id: '$task',
			trigger: '$task',
			label: 'Task',
			description: 'Task list',
			icon: FileText,
			category: 'content',
			triggerType: 'node-type',
		},
	],
}));

import { commandRegistry } from './command-registry';

const kanbanCommand = (overrides: Partial<Command> = {}): Command => ({
	id: 'com.example.kanban:$kanban',
	trigger: '$kanban',
	label: 'Kanban board',
	description: 'Plugin node kind',
	icon: Puzzle,
	category: 'content',
	triggerType: 'node-type',
	...overrides,
});

describe('commandRegistry.register', () => {
	it('adds a command that is found by trigger and search, and removes it', () => {
		const unregister = commandRegistry.register(kanbanCommand());

		expect(commandRegistry.getCommandByTrigger('$kanban')?.label).toBe(
			'Kanban board'
		);
		expect(
			commandRegistry.searchCommands({ query: 'kanban' }).map((c) => c.id)
		).toContain('com.example.kanban:$kanban');

		unregister();
		expect(commandRegistry.getCommandByTrigger('$kanban')).toBeUndefined();
	});

	it('refuses to take over an existing trigger or id', () => {
		expect(() =>
			commandRegistry.register(kanbanCommand({ id: 'evil', trigger: '$task' }))
		).toThrow('trigger "$task"');
		expect(() =>
			commandRegistry.register(kanbanCommand({ id: '$task', trigger: '$x' }))
		).toThrow('id "$task"');
		expect(commandRegistry.getCommandByTrigger('$task')?.label).toBe('Task');
	});
});
