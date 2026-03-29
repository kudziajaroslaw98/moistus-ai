import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { EnhancedInput } from './enhanced-input'
import {
	createNodeEditor,
	type NodeEditorView,
} from '../../integrations/codemirror/setup'

jest.mock('../../integrations/codemirror/setup', () => ({
	createNodeEditor: jest.fn(),
}))

jest.mock('@/registry/type-guards', () => ({
	assertAvailableNodeTypeWithLog: jest.fn(() => true),
}))

jest.mock('../../core/validators/input-validator', () => ({
	validateInput: jest.fn(() => ({
		errors: [],
		warnings: [],
		suggestions: [],
	})),
}))

jest.mock('./validation-tooltip', () => ({
	ValidationTooltip: ({ children }: { children: ReactNode }) => children,
}))

function createMockEditorView(): NodeEditorView {
	const dom = document.createElement('div')

	return {
		dom,
		dispatch: jest.fn(),
		destroy: jest.fn(),
		focus: jest.fn(),
		hasFocus: true,
		updateRuntimeConfig: jest.fn(),
	} as unknown as NodeEditorView
}

describe('EnhancedInput', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('updates placeholder and native autocomplete settings without rebuilding the editor', () => {
		const mockEditorView = createMockEditorView()
		;(createNodeEditor as jest.Mock).mockReturnValue(mockEditorView)

		const { rerender } = render(
			<EnhancedInput
				disabled={false}
				onChange={jest.fn()}
				onKeyDown={jest.fn()}
				onSelectionChange={jest.fn()}
				placeholder='First placeholder'
				showNativeAutocomplete
				value='draft'
			/>
		)

		expect(createNodeEditor).toHaveBeenCalledTimes(1)
		;(mockEditorView.updateRuntimeConfig as jest.Mock).mockClear()

		rerender(
			<EnhancedInput
				disabled={false}
				onChange={jest.fn()}
				onKeyDown={jest.fn()}
				onSelectionChange={jest.fn()}
				placeholder='Second placeholder'
				showNativeAutocomplete={false}
				value='draft'
			/>
		)

		expect(createNodeEditor).toHaveBeenCalledTimes(1)
		expect(mockEditorView.updateRuntimeConfig).toHaveBeenCalledTimes(1)
		expect(mockEditorView.updateRuntimeConfig).toHaveBeenCalledWith({
			placeholder: 'Second placeholder',
			showNativeAutocompleteTooltip: false,
		})
	})
})
