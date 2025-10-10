'use client';

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'; // Keep shortcuts here
import { cn } from '@/utils/cn';
import { useCallback, useEffect, useMemo } from 'react';
import { ModalsWrapper } from './mind-map/modals-wrapper';
import { ReactFlowArea } from './mind-map/react-flow-area';
import NodeEditor from './node-editor/node-editor';

import { useRealtimeSelectionPresenceRoom } from '@/hooks/realtime/use-realtime-selection-presence-room';
import useAppStore from '@/store/mind-map-store';
import { useParams } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { AIStreamMediator } from './ai/ai-stream-mediator';
import { CommandPalette } from './command-palette';
import { ContextMenuWrapper } from './mind-map/context-menu-wrapper';
import { StreamingToast } from './streaming-toast';

export function MindMapCanvas() {
	const params = useParams();
	const mapId = params.id as string;

	// Consume necessary values for keyboard shortcuts
	const {
		handleUndo,
		handleRedo,
		handleCopy,
		handlePaste,
		edges,
		selectedNodes,
		canUndo,
		canRedo,
		loadingStates,
		setPopoverOpen,
		popoverOpen,
		isFocusMode,
		createGroupFromSelected,
		ungroupNodes,
		toggleNodeCollapse,
		currentUser,
		getCurrentUser,
		openNodeEditor,
	} = useAppStore(
		useShallow((state) => ({
			handleUndo: state.handleUndo,
			handleRedo: state.handleRedo,
			handleCopy: state.copySelectedNodes,
			handlePaste: state.pasteNodes,
			edges: state.edges,
			selectedNodes: state.selectedNodes,
			canUndo: state.canUndo,
			canRedo: state.canRedo,
			loadingStates: state.loadingStates,
			setPopoverOpen: state.setPopoverOpen,
			popoverOpen: state.popoverOpen,
			isFocusMode: state.isFocusMode,
			createGroupFromSelected: state.createGroupFromSelected,
			ungroupNodes: state.ungroupNodes,
			toggleNodeCollapse: state.toggleNodeCollapse,
			currentUser: state.currentUser,
			getCurrentUser: state.getCurrentUser,
			openNodeEditor: state.openNodeEditor,
		}))
	);
	const isLoading = loadingStates.isStateLoading;

	useRealtimeSelectionPresenceRoom(`mind-map:${mapId}:selected-nodes`);

	// Initialize current user on mount
	useEffect(() => {
		if (!currentUser) {
			getCurrentUser();
		}
	}, [currentUser, getCurrentUser]);

	const selectedNodeId = selectedNodes[0]?.id;
	const selectedEdgeId = useMemo(
		() => edges.find((e) => e.selected)?.id,
		[edges]
	);

	const handleGroup = useCallback(() => {
		if (selectedNodes.length >= 2) {
			createGroupFromSelected();
		}
	}, [selectedNodes, createGroupFromSelected]);

	const handleUngroup = useCallback(() => {
		if (selectedNodes.length === 1 && selectedNodes[0].data.metadata?.isGroup) {
			ungroupNodes(selectedNodes[0].id);
		}
	}, [selectedNodes, ungroupNodes]);

	const handleToggleCollapse = useCallback(() => {
		if (selectedNodes.length === 1) {
			toggleNodeCollapse(selectedNodes[0].id);
		}
	}, [selectedNodes, toggleNodeCollapse]);

	useKeyboardShortcuts({
		onUndo: handleUndo,
		onRedo: handleRedo,
		onAddChild: () => {
			const selected = selectedNodes[0];
			openNodeEditor({
				mode: 'create',
				position: {
					x: selected.position.x + (selected.measured?.width ?? 0) + 100,
					y: selected.position.y,
				},
			});
		},
		onCopy: handleCopy,
		onPaste: handlePaste,
		selectedNodeId: selectedNodeId,
		selectedEdgeId: selectedEdgeId,
		canUndo: canUndo,
		canRedo: canRedo,
		isBusy: isLoading,
		onGroup: handleGroup,
		onUngroup: handleUngroup,
		onToggleCollapse: handleToggleCollapse,
	});

	return (
		// Context Provider is now wrapping this component higher up
		<div className='relative h-full w-full overflow-hidden rounded-md flex'>
			{/* Main content area */}
			<div className='flex-1 relative w-full'>
				{popoverOpen.commandPalette && <CommandPalette />}

				<AIStreamMediator />

				<StreamingToast />

				<ModalsWrapper />

				<NodeEditor />

				{/* Position the ReactFlowArea */}
				<div
					className={cn([
						'relative w-full transition-all duration-200 ease-in-out',
						isFocusMode ? 'h-full mt-0' : 'h-full',
					])}
				>
					<ContextMenuWrapper />

					<ReactFlowArea />
				</div>
			</div>
		</div>
	);
}
