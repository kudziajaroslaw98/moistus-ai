import { render, screen } from '@testing-library/react'
import { SidePanel } from './side-panel'

describe('SidePanel layering', () => {
	it('keeps backdrop and panel z-index contract intact', () => {
		render(
			<SidePanel
				isOpen
				onClose={jest.fn()}
				title='Layer Test'
				data-testid='side-panel-under-test'
			>
				<div>Panel content</div>
			</SidePanel>
		)

		const panel = screen.getByTestId('side-panel-under-test')
		expect(panel).toHaveClass('z-40')
		expect(panel.parentElement).toHaveClass('z-[39]')
	})
})
