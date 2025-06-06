'use client';

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'; // Keep shortcuts here
import { cn } from '@/utils/cn';
import { useCallback, useMemo } from 'react';
import { ModalsWrapper } from './mind-map/modals-wrapper';
import { ReactFlowArea } from './mind-map/react-flow-area';

import useAppStore from '@/contexts/mind-map/mind-map-store';
import { useCollaboration } from '@/hooks/use-collaboration';
import { useParams } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { AvatarStack } from './collaboration/avatar-stack/avatar-stack';
import { CommandPalette } from './command-palette';
import { CommentsPanel } from './comment/comment-panel';
import { MindMapToolbar } from './mind-map-toolbar/mind-map-toolbar';
import { ContextMenuWrapper } from './mind-map/context-menu-wrapper';

export function MindMapCanvas() {
	const params = useParams();
	const mapId = params.id as string;

	// Initialize collaboration
	const collaboration = useCollaboration(mapId);

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
			isFocusMode: state.isFocusMode,
			popoverOpen: state.popoverOpen,
			createGroupFromSelected: state.createGroupFromSelected,
			ungroupNodes: state.ungroupNodes,
			toggleNodeCollapse: state.toggleNodeCollapse,
			isCommentsPanelOpen: state.isCommentsPanelOpen,
		}))
	);
	const isLoading = loadingStates.isStateLoading;

	const selectedNodeId = selectedNodes[0]?.id;
	const selectedEdgeId = useMemo(
		() => edges.find((e) => e.selected)?.id,
		[edges]
	);

	const openNodeTypeModal = () => {
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

	// Handle user avatar clicks - center view on user's cursor
	const handleUserClick = useCallback(
		(user: { user_id: string; name: string }) => {
			console.log('Center view on user:', user);
			// TODO: Implement view centering on user cursor position
			// This will be implemented when cursor tracking is added
		},
		[]
	);

	useKeyboardShortcuts({
		onUndo: handleUndo,
		onRedo: handleRedo,
		onAddChild: openNodeTypeModal, // Use wrapper function
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
		<div className='relative h-full w-full overflow-hidden rounded-md bg-zinc-900 flex'>
			{/* Main content area */}
			<div
				className={cn([
					'flex-1 relative',
					isCommentsPanelOpen ? 'w-[calc(100%-384px)]' : 'w-full',
				])}
			>
				{/* Render the wrapped components */}
				<MindMapToolbar />

				{popoverOpen.commandPalette && <CommandPalette />}

				<ModalsWrapper />

				{/* Position the ReactFlowArea */}
				<div
					className={cn([
						'relative w-full transition-all duration-200 ease-in-out',
						isFocusMode ? 'h-full mt-0' : 'h-[calc(100%-60px)] mt-[60px]',
					])}
				>
					<ContextMenuWrapper />

					<ReactFlowArea />

					{/* Collaboration Avatar Stack */}
					{collaboration.state.isConnected && (
						<div className='absolute top-4 right-4 z-50'>
							<AvatarStack onUserClick={handleUserClick} size='md' />
						</div>
					)}
				</div>
			</div>

			{/* Comments Panel */}
			{popoverOpen.commentsPanel && <CommentsPanel />}
		</div>
	);
}
