import { render, screen, waitFor } from '@testing-library/react'
import { useMobileAutocompleteViewport } from './use-mobile-autocomplete-viewport'

interface MockVisualViewport {
	height: number
	width: number
	offsetTop: number
	offsetLeft: number
	addEventListener: jest.Mock
	removeEventListener: jest.Mock
}

function ViewportProbe({
	enabled,
	focused,
}: {
	enabled: boolean
	focused: boolean
}) {
	const { keyboardInset, keyboardOpen, visibleViewportHeight, visualViewportRect } =
		useMobileAutocompleteViewport(enabled, focused)

	return (
		<div
			data-testid='viewport-probe'
			data-keyboard-inset={keyboardInset}
			data-keyboard-open={String(keyboardOpen)}
			data-visible-height={visibleViewportHeight}
			data-viewport-bottom={visualViewportRect.bottom}
			data-viewport-width={visualViewportRect.width}
		/>
	)
}

describe('useMobileAutocompleteViewport', () => {
	const originalVisualViewport = window.visualViewport
	const originalInnerHeight = window.innerHeight
	const originalInnerWidth = window.innerWidth

	beforeEach(() => {
		jest.clearAllMocks()
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 900,
			writable: true,
		})
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: 420,
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
		Object.defineProperty(window, 'innerWidth', {
			configurable: true,
			value: originalInnerWidth,
			writable: true,
		})
	})

	it('derives keyboard inset and keyboard-open state from visualViewport metrics', () => {
		const viewportListeners = new Map<string, () => void>()
		const mockVisualViewport: MockVisualViewport = {
			height: 560,
			width: 420,
			offsetTop: 0,
			offsetLeft: 0,
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

		render(<ViewportProbe enabled focused />)

		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-keyboard-inset',
			'340'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-keyboard-open',
			'true'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-visible-height',
			'560'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-viewport-bottom',
			'560'
		)
		expect(mockVisualViewport.addEventListener).toHaveBeenCalledWith(
			'resize',
			expect.any(Function)
		)
		expect(viewportListeners.has('scroll')).toBe(true)
	})

	it('falls back to the layout viewport when visualViewport is unavailable', () => {
		Object.defineProperty(window, 'visualViewport', {
			configurable: true,
			value: undefined,
			writable: true,
		})

		render(<ViewportProbe enabled focused />)

		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-keyboard-inset',
			'0'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-keyboard-open',
			'false'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-visible-height',
			'900'
		)
		expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
			'data-viewport-width',
			'420'
		)
	})

	it('updates keyboard-open when the visual viewport grows back after dismissal', async () => {
		const viewportListeners = new Map<string, () => void>()
		const mockVisualViewport: MockVisualViewport = {
			height: 560,
			width: 420,
			offsetTop: 0,
			offsetLeft: 0,
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

		render(<ViewportProbe enabled focused />)

		mockVisualViewport.height = 830
		viewportListeners.get('resize')?.()

		await waitFor(() => {
			expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
				'data-keyboard-inset',
				'70'
			)
			expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
				'data-keyboard-open',
				'false'
			)
			expect(screen.getByTestId('viewport-probe')).toHaveAttribute(
				'data-visible-height',
				'830'
			)
		})
	})
})
