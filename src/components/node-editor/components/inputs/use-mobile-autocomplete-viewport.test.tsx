import { render, screen } from '@testing-library/react'
import { useMobileAutocompleteViewport } from './use-mobile-autocomplete-viewport'

interface MockVisualViewport {
	height: number
	offsetTop: number
	addEventListener: jest.Mock
	removeEventListener: jest.Mock
}

function ViewportProbe({ enabled }: { enabled: boolean }) {
	const { keyboardInset, visibleViewportHeight } =
		useMobileAutocompleteViewport(enabled)

	return (
		<div
			data-testid='viewport-probe'
			data-keyboard-inset={keyboardInset}
			data-visible-height={visibleViewportHeight}
		/>
	)
}

describe('useMobileAutocompleteViewport', () => {
	const originalVisualViewport = window.visualViewport
	const originalInnerHeight = window.innerHeight

	beforeEach(() => {
		jest.clearAllMocks()
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 900,
			writable: true,
		})
	})

	afterEach(() => {
		Object.defineProperty(window, 'visualViewport', {
			configurable: true,
			value: originalVisualViewport,
			writable: true,
		})
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: originalInnerHeight,
			writable: true,
		})
	})

	it('derives keyboard inset from visualViewport metrics', () => {
		const viewportListeners = new Map<string, () => void>()
		const mockVisualViewport: MockVisualViewport = {
			height: 560,
			offsetTop: 0,
			addEventListener: jest.fn((eventName: string, listener: () => void) => {
				viewportListeners.set(eventName, listener)
			}),
			removeEventListener: jest.fn(),
		}

		Object.defineProperty(window, 'visualViewport', {
			configurable: true,
			value: mockVisualViewport,
			writable: true,
		})

		render(<ViewportProbe enabled />)

		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-keyboard-inset',
			'340'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-visible-height',
			'560'
		)
		expect(mockVisualViewport.addEventListener).toHaveBeenCalledWith(
			'resize',
			expect.any(Function)
		)
		expect(viewportListeners.has('scroll')).toBe(true)
	})

	it('falls back to window.innerHeight when visualViewport is unavailable', () => {
		Object.defineProperty(window, 'visualViewport', {
			configurable: true,
			value: undefined,
			writable: true,
		})

		render(<ViewportProbe enabled />)

		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-keyboard-inset',
			'0'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-visible-height',
			'900'
		)
	})
})
