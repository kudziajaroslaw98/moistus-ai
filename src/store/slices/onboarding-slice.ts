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
	setIsAnimating: (animating: boolean) => void;
}

const ONBOARDING_STORAGE_KEY = 'moistus_onboarding_v1';
const TOTAL_STEPS = 4; // Welcome, Benefits, Pricing, Payment (if pro selected)

export const createOnboardingSlice: StateCreator<
	AppState,
	[],
	[],
	OnboardingSlice
> = (set, get) => ({
	// Initial state
	showOnboarding: false,
	onboardingStep: 0,
	onboardingDirection: 0,
	onboardingData: {},
	hasCompletedOnboarding: false,
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
		// Check if we should show onboarding based on various conditions

		const { supabase } = get();
		if (!supabase) return false;

		// Check localStorage first
		const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);

		if (stored) {
			try {
				const data = JSON.parse(stored);

				// If completed or skipped, don't show
				if (data.completedAt || data.skippedAt) {
					set({
						hasCompletedOnboarding: true,
						onboardingData: data,
					});
					return false;
				}

				// If has partial progress, restore it
				if (data.lastStep !== undefined) {
					set({
						onboardingData: data,
						onboardingStep: data.lastStep,
					});
				}
			} catch (e) {
				console.error('Error parsing onboarding data:', e);
			}
		}

		// Check if user is authenticated
		const checkAuth = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				// Not authenticated, don't show onboarding yet
				return false;
			}

			// Check if user is anonymous
			const isAnonymous = user.is_anonymous === true;

			// For anonymous users, we might want to show onboarding
			// For authenticated users, check if they have a subscription
			if (!isAnonymous) {
				// Check if they already have a subscription
				const { currentSubscription } = get();

				if (currentSubscription && currentSubscription.plan?.name !== 'free') {
					// Already has a paid subscription, don't show onboarding
					set({ hasCompletedOnboarding: true });
					return false;
				}
			}

			// Show onboarding for new users or users without a subscription
			return true;
		};

		// This is async, so we'll need to handle it differently
		checkAuth().then((shouldShow) => {
			if (shouldShow) {
				set({ showOnboarding: true });
			}
		});

		return false; // Return false for now, actual showing is handled async
	},

	setIsAnimating: (isAnimating: boolean) => {
		set({ isAnimating });
	},
});
