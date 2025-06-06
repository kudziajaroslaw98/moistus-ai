import type { StateCreator } from 'zustand';
import type { AppState, LoadingStatesSlice } from '../app-state';

export const createLoadingStateSlice: StateCreator<
	AppState,
	[],
	[],
	LoadingStatesSlice
> = (set, get) => ({
	loadingStates: {
		isAddingContent: false,
		isStateLoading: false,
		isGenerating: false,
		isSummarizing: false,
		isExtracting: false,
		isSearching: false,
		isGeneratingContent: false,
		isSuggestingConnections: false,
		isSummarizingBranch: false,
		isSuggestingMerges: false,
		isSavingNode: false,
		isSavingEdge: false,
		isApplyingLayout: false,
		isLoadingComments: false,
		isSavingComment: false,
		isDeletingComment: false,
	},

	setLoadingStates: (loadingStates) => {
		set({ loadingStates: { ...get().loadingStates, ...loadingStates } });
	},
});
