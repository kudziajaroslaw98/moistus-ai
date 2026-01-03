import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'

/**
 * Custom render function that wraps components with necessary providers.
 * Extend this wrapper as needed when adding global providers (e.g., theme, auth).
 *
 * Usage:
 *   import { render, screen } from '@/__tests__/utils/render-with-providers'
 *   render(<MyComponent />)
 */

interface WrapperProps {
	children: ReactNode
}

function AllProviders({ children }: WrapperProps) {
	// Add providers here as needed (e.g., ThemeProvider, ToastProvider)
	// Currently a passthrough - extend when global providers are required
	return <>{children}</>
}

/**
 * Renders a component with all necessary providers for testing.
 * Drop-in replacement for @testing-library/react render.
 */
export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>
) {
	return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from testing-library for convenience
export * from '@testing-library/react'

// Export renderWithProviders as default render for easy import
export { renderWithProviders as render }
