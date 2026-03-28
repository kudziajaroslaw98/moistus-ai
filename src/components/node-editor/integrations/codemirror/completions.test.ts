import type { CompletionContext } from '@codemirror/autocomplete'
import { createCompletions } from './completions'

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

describe('codemirror completions cleanup', () => {
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
		expect(labels).toEqual(expect.arrayContaining(['#', '@', '^', '!', ':']))
	})

	it('does not show universal trigger suggestions for passive empty input', async () => {
		const { source } = createCompletions()

		await expect(Promise.resolve(source(buildContext('')))).resolves.toBeNull()
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
})
