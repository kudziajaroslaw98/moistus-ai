// src/store/slices/streaming-toast-slice.ts

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
			},
		});
	},

	/**
	 * Updates the content of the currently visible toast.
	 */
	updateStreamingToast: (update) => {
		set((state) => ({
			streamingToast: { ...state.streamingToast, ...update, error: null },
		}));
	},

	/**
	 * Hides the toast from the UI.
	 */
	hideStreamingToast: () => {
		set((state) => ({
			streamingToast: { ...state.streamingToast, isOpen: false },
		}));
	},

	/**
	 * Sets an error state for the toast, which will be displayed instead of the message.
	 */
	setStreamingToastError: (error: string) => {
		set((state) => ({
			streamingToast: {
				...state.streamingToast,
				error: error,
				message: 'An error occurred.',
			},
		}));
	},
});
