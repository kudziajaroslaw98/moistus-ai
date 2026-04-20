import {
	getCursorToolTriggerVariant,
	isCursorTool,
} from './toolbar-utils'

describe('toolbar-utils', () => {
	it('treats only cursor modes as cursor tools', () => {
		expect(isCursorTool('default')).toBe(true)
		expect(isCursorTool('pan')).toBe(true)
		expect(isCursorTool('connector')).toBe(true)
		expect(isCursorTool('node')).toBe(false)
	})

	it('deactivates the cursor trigger when add-node mode is selected', () => {
		expect(getCursorToolTriggerVariant('node')).toBe('outline')
		expect(getCursorToolTriggerVariant('default')).toBe('normal')
	})
})
