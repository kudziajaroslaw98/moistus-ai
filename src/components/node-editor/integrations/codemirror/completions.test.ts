import { startCompletion, type CompletionContext } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { createCompletions } from './completions'

jest.mock('@codemirror/autocomplete', () => {
	const actual = jest.requireActual('@codemirror/autocomplete')

	return {
		...actual,
		startCompletion: jest.fn(),
	}
})

jest.mock('../../core/commands/command-registry', () => ({
	commandRegistry: {
		getCommandsByTriggerType: jest.fn((triggerType: string) => {
			if (triggerType !== 'node-type') {
				return []
			}

			return [
				{
					id: 'note',
					trigger: '$note',
					description: 'Switch to note',
				},
				{
					id: 'task',
					trigger: '$task',
					description: 'Switch to task',
				},
			]
		}),
	},
}))

const buildContext = (
	text: string,
	options: { explicit?: boolean } = {}
): CompletionContext =>
	({
		explicit: options.explicit ?? false,
		pos: text.length,
		matchBefore: () => {
			const match = text.match(/\S*$/)
			if (!match) {
				return null
			}

			const token = match[0] ?? ''
			return {
				from: text.length - token.length,
				to: text.length,
				text: token,
			}
		},
	} as unknown as CompletionContext)

const mockedStartCompletion = jest.mocked(startCompletion)

const getTriggerOption = async (label: string) => {
	const { source } = createCompletions()
	const result = await Promise.resolve(source(buildContext('', { explicit: true })))
	return result?.options.find((option: { label: string }) => option.label === label)
}

describe('codemirror completions cleanup', () => {
	beforeEach(() => {
		mockedStartCompletion.mockClear()
	})

	it('does not return completions for removed parser prefixes', async () => {
		const { source } = createCompletions()

		await expect(Promise.resolve(source(buildContext('bg:')))).resolves.toBeNull()
		await expect(
			Promise.resolve(source(buildContext('border:')))
		).resolves.toBeNull()
		await expect(Promise.resolve(source(buildContext('src:')))).resolves.toBeNull()
		await expect(
			Promise.resolve(source(buildContext('confidence:')))
		).resolves.toBeNull()
	})

	it('does not include $reference in node-type suggestions', async () => {
		const { source } = createCompletions()
		const result = await Promise.resolve(source(buildContext('$')))

		expect(result).not.toBeNull()
		const labels = result?.options.map((option: { label: string }) => option.label) ?? []
		expect(labels).toContain('$note')
		expect(labels).toContain('$task')
		expect(labels).not.toContain('$reference')
	})

	it('shows universal trigger suggestions only for explicit invocation', async () => {
		const { source } = createCompletions()
		const result = await Promise.resolve(source(buildContext('', { explicit: true })))

		expect(result).not.toBeNull()
		const labels = result?.options.map((option: { label: string }) => option.label) ?? []
		expect(labels).toEqual(expect.arrayContaining(['#', '@', '^', '!', ':', '/']))
	})

	it('does not show universal trigger suggestions for passive empty input', async () => {
		const { source } = createCompletions()

		await expect(Promise.resolve(source(buildContext('')))).resolves.toBeNull()
		await expect(Promise.resolve(source(buildContext(' ')))).resolves.toBeNull()
		await expect(Promise.resolve(source(buildContext('hello ')))).resolves.toBeNull()
	})

	it('keeps explicit trigger character completions while typing', async () => {
		const { source } = createCompletions()
		const result = await Promise.resolve(source(buildContext('#')))

		expect(result).not.toBeNull()
		const labels = result?.options.map((option: { label: string }) => option.label) ?? []
		expect(labels).toContain('#bug')
	})

	it('keeps partial prefix matching for pattern completions', async () => {
		const { source } = createCompletions()
		const result = await Promise.resolve(source(buildContext('wei')))

		expect(result).not.toBeNull()
		const labels = result?.options.map((option: { label: string }) => option.label) ?? []
		expect(labels).toContain('weight:')
	})

	it('chains manual tag trigger selection into follow-up suggestions', async () => {
		const option = await getTriggerOption('#')

		expect(option).toBeDefined()
		expect(typeof option?.apply).toBe('function')
		if (typeof option?.apply !== 'function') {
			throw new Error('Expected tag trigger to use functional apply')
		}

		const dispatch = jest.fn()
		const view = { dispatch } as unknown as EditorView

		jest.useFakeTimers()
		try {
			option.apply(view, option, 0, 0)

			expect(dispatch).toHaveBeenCalledWith({
				changes: { from: 0, to: 0, insert: '#' },
				selection: { anchor: 1 },
			})

			jest.runAllTimers()

			expect(mockedStartCompletion).toHaveBeenCalledWith(view)
			expect(mockedStartCompletion).toHaveBeenCalledTimes(1)
		} finally {
			jest.useRealTimers()
		}
	})

	it('chains manual node-type trigger selection into follow-up suggestions', async () => {
		const option = await getTriggerOption('$')

		expect(option).toBeDefined()
		expect(typeof option?.apply).toBe('function')
		if (typeof option?.apply !== 'function') {
			throw new Error('Expected node-type trigger to use functional apply')
		}

		const dispatch = jest.fn()
		const view = { dispatch } as unknown as EditorView

		jest.useFakeTimers()
		try {
			option.apply(view, option, 2, 2)

			expect(dispatch).toHaveBeenCalledWith({
				changes: { from: 2, to: 2, insert: '$' },
				selection: { anchor: 3 },
			})

			jest.runAllTimers()

			expect(mockedStartCompletion).toHaveBeenCalledWith(view)
			expect(mockedStartCompletion).toHaveBeenCalledTimes(1)
		} finally {
			jest.useRealTimers()
		}
	})
})

describe('plugin node type completions', () => {
	const { EditorState } = jest.requireActual('@codemirror/state') as typeof import('@codemirror/state')
	const { pluginFieldsField, setPluginFieldsEffect } = jest.requireActual(
		'./plugin-fields'
	) as typeof import('./plugin-fields')

	const pluginContext = (text: string, explicit = false) => {
		const state = EditorState.create({ doc: text, extensions: [pluginFieldsField] }).update({
			effects: setPluginFieldsEffect.of([
				{ name: 'target', title: 'Target', type: 'number' },
				{ name: 'trend', title: 'Trend', type: 'enum', options: ['up', 'down'] },
				{ name: 'unit', title: 'Unit', type: 'string' },
			]),
		}).state
		return { ...buildContext(text, { explicit }), state } as unknown as CompletionContext
	}

	it('suggests only the kind’s field names', () => {
		const { source } = createCompletions()
		const result = source(pluginContext('Users t')) as unknown as { options: Array<{ label: string }> }

		expect(result.options.map((option) => option.label)).toEqual(['target:', 'trend:'])
	})

	it('suggests enum values after the field name', () => {
		const { source } = createCompletions()
		const result = source(pluginContext('Users trend:d')) as unknown as {
			from: number
			options: Array<{ label: string }>
		}

		expect(result.options.map((option) => option.label)).toEqual(['down'])
		expect(result.from).toBe('Users trend:'.length)
	})

	it('does not offer built-in metadata keys', () => {
		const { source } = createCompletions()

		expect(source(pluginContext('Users wei'))).toBeNull()
	})
})
