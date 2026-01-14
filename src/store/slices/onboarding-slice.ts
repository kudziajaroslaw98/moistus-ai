import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

export interface OnboardingData {
	selectedPlan?: 'free' | 'pro';
	billingCycle?: 'monthly' | 'yearly';
	hasSeenWelcome?: boolean;
	hasSeenBenefits?: boolean;
	hasSeenPricing?: boolean;
	completedAt?: string;
	skippedAt?: string;
}

export interface OnboardingSlice {
	// State
	showOnboarding: boolean;
	onboardingStep: number;
	onboardingDirection: number;
	onboardingData: OnboardingData;
	hasCompletedOnboarding: boolean;
	isAnimating: boolean;

	// Actions
	setShowOnboarding: (show: boolean) => void;
	setOnboardingStep: (step: number) => void;
	updateOnboardingData: (data: Partial<OnboardingData>) => void;
	nextOnboardingStep: () => void;
	previousOnboardingStep: () => void;
	skipOnboarding: () => void;
	completeOnboarding: () => void;
	resetOnboarding: () => void;
	shouldShowOnboarding: () => boolean;
	initializeOnboarding: () => Promise<void>;
	setIsAnimating: (animating: boolean) => void;
}

const ONBOARDING_STORAGE_KEY = 'shiko_onboarding_v1';
const TOTAL_STEPS = 4; // Welcome, Benefits, Pricing, Payment (if pro selected)

// Helper to initialize onboarding state from localStorage synchronously
const getInitialOnboardingState = () => {
	// SSR safety
	if (typeof window === 'undefined') {
		return { showOnboarding: false, hasCompleted: false, data: {}, step: 0 };
	}

	const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
	if (!stored) {
		return { showOnboarding: false, hasCompleted: false, data: {}, step: 0 };
	}

	try {
		const data = JSON.parse(stored);

		// If completed or skipped, mark as completed and don't show
		if (data.completedAt || data.skippedAt) {
			return { showOnboarding: false, hasCompleted: true, data, step: 0 };
		}

		// Has partial progress - restore step but don't show yet (will check auth later)
		return {
			showOnboarding: false,
			hasCompleted: false,
			data,
			step: data.lastStep ?? 0,
		};
	} catch (e) {
		console.error('Error parsing onboarding data:', e);
		return { showOnboarding: false, hasCompleted: false, data: {}, step: 0 };
	}
};

export const createOnboardingSlice: StateCreator<
	AppState,
	[],
	[],
	OnboardingSlice
> = (set, get) => {
	const initialState = getInitialOnboardingState();

	return {
		// Initial state from localStorage
		showOnboarding: initialState.showOnboarding,
		onboardingStep: initialState.step,
		onboardingDirection: 0,
		onboardingData: initialState.data,
		hasCompletedOnboarding: initialState.hasCompleted,
		isAnimating: false,

	// Actions
	setShowOnboarding: (show: boolean) => {
		set({ showOnboarding: show });

		// Save state to localStorage
		if (!show && !get().hasCompletedOnboarding) {
			// If closing without completing, save current progress
			const data = get().onboardingData;

			if (Object.keys(data).length > 0) {
				localStorage.setItem(
					ONBOARDING_STORAGE_KEY,
					JSON.stringify({
						...data,
						lastStep: get().onboardingStep,
						lastSeen: new Date().toISOString(),
					})
				);
			}
		}
	},

	setOnboardingStep: (step: number) => {
		const currentStep = get().onboardingStep;

		// Prevent setting step while animating
		if (get().isAnimating) return;

		// Validate step
		if (step < 0 || step >= TOTAL_STEPS) return;

		set({
			onboardingStep: step,
			isAnimating: true,
		});

		// Reset animation flag after transition
		setTimeout(() => {
			set({ isAnimating: false });
		}, 300);
	},

	updateOnboardingData: (data: Partial<OnboardingData>) => {
		set((state) => ({
			onboardingData: { ...state.onboardingData, ...data },
		}));
	},

	nextOnboardingStep: () => {
		const {
			onboardingStep,
			onboardingData,
			setState,
			completeOnboarding,
			setOnboardingStep,
		} = get();
		setState({ onboardingDirection: 1 });

		// If on pricing step and free plan selected, skip payment step
		if (onboardingStep === 2 && onboardingData.selectedPlan === 'free') {
			completeOnboarding();
			return;
		}

		if (onboardingStep < TOTAL_STEPS - 1) {
			setOnboardingStep(onboardingStep + 1);
		} else {
			completeOnboarding();
		}
	},

	previousOnboardingStep: () => {
		const { onboardingStep, setOnboardingStep, setState } = get();
		setState({ onboardingDirection: -1 });

		if (onboardingStep > 0) {
			setOnboardingStep(onboardingStep - 1);
		}
	},

	skipOnboarding: () => {
		const data: OnboardingData = {
			...get().onboardingData,
			skippedAt: new Date().toISOString(),
			selectedPlan: 'free',
		};

		localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));

		set({
			showOnboarding: false,
			hasCompletedOnboarding: true,
			onboardingData: data,
		});
	},

	completeOnboarding: () => {
		const data: OnboardingData = {
			...get().onboardingData,
			completedAt: new Date().toISOString(),
		};

		localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));

		set({
			showOnboarding: false,
			hasCompletedOnboarding: true,
			onboardingData: data,
		});

		// If user selected a pro plan, they should have already paid
		// The subscription will be active from the subscription slice
	},

	resetOnboarding: () => {
		localStorage.removeItem(ONBOARDING_STORAGE_KEY);

		set({
			showOnboarding: false,
			onboardingStep: 0,
			onboardingData: {},
			hasCompletedOnboarding: false,
			isAnimating: false,
		});
	},

	shouldShowOnboarding: () => {
		// Simple synchronous check - just returns whether we should show based on completion status
		const { hasCompletedOnboarding } = get();
		return !hasCompletedOnboarding;
	},

	initializeOnboarding: async () => {
		// Async initialization - checks auth and subscription to determine if onboarding should show
		const { supabase, hasCompletedOnboarding, currentSubscription, mapAccessError } = get();

		// Don't show onboarding if user was just kicked from a shared map
		// This prevents the confusing UX of showing onboarding after access revocation
		if (mapAccessError?.type === 'access_denied') {
			console.log('initializeOnboarding: Skipping due to access revocation');
			return;
		}

		// Already completed, don't show
		if (hasCompletedOnboarding) return;

		if (!supabase) return;

		// Check if user is authenticated
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			// Not authenticated, don't show onboarding yet
			return;
		}

		// Check if user is anonymous
		const isAnonymous = user.is_anonymous === true;

		// For authenticated users, check if they have a subscription
		if (!isAnonymous) {
			// Check if they already have a paid subscription
			if (currentSubscription && currentSubscription.plan?.name !== 'free') {
				// Already has a paid subscription, mark as completed
				set({ hasCompletedOnboarding: true });
				return;
			}
		}

		// Show onboarding for new users or users without a subscription
		set({ showOnboarding: true });
	},

	setIsAnimating: (isAnimating: boolean) => {
		set({ isAnimating });
	},
	};
};
