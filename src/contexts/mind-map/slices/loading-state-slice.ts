import type { StateCreator } from "zustand";
import type { AppState } from "../app-state";

export interface LoadingStates {
  isAddingContent: boolean;
  isStateLoading: boolean;
  isGenerating: boolean;
  isSummarizing: boolean;
  isExtracting: boolean;
  isSearching: boolean;
  isGeneratingContent: boolean;
  isSuggestingConnections: boolean;
  isSummarizingBranch: boolean;
  isSuggestingMerges: boolean;
  isSavingNode: boolean;
  isSavingEdge: boolean;
  isApplyingLayout: boolean;
  isLoadingComments: boolean;
  isSavingComment: boolean;
  isDeletingComment: boolean;
}

export interface LoadingStatesSlice {
  // Loading state
  loadingStates: LoadingStates;

  // Loading setters
  setLoadingStates: (loadingStates: Partial<LoadingStates>) => void;
}

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
