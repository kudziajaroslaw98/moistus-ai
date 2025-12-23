import { act } from '@testing-library/react'
import useAppStore from '@/store/mind-map-store'

/**
 * Test utilities for working with the Zustand store in tests.
 *
 * Note: According to CLAUDE.md guidelines, we should test real components
 * with actual Zustand state rather than mocking the entire store.
 * These utilities help manage store state during tests.
 */

/**
 * Resets the store to its initial state.
 * Call this in beforeEach() to ensure test isolation.
 *
 * @example
 * beforeEach(() => {
 *   resetStore()
 * })
 */
export function resetStore() {
	act(() => {
		// Get the initial state by creating a fresh store state
		// This ensures each test starts with a clean slate
		const initialState = useAppStore.getInitialState?.() ?? {}
		useAppStore.setState(initialState, true)
	})
}

/**
 * Gets the current store state (non-reactive).
 * Useful for assertions after actions.
 *
 * @example
 * const { nodes } = getStoreState()
 * expect(nodes).toHaveLength(1)
 */
export function getStoreState() {
	return useAppStore.getState()
}

/**
 * Sets partial store state for test setup.
 * Wrap in act() when used during render.
 *
 * @example
 * setStoreState({ nodes: [mockNode], edges: [] })
 */
export function setStoreState(partialState: Parameters<typeof useAppStore.setState>[0]) {
	act(() => {
		useAppStore.setState(partialState)
	})
}

/**
 * Creates a mock node for testing.
 * Provides sensible defaults that can be overridden.
 */
export function createMockNode(overrides: Record<string, unknown> = {}) {
	return {
		id: `test-node-${Date.now()}`,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			label: 'Test Node',
			content: '',
		},
		...overrides,
	}
}

/**
 * Creates a mock edge for testing.
 */
export function createMockEdge(source: string, target: string, overrides: Record<string, unknown> = {}) {
	return {
		id: `edge-${source}-${target}`,
		source,
		target,
		type: 'default',
		...overrides,
	}
}

/**
 * Waits for store state to match a condition.
 * Useful for async state updates.
 *
 * @example
 * await waitForStoreState(state => state.nodes.length > 0)
 */
export async function waitForStoreState(
	predicate: (state: ReturnType<typeof useAppStore.getState>) => boolean,
	timeout = 1000
): Promise<void> {
	const start = Date.now()

	return new Promise((resolve, reject) => {
		const check = () => {
			if (predicate(useAppStore.getState())) {
				resolve()
				return
			}

			if (Date.now() - start > timeout) {
				reject(new Error('waitForStoreState timeout'))
				return
			}

			setTimeout(check, 10)
		}

		check()
	})
}
