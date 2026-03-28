import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Completion } from '@codemirror/autocomplete'
import { MobileCompletionTray } from './mobile-completion-tray'

jest.mock('./use-mobile-autocomplete-viewport', () => ({
	useMobileAutocompleteViewport: jest.fn(() => ({
		keyboardInset: 220,
		visibleViewportHeight: 640,
	})),
}))

describe('MobileCompletionTray', () => {
	const options: Completion[] = [
		{ label: ':done', detail: 'Status: done' },
		{ label: 'color:teal', detail: '#14b8a6' },
	]

	it('renders visible suggestions above the keyboard inset', () => {
		render(
			<MobileCompletionTray
				isOpen
				onClose={jest.fn()}
				onHighlight={jest.fn()}
				onSelect={jest.fn()}
				options={options}
				selectedIndex={0}
			/>
		)

		expect(
			screen.getByRole('dialog', { name: 'Pattern autocomplete suggestions' })
		).toHaveStyle({
			bottom: 'calc(env(safe-area-inset-bottom, 0px) + 232px)',
		})
		expect(screen.getByRole('option', { name: /:done/i })).toHaveAttribute(
			'aria-selected',
			'true'
		)
	})

	it('forwards highlight, selection, and close actions', async () => {
		const user = userEvent.setup()
		const handleHighlight = jest.fn()
		const handleSelect = jest.fn()
		const handleClose = jest.fn()

		render(
			<MobileCompletionTray
				isOpen
				onClose={handleClose}
				onHighlight={handleHighlight}
				onSelect={handleSelect}
				options={options}
				selectedIndex={0}
			/>
		)

		fireEvent.mouseEnter(screen.getByRole('option', { name: /color:teal/i }))
		await user.click(screen.getByRole('option', { name: /color:teal/i }))
		await user.click(screen.getByRole('button', { name: 'Close suggestions' }))

		expect(handleHighlight).toHaveBeenCalledWith(1)
		expect(handleSelect).toHaveBeenCalledWith(1)
		expect(handleClose).toHaveBeenCalled()
	})
})
