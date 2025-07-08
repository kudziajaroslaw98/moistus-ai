// src/store/slices/streaming-toast-slice.ts

import { ToastStep } from '@/types/streaming-toast-state';
import { toast } from 'sonner';
import { StateCreator } from 'zustand';
import { AppState, StreamingToastSlice } from '../app-state';

// Defines the shape of the toast's state

// Defines the actions available on this slice

// Initial state for the toast slice
export const createStreamingToastSlice: StateCreator<
	AppState,
	[],
	[],
	StreamingToastSlice
> = (set, get) => ({
	streamingToast: {
		toastId: null,
		isOpen: false,
		header: '',
		message: '',
		step: 0,
		totalSteps: 1,
		error: null,
		steps: [],
	},

	/**
	 * Shows the toast and sets its initial state.
	 * A unique toastId is generated to prevent conflicts.
	 */
	showStreamingToast: (header: string) => {
		const newToastId = `streaming-toast-${Date.now()}`;
		set({
			streamingToast: {
				toastId: newToastId,
				isOpen: true,
				header,
				message: 'Initializing...', // Default starting message
				step: 0,
				totalSteps: 1, // Will be updated by the first status message
				error: null,
				steps: [],
			},
		});
	},

	/**
	 * Sets the steps for the current streaming process.
	 */
	setStreamSteps: (steps: ToastStep[]) => {
		set((state) => ({
			streamingToast: {
				...state.streamingToast,
				steps: steps,
				totalSteps: steps.length,
			},
		}));
	},

	/**
	 * Updates the content of the currently visible toast.
	 */
	updateStreamingToast: (update) => {
		const { streamingToast } = get();
		const currentStepNumber = update.step ?? streamingToast.step;

		const updatedSteps: ToastStep[] = streamingToast.steps.map((s, index) => {
			const currentStatus = s.status;

			if (index < currentStepNumber - 1) {
				return { ...s, status: 'completed' as const };
			}

			if (index === currentStepNumber - 1) {
				// Don't downgrade from error to active
				return {
					...s,
					status: currentStatus === 'error' ? 'error' : ('active' as const),
				};
			}

			return { ...s, status: 'pending' as const };
		});

		set({
			streamingToast: {
				...streamingToast,
				...update,
				steps: updatedSteps,
				error: null,
			},
		});
	},

	/**
	 * Hides the toast from the UI.
	 */
	hideStreamingToast: () => {
		const { streamingToast } = get();
		console.log('Hiding streaming toast');

		setTimeout(() => {
			toast.dismiss(streamingToast.toastId!);
			set({
				streamingToast: {
					toastId: null,
					isOpen: false,
					header: '',
					message: '',
					step: 0,
					totalSteps: 1,
					error: null,
					steps: [],
				},
			});
		}, 3000);
	},

	/**
	 * Sets an error state for the toast, which will be displayed instead of the message.
	 */
	setStreamingToastError: (error: string) => {
		const { streamingToast } = get();

		const currentStepIndex = streamingToast.step - 1;
		const updatedSteps = [...streamingToast.steps];

		if (currentStepIndex >= 0 && currentStepIndex < updatedSteps.length) {
			updatedSteps[currentStepIndex] = {
				...updatedSteps[currentStepIndex],
				status: 'error',
			};
		}

		set({
			streamingToast: {
				...streamingToast,
				error: error,
				message: 'An error occurred.',
				steps: updatedSteps,
			},
		});
	},

	clearToast: () => {
		set({
			streamingToast: {
				toastId: null,
				isOpen: false,
				header: '',
				message: '',
				step: 0,
				totalSteps: 1,
				error: null,
				steps: [],
			},
		});
	},
});
