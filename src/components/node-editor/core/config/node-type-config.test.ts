import {
	getNodeSpecificParsingPatterns,
	getUniversalParsingPatterns,
} from './node-type-config'

describe('node-type config syntax help', () => {
	it('shows universal patterns only for supported node types', () => {
		expect(getUniversalParsingPatterns('defaultNode').length).toBeGreaterThan(0)
		expect(getUniversalParsingPatterns('referenceNode')).toHaveLength(0)
	})

	it('adds node-type switch discovery hints with other $commands', () => {
		const defaultPatterns = getNodeSpecificParsingPatterns('defaultNode')
		const discoveryPattern = defaultPatterns.find(
			(pattern) => pattern.pattern === '$...'
		)

		expect(discoveryPattern).toBeDefined()
		expect(discoveryPattern?.examples?.[0]).toContain('$task')
		expect(discoveryPattern?.examples?.[0]).toContain('$code')
		expect(discoveryPattern?.examples?.[0]).toContain('$image')
		expect(discoveryPattern?.examples?.[0]).not.toContain('$reference')
	})

	it('does not add discovery hints for hidden/system parser node types', () => {
		const referencePatterns = getNodeSpecificParsingPatterns('referenceNode')
		expect(referencePatterns).toHaveLength(0)
	})
})
