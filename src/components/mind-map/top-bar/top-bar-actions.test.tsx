import { fireEvent, render, screen } from '@testing-library/react'

import { TopBarActions } from './top-bar-actions'

describe('TopBarActions', () => {
	it('anchors the history control for onboarding and opens history when clicked', () => {
		const onToggleHistory = jest.fn()

		render(<TopBarActions onToggleHistory={onToggleHistory} />)

		const historyButton = screen.getByRole('button', {
			name: 'Toggle History Sidebar',
		})

		expect(historyButton).toHaveAttribute('data-onboarding-target', 'history')

		fireEvent.click(historyButton)
		expect(onToggleHistory).toHaveBeenCalledTimes(1)
	})
})
