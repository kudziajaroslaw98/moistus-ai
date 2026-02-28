jest.mock('@/registry/node-registry', () => {
	const fakeRegistry = {
		defaultNode: {
			commandTrigger: '$note',
			label: 'Note',
			description: 'Note node',
			icon: () => null,
			category: 'content',
			keywords: ['note'],
			examples: ['$note'],
		},
		taskNode: {
			commandTrigger: '$task',
			label: 'Task',
			description: 'Task node',
			icon: () => null,
			category: 'structure',
			keywords: ['task'],
			examples: ['$task'],
		},
		referenceNode: {
			commandTrigger: '$reference',
			label: 'Reference',
			description: 'Reference node',
			icon: () => null,
			category: 'structure',
			keywords: ['reference'],
			examples: ['$reference'],
		},
	} as const

	return {
		NODE_REGISTRY: fakeRegistry,
		NodeRegistry: {
			getCreatableTypes: () =>
				['defaultNode', 'taskNode', 'referenceNode'] as Array<keyof typeof fakeRegistry>,
			getCommandTriggerMap: () => ({
				$note: 'defaultNode',
				$task: 'taskNode',
				$reference: 'referenceNode',
			}),
		},
	}
})

jest.mock('../actions/action-factory', () => ({
	createNodeTypeSwitchAction: jest.fn(() => jest.fn()),
}))

import {
	nodeTypeCommands,
	triggerToNodeType,
} from './node-type-commands'

describe('node-type commands', () => {
	it('excludes reference node from quick-switch commands', () => {
		expect(nodeTypeCommands.some((command) => command.trigger === '$reference')).toBe(
			false
		)
		expect(
			nodeTypeCommands.some((command) => command.nodeType === 'referenceNode')
		).toBe(false)
	})

	it('keeps regular node-type quick-switch commands', () => {
		expect(nodeTypeCommands.some((command) => command.trigger === '$note')).toBe(
			true
		)
		expect(nodeTypeCommands.some((command) => command.trigger === '$task')).toBe(
			true
		)
	})

	it('does not expose $reference in trigger map', () => {
		expect(triggerToNodeType.$reference).toBeUndefined()
		expect(triggerToNodeType.$note).toBe('defaultNode')
	})
})
