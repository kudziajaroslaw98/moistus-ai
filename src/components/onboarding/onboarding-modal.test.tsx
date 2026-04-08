import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { OnboardingModal } from './onboarding-modal'

let mockIsMobile = true
let mockState: Record<string, unknown>

jest.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => mockIsMobile,
}))

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) => selector(mockState)),
}))

const appendOnboardingTarget = (
	target: string,
	rectOverrides?: Partial<DOMRect>
) => {
	const rectState = {
		top: 96,
		left: 48,
		width: 120,
		height: 44,
		bottom: 140,
		right: 168,
		x: 48,
		y: 96,
		...rectOverrides,
	}
	const element = document.createElement('button')
	element.setAttribute('data-onboarding-target', target)
	Object.defineProperty(element, 'getBoundingClientRect', {
		value: () => ({
			...rectState,
			toJSON: () => ({}),
		}),
	})
	document.body.appendChild(element)
	return { element, rectState }
}

describe('OnboardingModal mobile rendering', () => {
	beforeEach(() => {
		mockIsMobile = true
		mockState = {
			onboardingStatus: 'intro',
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
			onboardingActiveTarget: null,
			onboardingCoachmarkStep: 0,
			onboardingIsMinimized: false,
			onboardingCreateNodeStep: null,
			onboardingPatternStep: null,
			onboardingHighlightedNodeId: null,
			onboardingViewport: 'mobile',
			hasCompletedOnboarding: false,
			currentSubscription: null,
			startOnboarding: jest.fn(),
			skipOnboarding: jest.fn(),
			resumeOnboarding: jest.fn(),
			minimizeOnboarding: jest.fn(),
			startOnboardingTask: jest.fn(),
			advanceOnboardingCoachmark: jest.fn(),
			completeOnboarding: jest.fn(),
			dismissOnboardingPatternEditHint: jest.fn(),
			openNodeEditor: jest.fn(),
			reactFlowInstance: null,
			setOnboardingViewport: jest.fn(),
			setPopoverOpen: jest.fn(),
		}
	})

	afterEach(() => {
		document
			.querySelectorAll('[data-onboarding-target], [data-id="created-node-1"]')
			.forEach((element) => element.remove())
	})

	it('renders the mobile intro as a bottom-sheet flow', () => {
		render(<OnboardingModal />)

		expect(
			screen.getByRole('dialog', {
				name: 'Three quick moves to get comfortable fast.',
			})
		).toBeInTheDocument()
		expect(screen.getByTestId('onboarding-intro')).toHaveAttribute(
			'aria-modal',
			'true'
		)
		expect(screen.getByTestId('onboarding-intro')).toHaveClass('z-[38]')
		expect(
			screen.getByText('Three quick moves to get comfortable fast.')
		).toBeInTheDocument()
		expect(screen.getByText('Create a node')).toBeInTheDocument()
		expect(screen.queryByText('Explore on my own')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Skip walkthrough' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Start walkthrough' })).toHaveFocus()
	})

	it('hides the checklist when the mobile create-node hint anchor is resolved', async () => {
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingActiveTarget: 'add-node',
			onboardingCreateNodeStep: 'toolbar',
		}
		appendOnboardingTarget('add-node')

		render(<OnboardingModal />)

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-create-node-hint')).toBeInTheDocument()
		})
		expect(screen.queryByTestId('onboarding-checklist')).not.toBeInTheDocument()
	})

	it('renders the mobile checklist under the top bar and minimizes back into a pill', () => {
		const minimizeOnboarding = jest.fn()
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			minimizeOnboarding,
		}

		render(<OnboardingModal />)

		const checklist = screen.getByTestId('onboarding-checklist')
		expect(checklist).toBeInTheDocument()
		expect(checklist).toHaveClass('inset-x-4')
		expect(checklist).toHaveClass('z-[37]')
		expect(checklist).toHaveStyle({
			top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)',
		})
		expect(screen.queryByTestId('onboarding-minimized-pill')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: /minimize walkthrough/i }))
		expect(minimizeOnboarding).toHaveBeenCalled()
	})

	it('can fully skip the walkthrough from the checklist', () => {
		const skipOnboarding = jest.fn()
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			onboardingActiveTarget: null,
			onboardingCreateNodeStep: null,
			skipOnboarding,
		}

		render(<OnboardingModal />)

		fireEvent.click(screen.getByRole('button', { name: 'Skip walkthrough' }))
		expect(skipOnboarding).toHaveBeenCalled()
	})

	it('does not render skip walkthrough on an active hint surface', async () => {
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingActiveTarget: 'add-node',
			onboardingCreateNodeStep: 'toolbar',
		}
		appendOnboardingTarget('add-node')

		render(<OnboardingModal />)

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-create-node-hint')).toBeInTheDocument()
		})
		expect(screen.getByTestId('onboarding-create-node-hint')).toHaveClass(
			'z-[36]'
		)
		expect(screen.queryByRole('button', { name: 'Skip walkthrough' })).not.toBeInTheDocument()
	})

	it('does not render skip walkthrough on the controls coachmark surface', async () => {
		mockState = {
			...mockState,
			onboardingStatus: 'coachmarks',
			onboardingActiveTarget: 'cursor-tool',
		}
		appendOnboardingTarget('cursor-tool')

		render(<OnboardingModal />)

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-coachmark')).toBeInTheDocument()
		})
		expect(screen.getByTestId('onboarding-coachmark')).toHaveClass('z-[37]')
		expect(screen.getByTestId('onboarding-coachmark')).toHaveStyle({
			bottom:
				'calc(env(safe-area-inset-bottom, 0px) + var(--mind-map-toolbar-clearance, 0px) + 1rem)',
		})
		expect(screen.queryByRole('button', { name: 'Skip walkthrough' })).not.toBeInTheDocument()
	})

	it('can fully skip the walkthrough from the intro', () => {
		const skipOnboarding = jest.fn()
		mockState = {
			...mockState,
			onboardingStatus: 'intro',
			skipOnboarding,
		}

		render(<OnboardingModal />)

		fireEvent.click(screen.getByRole('button', { name: 'Skip walkthrough' }))
		expect(skipOnboarding).toHaveBeenCalled()
	})

	it('expands the minimized mobile pill back into the checklist', () => {
		const resumeOnboarding = jest.fn()
		mockState = {
			...mockState,
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			resumeOnboarding,
		}

		render(<OnboardingModal />)

		fireEvent.click(screen.getByRole('button', { name: /expand walkthrough/i }))
		expect(resumeOnboarding).toHaveBeenCalled()
	})

	it('expands a minimized first-task pill on mobile without auto-starting hint overlays', async () => {
		const resumeOnboarding = jest.fn(() => {
			mockState = {
				...mockState,
				onboardingStatus: 'checklist',
				onboardingIsMinimized: false,
				onboardingActiveTarget: 'add-node',
				onboardingCreateNodeStep: 'toolbar',
			}
		})

		mockState = {
			...mockState,
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
			onboardingActiveTarget: null,
			onboardingCreateNodeStep: 'toolbar',
			resumeOnboarding,
		}
		appendOnboardingTarget('add-node')

		const { rerender } = render(<OnboardingModal />)

		fireEvent.click(screen.getByRole('button', { name: /expand walkthrough/i }))
		expect(resumeOnboarding).toHaveBeenCalled()

		rerender(<OnboardingModal />)

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument()
		})
		expect(
			screen.queryByTestId('onboarding-create-node-hint')
		).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Skip walkthrough' })).toBeInTheDocument()
	})

	it('launches the next task directly from the desktop minimized pill', () => {
		const resumeOnboarding = jest.fn()
		const startOnboardingTask = jest.fn()
		const openNodeEditor = jest.fn()
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			resumeOnboarding,
			startOnboardingTask,
			openNodeEditor,
		}

		render(<OnboardingModal />)

		const pill = screen.getByTestId('onboarding-minimized-pill')
		expect(pill).toBeInTheDocument()
		expect(pill).toHaveClass('left-4')
		expect(pill).toHaveClass('justify-start')
		expect(pill).toHaveClass('z-[37]')
		expect(pill).not.toHaveClass('right-4')
		expect(pill).toHaveStyle({ top: '6rem' })
		expect(screen.queryByTestId('onboarding-checklist')).not.toBeInTheDocument()
		expect(screen.getByText('Try a pattern')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: /expand walkthrough/i }))
		expect(resumeOnboarding).toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Start' }))
		expect(startOnboardingTask).toHaveBeenCalledWith('try-pattern')
		expect(openNodeEditor).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'create',
				initialValue: '$task Review PR ^tomorrow #backend',
				onboardingSource: 'onboarding-pattern',
			})
		)
	})

	it('shows controls tour as the minimized next action when a paused coachmark tour exists', () => {
		const resumeOnboarding = jest.fn()
		const startOnboardingTask = jest.fn()
		mockState = {
			...mockState,
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingCoachmarkStep: 2,
			onboardingActiveTarget: 'layout',
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
			resumeOnboarding,
			startOnboardingTask,
		}

		render(<OnboardingModal />)

		expect(screen.getByText('Know the controls')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: /expand walkthrough/i }))
		expect(resumeOnboarding).toHaveBeenCalled()
		expect(startOnboardingTask).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
		expect(startOnboardingTask).toHaveBeenCalledWith('know-controls')
	})

	it('shows Continue for know-controls in checklist when paused controls-tour progress exists', () => {
		const startOnboardingTask = jest.fn()
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingCoachmarkStep: 2,
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			startOnboardingTask,
		}

		render(<OnboardingModal />)

		const controlsHeading = screen.getByRole('heading', {
			name: 'Know the controls',
		})
		const controlsRow = controlsHeading.parentElement
		expect(controlsRow).not.toBeNull()

		fireEvent.click(
			within(controlsRow as HTMLElement).getByRole('button', {
				name: 'Continue',
			})
		)
		expect(startOnboardingTask).toHaveBeenCalledWith('know-controls')
	})

	it('disables completed checklist task actions so done tasks cannot restart', () => {
		const startOnboardingTask = jest.fn()
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			startOnboardingTask,
		}

		render(<OnboardingModal />)

		const doneButton = screen.getByRole('button', { name: 'Done' })
		expect(doneButton).toBeDisabled()

		fireEvent.click(doneButton)
		expect(startOnboardingTask).not.toHaveBeenCalled()
	})

	it('anchors the desktop checklist surface to the left edge', () => {
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			onboardingActiveTarget: null,
		}

		render(<OnboardingModal />)

		const checklist = screen.getByTestId('onboarding-checklist')
		expect(checklist).toHaveClass('left-4')
		expect(checklist).toHaveClass('justify-start')
		expect(checklist).toHaveClass('z-[37]')
		expect(checklist).not.toHaveClass('right-4')
	})

	it('falls back to the checklist when the refreshed desktop create-node anchor is unresolved, then keeps the checklist visible once it resolves', async () => {
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingActiveTarget: 'add-node',
			onboardingCreateNodeStep: 'toolbar',
		}

		render(<OnboardingModal />)

		expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument()
		expect(
			screen.queryByTestId('onboarding-create-node-hint')
		).not.toBeInTheDocument()
		expect(
			document.querySelector('div[aria-hidden="true"]')
		).not.toBeInTheDocument()

		appendOnboardingTarget('add-node')

		await waitFor(() => {
			expect(
				screen.getByTestId('onboarding-create-node-hint')
			).toBeInTheDocument()
		})
		expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument()
		const spotlight = document.querySelector('div[aria-hidden="true"]')
		expect(spotlight).toBeInTheDocument()
		expect(spotlight).toHaveClass('z-[35]')
	})

	it('falls back to the checklist when the refreshed desktop controls target is unresolved, then returns to the coachmark once it resolves', async () => {
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'coachmarks',
			onboardingActiveTarget: 'cursor-tool',
			onboardingCoachmarkStep: 0,
		}

		render(<OnboardingModal />)

		expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument()
		expect(screen.queryByTestId('onboarding-coachmark')).not.toBeInTheDocument()

		appendOnboardingTarget('cursor-tool')

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-coachmark')).toBeInTheDocument()
		})
		expect(screen.queryByTestId('onboarding-checklist')).not.toBeInTheDocument()
	})

	it('refits the desktop controls coachmark when the target moves after the toolbar settles', async () => {
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'coachmarks',
			onboardingActiveTarget: 'cursor-tool',
			onboardingCoachmarkStep: 0,
		}

		const { rectState } = appendOnboardingTarget('cursor-tool', {
			top: 620,
			left: 80,
			width: 120,
			height: 44,
			bottom: 664,
			right: 200,
			x: 80,
			y: 620,
		})

		render(<OnboardingModal />)

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-coachmark')).toHaveStyle({
				top: '372px',
			})
		})

		Object.assign(rectState, {
			top: 96,
			left: 48,
			bottom: 140,
			right: 168,
			x: 48,
			y: 96,
		})

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-coachmark')).toHaveStyle({
				top: '168px',
			})
		})
	})

	it('keeps the desktop upsell below side panels while anchored to the right', () => {
		mockIsMobile = false
		mockState = {
			...mockState,
			onboardingStatus: 'upsell',
			currentSubscription: null,
		}

		render(<OnboardingModal />)

		const upsell = screen.getByTestId('onboarding-upsell')
		expect(upsell).toHaveClass('z-[37]')
		expect(upsell).toHaveClass('right-4')
	})
})
