import { render, waitFor } from '@testing-library/react'
import useAppStore from '@/store/mind-map-store'
import { PathBuilder } from './path-builder'
import { SpotlightOverlay } from './spotlight-overlay'
import { TourControls } from './tour-controls'

let mockState: Record<string, unknown>

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) => selector(mockState)),
}))

describe('Guided tour layering', () => {
	beforeEach(() => {
		mockState = {
			isPathEditMode: true,
			pendingPath: [],
			savedPaths: [],
			nodes: [],
			exitPathEditMode: jest.fn(),
			clearPendingPath: jest.fn(),
			removeNodeFromPath: jest.fn(),
			savePath: jest.fn(),
			deletePath: jest.fn(),
			startTour: jest.fn(),
			enterPathEditMode: jest.fn(),
		}
	})

	afterEach(() => {
		document.querySelectorAll('[data-id="spotlight-node"]').forEach((el) => {
			el.remove()
		})
		jest.clearAllMocks()
	})

	it('keeps spotlight glow and dim overlays below side panels', async () => {
		const spotlightNode = document.createElement('div')
		spotlightNode.setAttribute('data-id', 'spotlight-node')
		Object.defineProperty(spotlightNode, 'getBoundingClientRect', {
			value: () => ({
				top: 120,
				left: 160,
				width: 240,
				height: 120,
				bottom: 240,
				right: 400,
				x: 160,
				y: 120,
				toJSON: () => ({}),
			}),
		})
		document.body.appendChild(spotlightNode)

		const { container } = render(
			<SpotlightOverlay isActive spotlightNodeId='spotlight-node' />
		)

		await waitFor(() => {
			expect(container.querySelector('.z-\\[35\\]')).toBeInTheDocument()
			expect(container.querySelector('.z-\\[34\\]')).toBeInTheDocument()
		})
	})

	it('renders tour controls with z-index below side panels', () => {
		const { container } = render(
			<TourControls
				currentStop={{
					nodeId: 'node-1',
					index: 0,
					total: 3,
					title: 'Intro stop',
					content: 'Tour content',
					nodeType: 'taskNode',
				}}
				isFullscreen={false}
				showInfoBar
				onExit={jest.fn()}
				onGoToStop={jest.fn()}
				onNext={jest.fn()}
				onPrevious={jest.fn()}
				onToggleFullscreen={jest.fn()}
			/>
		)

		expect(container.querySelectorAll('.z-\\[37\\]')).toHaveLength(2)
	})

	it('renders path builder below side panels', () => {
		const { container } = render(<PathBuilder />)

		expect(jest.mocked(useAppStore).mock.calls.length).toBeGreaterThan(0)
		expect(container.querySelector('.z-\\[37\\]')).toBeInTheDocument()
	})
})