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
import { createRealtimeSlice } from './slices/realtime-slice';
import { createSharingSlice } from './slices/sharing-slice';
import { createStreamingToastSlice } from './slices/streaming-toast-slice';
import { createSuggestionsSlice } from './slices/suggestions-slice';
import { createUiStateSlice } from './slices/ui-slice';

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
	...createCommentsSlice(...args),
	...createSharingSlice(...args),
	...createSuggestionsSlice(...args),
	...createRealtimeSlice(...args),
	...createChatSlice(...args),
	...createStreamingToastSlice(...args),
}));

export default useAppStore;
