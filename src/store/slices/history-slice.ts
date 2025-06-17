import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { StateCreator } from 'zustand';
import { AppState, HistorySlice } from '../app-state';

export const createHistorySlice: StateCreator<
	AppState,
	[],
	[],
	HistorySlice
> = (set, get) => ({
	// state
	history: [],
	historyIndex: -1,
	isReverting: false,
	canUndo: false,
	canRedo: false,

	// getters
	getCurrentHistoryState: () => {
		const { history, historyIndex } = get();
		return history[historyIndex];
	},

	// actions
	/**
	 * Adds a new state to the undo/redo history stack. Avoids consecutive duplicates.
	 * @param actionName Optional name for the action
	 * @param stateOverride Optionally override nodes/edges to save
	 */
	addStateToHistory: (
		actionName?: string,
		stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
	) => {
		const { nodes, edges, history, historyIndex } = get();
		const nodesToSave = stateOverride?.nodes ?? nodes;
		const edgesToSave = stateOverride?.edges ?? edges;
		const stateToPush = {
			nodes: nodesToSave,
			edges: edgesToSave,
			timestamp: Date.now(),
			actionName: actionName || 'unknown',
		};
		const lastHistoryState = history[historyIndex];

		if (
			!lastHistoryState ||
			JSON.stringify({ nodes: stateToPush.nodes, edges: stateToPush.edges }) !==
				JSON.stringify({
					nodes: lastHistoryState.nodes,
					edges: lastHistoryState.edges,
				})
		) {
			const newHistory = [...history.slice(0, historyIndex + 1), stateToPush];
			set({
				history: newHistory,
				historyIndex: newHistory.length - 1,
				canUndo: newHistory.length > 1,
				canRedo: false,
			});
		}
	},

	/**
	 * Undo the last state change, restoring nodes/edges and optionally syncing with DB.
	 */
	handleUndo: async () => {
		const { history, historyIndex, setNodes, setEdges } = get();

		if (historyIndex > 0) {
			const prevState = history[historyIndex - 1];
			setNodes(prevState.nodes);
			setEdges(prevState.edges);
			set({
				historyIndex: historyIndex - 1,
				canUndo: historyIndex - 1 > 0,
				canRedo: true,
			});
			// Optionally: sync with DB here if needed
		}
	},

	/**
	 * Redo the next state change, restoring nodes/edges and optionally syncing with DB.
	 */
	handleRedo: async () => {
		const { history, historyIndex, setNodes, setEdges } = get();

		if (historyIndex < history.length - 1) {
			const nextState = history[historyIndex + 1];
			setNodes(nextState.nodes);
			setEdges(nextState.edges);
			set({
				historyIndex: historyIndex + 1,
				canUndo: true,
				canRedo: historyIndex + 1 < history.length - 1,
			});
			// Optionally: sync with DB here if needed
		}
	},

	/**
	 * Revert to a specific history state by index.
	 * @param index The history index to revert to
	 */
	revertToHistoryState: async (index: number) => {
		const { history, historyIndex, setNodes, setEdges, isReverting } = get();
		if (isReverting || index < 0 || index >= history.length) return;
		if (index === historyIndex) return;
		set({ isReverting: true });
		const targetState = history[index];
		setNodes(targetState.nodes);
		setEdges(targetState.edges);
		set({
			historyIndex: index,
			isReverting: false,
			canUndo: index > 0,
			canRedo: index < history.length - 1,
		});
		// Optionally: sync with DB here if needed
	},
});
