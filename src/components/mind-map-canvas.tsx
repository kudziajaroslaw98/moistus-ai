'use client';

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'; // Keep shortcuts here
import { cn } from '@/utils/cn';
import { useCallback, useEffect, useMemo } from 'react';
import NodeEditor from './node-editor2';
import { ModalsWrapper } from './mind-map/modals-wrapper';
import { ReactFlowArea } from './mind-map/react-flow-area';

import { useRealtimeSelectionPresenceRoom } from '@/hooks/realtime/use-realtime-selection-presence-room';
import useAppStore from '@/store/mind-map-store';
import { useParams } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { AiChat } from './ai-chat/ai-chat';
import { AIStreamMediator } from './ai/ai-stream-mediator';
import { CommandPalette } from './command-palette';
import { CommentsPanel } from './comment/comment-panel';
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
		isCommentsPanelOpen,
		currentUser,
		getCurrentUser,
		setNodeInfo,
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
			isCommentsPanelOpen: state.isCommentsPanelOpen,
			currentUser: state.currentUser,
			getCurrentUser: state.getCurrentUser,
			setNodeInfo: state.setNodeInfo,
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

	const openNodeTypeModal = (parentId?: string | null) => {
		// If parentId is provided, find and set the parent node
		if (parentId) {
			const parentNode = selectedNodes.find((node) => node.id === parentId);

			if (parentNode) {
				setNodeInfo(parentNode);
			}
		}

		setPopoverOpen({ nodeType: true });
	};

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

	const handleToggleComments = useCallback(() => {
		setPopoverOpen({ commentsPanel: !popoverOpen.commentsPanel });
	}, [popoverOpen.commentsPanel]);

	useKeyboardShortcuts({
		onUndo: handleUndo,
		onRedo: handleRedo,
		onAddChild: (parentId) => {
			openNodeTypeModal(parentId);
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
		onToggleComments: handleToggleComments,
	});

	return (
		// Context Provider is now wrapping this component higher up
		<div className='relative h-full w-full overflow-hidden rounded-md flex'>
			{/* Main content area */}
			<div
				className={cn([
					'flex-1 relative',
					isCommentsPanelOpen ? 'w-[calc(100%-384px)]' : 'w-full',
				])}
			>
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

			{/* Comments Panel */}
			{popoverOpen.commentsPanel && <CommentsPanel />}

			{/* Chat Panel */}
			<AiChat />
		</div>
	);
}
