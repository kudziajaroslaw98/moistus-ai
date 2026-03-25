import { fireEvent, render, screen } from '@testing-library/react'
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

	it('renders the mobile intro as a bottom-sheet flow', () => {
		render(<OnboardingModal />)

		expect(screen.getByTestId('onboarding-intro')).toBeInTheDocument()
		expect(
			screen.getByText('Three quick moves to get comfortable fast.')
		).toBeInTheDocument()
		expect(screen.getByText('Create a node')).toBeInTheDocument()
		expect(screen.queryByText('Explore on my own')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Skip walkthrough' })).toBeInTheDocument()
	})

	it('hides the checklist when the mobile create-node hint is active', () => {
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingActiveTarget: 'add-node',
			onboardingCreateNodeStep: 'toolbar',
		}

		render(<OnboardingModal />)

		expect(screen.queryByTestId('onboarding-checklist')).not.toBeInTheDocument()
		expect(screen.getByTestId('onboarding-create-node-hint')).toBeInTheDocument()
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

	it('does not render skip walkthrough on an active hint surface', () => {
		mockState = {
			...mockState,
			onboardingStatus: 'checklist',
			onboardingActiveTarget: 'add-node',
			onboardingCreateNodeStep: 'toolbar',
		}

		render(<OnboardingModal />)

		expect(screen.queryByRole('button', { name: 'Skip walkthrough' })).not.toBeInTheDocument()
	})

	it('does not render skip walkthrough on the controls coachmark surface', () => {
		mockState = {
			...mockState,
			onboardingStatus: 'coachmarks',
			onboardingActiveTarget: 'add-node',
		}

		render(<OnboardingModal />)

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
})
