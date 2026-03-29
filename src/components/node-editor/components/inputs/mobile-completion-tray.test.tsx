import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Completion } from '@codemirror/autocomplete'
import { MobileCompletionTray } from './mobile-completion-tray'
import { useMobileAutocompleteViewport } from './use-mobile-autocomplete-viewport'

jest.mock('./use-mobile-autocomplete-viewport', () => ({
	useMobileAutocompleteViewport: jest.fn(),
}))

const mockUseMobileAutocompleteViewport =
	useMobileAutocompleteViewport as jest.MockedFunction<
		typeof useMobileAutocompleteViewport
	>

describe('MobileCompletionTray', () => {
	const options: Completion[] = [
		{ label: ':done', detail: 'Status: done' },
		{ label: '@big-j', detail: 'editor: Big J' },
		{ label: 'color:teal', detail: '#14b8a6' },
	]
	const mentionMap = new Map([
		[
			'@big-j',
			{
				slug: 'big-j',
				displayName: 'Big J',
				avatarUrl: '',
				role: 'editor' as const,
			},
		],
	])
	const anchorRect = {
		top: 200,
		right: 100,
		bottom: 220,
		left: 80,
		width: 20,
		height: 20,
	}
	const editorRect = {
		top: 160,
		right: 460,
		bottom: 360,
		left: 60,
		width: 400,
		height: 200,
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('renders the keyboard-open strip full-width above the keyboard', () => {
		mockUseMobileAutocompleteViewport.mockReturnValue({
			keyboardInset: 220,
			keyboardOpen: true,
			visibleViewportHeight: 640,
			visualViewportRect: {
				top: 0,
				right: 393,
				bottom: 640,
				left: 0,
				width: 393,
				height: 640,
			},
		})

		render(
			<MobileCompletionTray
				anchorRect={anchorRect}
				editorRect={editorRect}
				isEditorFocused
				isOpen
				mentionMap={mentionMap}
				onClose={jest.fn()}
				onHighlight={jest.fn()}
				onSelect={jest.fn()}
				options={options}
				selectedIndex={1}
			/>
		)

		const tray = screen.getByRole('dialog', {
			name: 'Pattern autocomplete suggestions',
		})
		expect(tray).toHaveAttribute('data-layout-mode', 'keyboard-open')
		expect(tray).toHaveAttribute('data-node-editor-autocomplete-tray', 'true')
		expect(tray).toHaveStyle({
			bottom: '220px',
			left: '0px',
			right: '0px',
		})
		expect(screen.queryByRole('button', { name: 'Close suggestions' })).toBeNull()
		expect(screen.getByText('[editor]')).toBeInTheDocument()
		expect(screen.getByText('Big J')).toBeInTheDocument()
		expect(screen.getByText('BJ')).toBeInTheDocument()
		expect(screen.getByRole('option', { name: /@big-j/i })).toHaveAttribute(
			'aria-selected',
			'true'
		)
		expect(screen.getByRole('option', { name: /@big-j/i })).toHaveClass(
			'min-h-10'
		)
		expect(screen.getByRole('listbox')).toHaveClass('overscroll-y-contain')
		expect(screen.getByText('@big-j')).toHaveClass('text-[13px]')
	})

	it('renders a caret-anchored floating panel when the keyboard is hidden', () => {
		mockUseMobileAutocompleteViewport.mockReturnValue({
			keyboardInset: 0,
			keyboardOpen: false,
			visibleViewportHeight: 780,
			visualViewportRect: {
				top: 0,
				right: 600,
				bottom: 780,
				left: 0,
				width: 600,
				height: 780,
			},
		})

		render(
			<MobileCompletionTray
				anchorRect={anchorRect}
				editorRect={editorRect}
				isEditorFocused
				isOpen
				mentionMap={mentionMap}
				onClose={jest.fn()}
				onHighlight={jest.fn()}
				onSelect={jest.fn()}
				options={options}
				selectedIndex={0}
			/>
		)

		const tray = screen.getByRole('dialog', {
			name: 'Pattern autocomplete suggestions',
		})
		expect(tray).toHaveAttribute('data-layout-mode', 'floating')
		expect(tray).toHaveStyle({
			top: '228px',
			left: '80px',
			width: '360px',
		})
		expect(
			screen.getByRole('button', { name: 'Close suggestions' })
		).toBeInTheDocument()
	})

	it('forwards highlight, selection, and close actions', async () => {
		const user = userEvent.setup()
		const handleHighlight = jest.fn()
		const handleSelect = jest.fn()
		const handleClose = jest.fn()

		mockUseMobileAutocompleteViewport.mockReturnValue({
			keyboardInset: 0,
			keyboardOpen: false,
			visibleViewportHeight: 780,
			visualViewportRect: {
				top: 0,
				right: 600,
				bottom: 780,
				left: 0,
				width: 600,
				height: 780,
			},
		})

		render(
			<MobileCompletionTray
				anchorRect={anchorRect}
				editorRect={editorRect}
				isEditorFocused
				isOpen
				mentionMap={mentionMap}
				onClose={handleClose}
				onHighlight={handleHighlight}
				onSelect={handleSelect}
				options={options}
				selectedIndex={0}
			/>
		)

		fireEvent.mouseEnter(screen.getByRole('option', { name: /@big-j/i }))
		await user.click(screen.getByRole('option', { name: /@big-j/i }))
		await user.click(screen.getByRole('button', { name: 'Close suggestions' }))

		expect(handleHighlight).toHaveBeenCalledWith(1)
		expect(handleSelect).toHaveBeenCalledWith(1)
		expect(handleClose).toHaveBeenCalled()
	})
})
