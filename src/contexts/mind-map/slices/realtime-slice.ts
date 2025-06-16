import { StateCreator } from 'zustand';
import { AppState, RealtimeSlice } from '../app-state';

export const createRealtimeSlice: StateCreator<
	AppState,
	[],
	[],
	RealtimeSlice
> = (set, get) => ({
	// state
	realtimeSelectedNodes: [],

	// setters
	setRealtimeSelectedNodes: (nodes) => {
		set({ realtimeSelectedNodes: nodes });
	},
});
