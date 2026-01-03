import { create } from 'zustand';
import type { AppState } from './app-state';
import { createChatSlice } from './slices/chat-slice';
import { createClipboardSlice } from './slices/clipboard-slice';
import { createCommentsSlice } from './slices/comments-slice';
import { createCoreDataSlice } from './slices/core-slice';
import { createEdgeSlice } from './slices/edges-slice';
import { createExportSlice } from './slices/export-slice';
import { createGroupsSlice } from './slices/groups-slice';
import { createHistorySlice } from './slices/history-slice';
import { createLayoutSlice } from './slices/layout-slice';
import { createLoadingStateSlice } from './slices/loading-state-slice';
import { createNodeSlice } from './slices/nodes-slice';
import { createOnboardingSlice } from './slices/onboarding-slice';
import { createGuidedTourSlice } from './slices/guided-tour-slice';
import { createQuickInputSlice } from './slices/quick-input-slice';
import { createRealtimeSlice } from './slices/realtime-slice';
import { createSharingSlice } from './slices/sharing-slice';
import { createStreamingToastSlice } from './slices/streaming-toast-slice';
import { createSubscriptionSlice } from './slices/subscription-slice';
import { createSuggestionsSlice } from './slices/suggestions-slice';
import { createUiStateSlice } from './slices/ui-slice';
import { createUserProfileSlice } from './slices/user-profile-slice';

const sliceCreators = [
	createCoreDataSlice,
	createNodeSlice,
	createEdgeSlice,
	createClipboardSlice,
	createUiStateSlice,
	createLoadingStateSlice,
	createHistorySlice,
	createGroupsSlice,
	createSharingSlice,
	createSuggestionsSlice,
	createQuickInputSlice,
	createRealtimeSlice,
	createChatSlice,
	createCommentsSlice,
	createStreamingToastSlice,
	createSubscriptionSlice,
	createOnboardingSlice,
	createUserProfileSlice,
	createLayoutSlice,
	createExportSlice,
	createGuidedTourSlice,
];

const useAppStore = create<AppState>((set, get, api) => {
	// Helper to create state from all slices
	const createState = () => {
		return sliceCreators.reduce((state, creator) => {
			return { ...state, ...creator(set, get, api) };
		}, {} as AppState);
	};

	const initialState = createState();

	return {
		...initialState,
		reset: () => {
			const freshState = createState();
			set(freshState, true);
		},
	};
});

export default useAppStore;
