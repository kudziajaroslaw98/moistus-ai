import {
	completionStatus,
	currentCompletions,
	selectedCompletionIndex,
} from '@codemirror/autocomplete'
import {
	areEditorAutocompleteStatesEqual,
	EMPTY_EDITOR_AUTOCOMPLETE_STATE,
	getEditorAutocompleteState,
} from './autocomplete-state'

jest.mock('@codemirror/autocomplete', () => ({
	completionStatus: jest.fn(),
	currentCompletions: jest.fn(),
	selectedCompletionIndex: jest.fn(),
}))

describe('autocomplete-state', () => {
	const mockEditorState = {
		selection: {
			main: {
				head: 12,
			},
		},
	} as never
	const mockEditorView = {
		state: mockEditorState,
		coordsAtPos: jest.fn().mockReturnValue({
			top: 120,
			right: 152,
			bottom: 138,
			left: 140,
		}),
		dom: {
			getBoundingClientRect: jest.fn().mockReturnValue({
				top: 80,
				right: 420,
				bottom: 300,
				left: 60,
				width: 360,
				height: 220,
			}),
		},
	} as never

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('returns active completion state with options and selected index', () => {
		const options = [
			{ label: ':done', detail: 'Status: done', type: 'property' },
			{ label: ':blocked', detail: 'Status: blocked', type: 'property' },
		]

		;(completionStatus as jest.Mock).mockReturnValue('active')
		;(currentCompletions as jest.Mock).mockReturnValue(options)
		;(selectedCompletionIndex as jest.Mock).mockReturnValue(1)

		expect(getEditorAutocompleteState(mockEditorView)).toEqual({
			status: 'active',
			options,
			selectedIndex: 1,
			anchorRect: {
				top: 120,
				right: 152,
				bottom: 138,
				left: 140,
				width: 12,
				height: 18,
			},
			editorRect: {
				top: 80,
				right: 420,
				bottom: 300,
				left: 60,
				width: 360,
				height: 220,
			},
		})
	})

	it('returns the empty state when completion is closed', () => {
		;(completionStatus as jest.Mock).mockReturnValue(null)

		expect(getEditorAutocompleteState(mockEditorView)).toEqual(
			EMPTY_EDITOR_AUTOCOMPLETE_STATE
		)
		expect(currentCompletions).not.toHaveBeenCalled()
		expect(selectedCompletionIndex).not.toHaveBeenCalled()
	})

	it('compares autocomplete states by UI-relevant fields', () => {
		expect(
			areEditorAutocompleteStatesEqual(
				{
					status: 'active',
					options: [{ label: ':done', detail: 'Status: done', type: 'property' }],
					selectedIndex: 0,
					anchorRect: {
						top: 120,
						right: 152,
						bottom: 138,
						left: 140,
						width: 12,
						height: 18,
					},
					editorRect: {
						top: 80,
						right: 420,
						bottom: 300,
						left: 60,
						width: 360,
						height: 220,
					},
				},
				{
					status: 'active',
					options: [{ label: ':done', detail: 'Status: done', type: 'property' }],
					selectedIndex: 0,
					anchorRect: {
						top: 120,
						right: 152,
						bottom: 138,
						left: 140,
						width: 12,
						height: 18,
					},
					editorRect: {
						top: 80,
						right: 420,
						bottom: 300,
						left: 60,
						width: 360,
						height: 220,
					},
				}
			)
		).toBe(true)

		expect(
			areEditorAutocompleteStatesEqual(
				{
					status: 'active',
					options: [{ label: ':done', detail: 'Status: done', type: 'property' }],
					selectedIndex: 0,
					anchorRect: {
						top: 120,
						right: 152,
						bottom: 138,
						left: 140,
						width: 12,
						height: 18,
					},
					editorRect: {
						top: 80,
						right: 420,
						bottom: 300,
						left: 60,
						width: 360,
						height: 220,
					},
				},
				{
					status: 'pending',
					options: [{ label: ':done', detail: 'Status: done', type: 'property' }],
					selectedIndex: 0,
					anchorRect: {
						top: 120,
						right: 152,
						bottom: 138,
						left: 140,
						width: 12,
						height: 18,
					},
					editorRect: {
						top: 80,
						right: 420,
						bottom: 300,
						left: 60,
						width: 360,
						height: 220,
					},
				}
			)
		).toBe(false)
	})
})
