/**
 * Custom hook for NodeEditor state and actions
 * Centralizes NodeEditor logic and provides clean interface
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import useAppStore from '@/store/mind-map-store';
import type { NodeCommand } from '../types';
import { getCommandByType, nodeCommands } from '../node-commands';

export interface UseNodeEditorReturn {
	// State
	isOpen: boolean;
	mode: 'create' | 'edit';
	selectedCommand: string | null;
	existingNodeId: string | null;
	existingNode: any;
	filterQuery: string;
	
	// UI State
	activeIndex: number | null;
	showTypePicker: boolean;
	
	// Actions
	closeEditor: () => void;
	setCommand: (command: string) => void;
	setMode: (mode: 'create' | 'edit') => void;
	setFilterQuery: (query: string) => void;
	setActiveIndex: (index: number | null) => void;
	setShowTypePicker: (show: boolean) => void;
	
	// Computed
	availableCommands: NodeCommand[];
	filteredCommands: NodeCommand[];
	
	// Utils
	resetEditor: () => void;
	autoSelectCommandForNode: () => void;
}

/**
 * Custom hook that manages NodeEditor state and provides actions
 */
export const useNodeEditor = (): UseNodeEditorReturn => {
	// Zustand store selectors
	const {
		nodeEditor,
		closeNodeEditor,
		setNodeEditorCommand,
		setNodeEditorMode,
		setNodeEditorFilterQuery,
		nodes,
	} = useAppStore(
		useShallow((state) => ({
			nodeEditor: state.nodeEditor,
			closeNodeEditor: state.closeNodeEditor,
			setNodeEditorCommand: state.setNodeEditorCommand,
			setNodeEditorMode: state.setNodeEditorMode,
			setNodeEditorFilterQuery: state.setNodeEditorFilterQuery,
			nodes: state.nodes,
		}))
	);

	// Local UI state
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [showTypePicker, setShowTypePicker] = useState(false);
	const initializedRef = useRef<string | null>(null);

	// Extract state from store
	const isOpen = nodeEditor.isOpen;
	const mode = nodeEditor.mode;
	const selectedCommand = nodeEditor.selectedCommand;
	const existingNodeId = nodeEditor.existingNodeId;
	const filterQuery = nodeEditor.filterQuery || '';

	// Get existing node data
	const existingNode = useMemo(() => {
		if (!existingNodeId) return undefined;
		return nodes.find(node => node.id === existingNodeId);
	}, [existingNodeId, nodes]);

	// Available and filtered commands
	const availableCommands = useMemo(() => nodeCommands, []);
	
	const filteredCommands = useMemo(() => {
		if (!filterQuery) return availableCommands;
		const query = filterQuery.toLowerCase();
		return availableCommands.filter(command =>
			command.label.toLowerCase().includes(query) ||
			command.command.toLowerCase().includes(query) ||
			command.description.toLowerCase().includes(query)
		);
	}, [availableCommands, filterQuery]);

	// Auto-select command for existing nodes in edit mode
	const autoSelectCommandForNode = useCallback(() => {
		if (mode === 'edit' && existingNode && !selectedCommand && !showTypePicker) {
			const nodeType = existingNode.data?.node_type;

			if (nodeType) {
				const command = getCommandByType(nodeType);

				if (command) {
					setNodeEditorCommand(command.command);

					// Only reset showTypePicker if this is a new node being opened
					if (initializedRef.current !== existingNodeId) {
						setShowTypePicker(false);
					}
				}
			}
		}
	}, [mode, existingNode, selectedCommand, existingNodeId, setNodeEditorCommand, showTypePicker]);

	// Reset showTypePicker only when NodeEditor first opens for a different node
	useEffect(() => {
		if (isOpen && mode === 'edit' && existingNodeId) {
			// Only reset if this is a different node than last time
			if (initializedRef.current !== existingNodeId) {
				setShowTypePicker(false);
				initializedRef.current = existingNodeId;
			}
		}
		
		// Clean up when editor closes
		if (!isOpen) {
			initializedRef.current = null;
		}
	}, [isOpen, mode, existingNodeId]);

	// Auto-select command effect
	useEffect(() => {
		autoSelectCommandForNode();
	}, [autoSelectCommandForNode]);

	// Reset editor state
	const resetEditor = useCallback(() => {
		setActiveIndex(null);
		setShowTypePicker(false);
		setNodeEditorFilterQuery('');
		setNodeEditorCommand(null);
		initializedRef.current = null;
	}, [setNodeEditorFilterQuery, setNodeEditorCommand]);

	// Enhanced actions with error handling
	const closeEditor = useCallback(() => {
		try {
			resetEditor();
			closeNodeEditor();
		} catch (error) {
			console.error('Error closing node editor:', error);
			closeNodeEditor(); // Fallback
		}
	}, [resetEditor, closeNodeEditor]);

	const setCommand = useCallback((command: string) => {
		try {
			setNodeEditorCommand(command);
		} catch (error) {
			console.error('Error setting node editor command:', error);
		}
	}, [setNodeEditorCommand]);

	const setMode = useCallback((newMode: 'create' | 'edit') => {
		try {
			setNodeEditorMode(newMode);
		} catch (error) {
			console.error('Error setting node editor mode:', error);
		}
	}, [setNodeEditorMode]);

	const setFilterQuery = useCallback((query: string) => {
		try {
			setNodeEditorFilterQuery(query);
		} catch (error) {
			console.error('Error setting filter query:', error);
		}
	}, [setNodeEditorFilterQuery]);

	return {
		// State
		isOpen,
		mode,
		selectedCommand,
		existingNodeId,
		existingNode,
		filterQuery,
		
		// UI State
		activeIndex,
		showTypePicker,
		
		// Actions
		closeEditor,
		setCommand,
		setMode,
		setFilterQuery,
		setActiveIndex,
		setShowTypePicker,
		
		// Computed
		availableCommands,
		filteredCommands,
		
		// Utils
		resetEditor,
		autoSelectCommandForNode,
	};
};