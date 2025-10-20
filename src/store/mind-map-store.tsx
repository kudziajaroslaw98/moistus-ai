import { create } from 'zustand';
import type { AppState } from './app-state';
import { createChatSlice } from './slices/chat-slice';
import { createClipboardSlice } from './slices/clipboard-slice';
import { createCommentsSlice } from './slices/comments-slice';
import { createCoreDataSlice } from './slices/core-slice';
import { createEdgeSlice } from './slices/edges-slice';
import { createGroupsSlice } from './slices/groups-slice';
import { createHistorySlice } from './slices/history-slice';
import { createLayoutSlice } from './slices/layout-slice';
import { createLoadingStateSlice } from './slices/loading-state-slice';
import { createNodeSlice } from './slices/nodes-slice';
import { createOnboardingSlice } from './slices/onboarding-slice';
import { createRealtimeSlice } from './slices/realtime-slice';
import { createSharingSlice } from './slices/sharing-slice';
import { createStreamingToastSlice } from './slices/streaming-toast-slice';
import { createSubscriptionSlice } from './slices/subscription-slice';
import { createSuggestionsSlice } from './slices/suggestions-slice';
import { createQuickInputSlice } from './slices/quick-input-slice';
import { createUiStateSlice } from './slices/ui-slice';
import { createUserProfileSlice } from './slices/user-profile-slice';

const useAppStore = create<AppState>((...args) => ({
	...createCoreDataSlice(...args),
	...createNodeSlice(...args),
	...createEdgeSlice(...args),
	...createClipboardSlice(...args),
	...createUiStateSlice(...args),
	...createLoadingStateSlice(...args),
	...createHistorySlice(...args),
	...createLayoutSlice(...args),
	...createGroupsSlice(...args),
	...createSharingSlice(...args),
	...createSuggestionsSlice(...args),
	...createQuickInputSlice(...args),
	...createRealtimeSlice(...args),
	...createChatSlice(...args),
	...createCommentsSlice(...args),
	...createStreamingToastSlice(...args),
	...createSubscriptionSlice(...args),
	...createOnboardingSlice(...args),
	...createUserProfileSlice(...args),
}));

export default useAppStore;
