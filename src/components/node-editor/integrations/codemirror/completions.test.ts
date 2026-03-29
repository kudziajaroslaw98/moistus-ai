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
