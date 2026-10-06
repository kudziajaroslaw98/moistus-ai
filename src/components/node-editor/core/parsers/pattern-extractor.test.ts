import { parseInput } from './pattern-extractor'

describe('pattern-extractor parser cleanup', () => {
	it('does not parse removed bg, border, src, reference, or confidence tokens', () => {
		const input =
			'Legacy bg:red border:#ffffff src:"https://example.com/legacy.png" [[node-123]] confidence:0.8'
		const result = parseInput(input)

		expect(result.metadata).not.toHaveProperty('backgroundColor')
		expect(result.metadata).not.toHaveProperty('borderColor')
		expect(result.metadata).not.toHaveProperty('source')
		expect(result.metadata).not.toHaveProperty('targetNodeId')
		expect(result.metadata).not.toHaveProperty('targetMapId')
		expect(result.metadata).not.toHaveProperty('confidence')

		// Removed tokens stay plain text in content
		expect(result.content).toContain('bg:red')
		expect(result.content).toContain('border:#ffffff')
		expect(result.content).toContain('src:"https://example.com/legacy.png"')
		expect(result.content).toContain('[[node-123]]')
		expect(result.content).toContain('confidence:0.8')
	})

	it('still parses universal parser tokens', () => {
		const result = parseInput('Ship this #urgent @alice ^tomorrow !! :done')

		expect(result.metadata.tags).toEqual(['urgent'])
		expect(result.metadata.assignee).toBe('alice')
		expect(result.metadata.priority).toBe('medium')
		expect(result.metadata.status).toBe('done')
		expect(result.metadata.dueDate).toBeDefined()
	})

	it('parses image url only from url: prefix and leaves src: text untouched', () => {
		const result = parseInput(
			'url:https://cdn.example.com/image.png src:"https://legacy.example.com/image.png"'
		)

		expect(result.metadata.url).toBe('https://cdn.example.com/image.png')
		expect(result.content).toContain('src:"https://legacy.example.com/image.png"')
	})
})

describe('pattern-extractor line breaks', () => {
	it('keeps the lines and blank lines people type', () => {
		const parsed = parseInput(
			'Keyboard shortcuts:\n\nTab to create a child\nEnter to create a sibling'
		)

		expect(parsed.content).toBe(
			'Keyboard shortcuts:\n\nTab to create a child\nEnter to create a sibling'
		)
	})

	it('still tidies the spaces left where patterns were removed', () => {
		const parsed = parseInput('Buy milk #shopping   today  \nThen #home cook')

		expect(parsed.content).toBe('Buy milk today\nThen cook')
		expect(parsed.metadata.tags).toEqual(['shopping', 'home'])
	})
})

describe('pattern-extractor task lists', () => {
	it('keeps dates and tags typed on a task line out of the task text', () => {
		const parsed = parseInput('[ ] Review PR\n[x] Deploy ^friday #high')

		expect(
			parsed.metadata.tasks.map((task: { text: string; isComplete: boolean }) => [
				task.text,
				task.isComplete,
			])
		).toEqual([
			['Review PR', false],
			['Deploy', true],
		])
		expect(parsed.metadata.tags).toEqual(['high'])
		expect(parsed.metadata.dueDate).toBeDefined()
	})
})
