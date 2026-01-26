'use client';

import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'; // Keep shortcuts here
import { cn } from '@/utils/cn';
import { useCallback, useMemo } from 'react';
import { ModalsWrapper } from './mind-map/modals-wrapper';
import { ReactFlowArea } from './mind-map/react-flow-area';
import NodeEditor from './node-editor/node-editor';

import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useRealtimeSelectionPresenceRoom } from '@/hooks/realtime/use-realtime-selection-presence-room';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import useAppStore from '@/store/mind-map-store';
import { useParams } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { AIStreamMediator } from './ai/ai-stream-mediator';
import { ContextMenuWrapper } from './mind-map/context-menu-wrapper';
import { StreamingToast } from './streaming-toast';
import { AnonymousUserBanner } from './auth/anonymous-user-banner';
import { UpgradeAnonymousPrompt } from './auth/upgrade-anonymous';
import { useRouter } from 'next/navigation';
import { AccessRevokedPage } from './mind-map/access-revoked-page';

export function MindMapCanvas() {
	const params = useParams();
	const mapId = params.id as string;
	const router = useRouter();

	// Protect route
	const { isChecking } = useAuthRedirect();
	const { canEdit } = usePermissions();

	// Consume necessary values for keyboard shortcuts
	const {
		handleCopy,
		handlePaste,
		edges,
		selectedNodes,
		loadingStates,
		isFocusMode,
		createGroupFromSelected,
		ungroupNodes,
		toggleNodeCollapse,
		openNodeEditor,
		userProfile,
		mapAccessError,
		applyLayout,
	} = useAppStore(
		useShallow((state) => ({
			handleCopy: state.copySelectedNodes,
			handlePaste: state.pasteNodes,
			edges: state.edges,
			selectedNodes: state.selectedNodes,
			loadingStates: state.loadingStates,
			isFocusMode: state.isFocusMode,
			createGroupFromSelected: state.createGroupFromSelected,
			ungroupNodes: state.ungroupNodes,
			toggleNodeCollapse: state.toggleNodeCollapse,
			currentUser: state.currentUser,
			getCurrentUser: state.getCurrentUser,
			openNodeEditor: state.openNodeEditor,
			userProfile: state.userProfile,
			mapAccessError: state.mapAccessError,
			applyLayout: state.applyLayout,
		}))
	);
	const isLoading = loadingStates.isStateLoading;

	useRealtimeSelectionPresenceRoom(`mind-map:${mapId}:selected-nodes`);

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
		isBusy: isLoading,
		onGroup: handleGroup,
		onUngroup: handleUngroup,
		onToggleCollapse: handleToggleCollapse,
		onLayout: canEdit ? applyLayout : undefined,
	});

	// Keyboard navigation (arrow keys, Ctrl+Arrow creation, Enter edit)
	useKeyboardNavigation({
		enabled: !isLoading,
	});

	if (isChecking) {
		return (
			<div className='flex h-full w-full items-center justify-center bg-zinc-950'>
				<div className='h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-sky-500' />
			</div>
		);
	}

	// Show access revoked page when access is denied or map not found
	if (mapAccessError) {
		return (
			<AccessRevokedPage
				errorType={mapAccessError.type}
				isAnonymous={mapAccessError.isAnonymous}
			/>
		);
	}

	return (
		// Context Provider is now wrapping this component higher up
		<div className='relative h-full w-full overflow-hidden rounded-md flex'>
			{/* Main content area */}
			<div className='flex-1 relative w-full'>
				<AnonymousUserBanner />

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

			{/* Auto-show upgrade prompt after 5 minutes for anonymous users */}
			<UpgradeAnonymousPrompt
				isAnonymous={userProfile?.is_anonymous ?? false}
				userDisplayName={userProfile?.display_name || userProfile?.full_name}
				onUpgradeSuccess={() => router.refresh()}
			/>
		</div>
	);
}
