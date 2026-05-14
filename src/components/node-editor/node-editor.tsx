'use client';

import { usePermissions } from '@/hooks/collaboration/use-permissions';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import {
	autoUpdate,
	useDismiss,
	useFloating,
	useInteractions,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { QuickInput } from './components/inputs/quick-input';

const animationVariants = {
	container: {
		initial: { opacity: 0, scale: 0.95, y: -100, filter: 'blur(10px)' },
		animate: {
			opacity: 1,
			scale: 1,
			y: 0,
			filter: 'blur(0px)',
			transition: { duration: 0.2, ease: 'easeOut' as const },
		},
		exit: {
			opacity: 0,
			scale: 0.95,
			y: -100,
			filter: 'blur(10px)',
			transition: { duration: 0.15 },
		},
	},
};

export const NodeEditor = () => {
	const {
		nodeEditor,
		closeNodeEditor,
		nodes,
		resetQuickInput,
		getDefaultNodeType,
		handleOnboardingNodeEditorOpened,
	} = useAppStore(
		useShallow((state) => ({
			nodeEditor: state.nodeEditor,
			closeNodeEditor: state.closeNodeEditor,
			nodes: state.nodes,
			resetQuickInput: state.resetQuickInput,
			getDefaultNodeType: state.getDefaultNodeType,
			handleOnboardingNodeEditorOpened: state.handleOnboardingNodeEditorOpened,
		}))
	);

	const initializedRef = useRef<string | null>(null);
	const { canEdit, isLoading: isPermissionLoading } = usePermissions();

	// Get mode and existing node data from store
	const mode = nodeEditor.mode;
	const existingNode = nodeEditor.existingNodeId
		? nodes.find((node) => node.id === nodeEditor.existingNodeId)
		: undefined;

	// Determine node type from context
	// Priority: edit mode uses existing type > command-suggested type > user's default preference
	const nodeType: AvailableNodeTypes =
		mode === 'edit'
			? (existingNode?.data?.node_type as AvailableNodeTypes) || 'defaultNode'
			: nodeEditor.suggestedType || getDefaultNodeType();

	// Reset state when editor closes
	useEffect(() => {
		if (nodeEditor.isOpen && mode === 'edit' && nodeEditor.existingNodeId) {
			// Track initialized node to prevent reset on same node
			if (initializedRef.current !== nodeEditor.existingNodeId) {
				initializedRef.current = nodeEditor.existingNodeId;
			}
		}

		// Clean up when editor closes
		if (!nodeEditor.isOpen) {
			initializedRef.current = null;
			// Reset QuickInput state when editor closes to prevent stale data
			resetQuickInput();
		}
	}, [nodeEditor.isOpen, mode, nodeEditor.existingNodeId, resetQuickInput]);

	useEffect(() => {
		if (!nodeEditor.isOpen || isPermissionLoading) return;
		if (canEdit) return;
		closeNodeEditor();
	}, [nodeEditor.isOpen, isPermissionLoading, canEdit, closeNodeEditor]);

	useEffect(() => {
		if (!nodeEditor.isOpen) {
			return;
		}

		handleOnboardingNodeEditorOpened(nodeEditor.mode);
	}, [nodeEditor.isOpen, nodeEditor.mode, handleOnboardingNodeEditorOpened]);

	const { refs, context } = useFloating({
		open: nodeEditor.isOpen,
		onOpenChange: (open) => {
			if (!open) closeNodeEditor();
		},
		whileElementsMounted: autoUpdate,
	});

	// Interactions
	const dismiss = useDismiss(context, {
		escapeKey: true,
		outsidePress: (event) => {
			const target = event.target;

			return !(
				target instanceof Element &&
				(target.closest('[data-node-editor-autocomplete-tray="true"]') ||
					target.closest('.cm-tooltip') ||
					target.closest('.cm-tooltip-autocomplete'))
			);
		},
		outsidePressEvent: 'pointerdown',
	});

	const { getFloatingProps } = useInteractions([dismiss]);

	if (!nodeEditor.isOpen) return null;

	const theme = {
		container:
			'bg-base border border-border-subtle w-[calc(100%-12px)] h-[calc(100dvh-12px)] max-h-[calc(100dvh-12px)] overflow-hidden rounded-md sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[min(1100px,calc(100vw-2rem))]',
	};

	return (
		<div
			className='fixed left-0 top-0 z-[100] flex h-full w-full flex-col items-center justify-start bg-zinc-950/50 px-1.5 py-1.5 backdrop-blur-sm sm:px-0 sm:pb-0 sm:pt-[min(8rem,12dvh)]'
			data-node-editor-overlay='true'
			data-testid='node-editor-backdrop'
		>
			<AnimatePresence>
				{nodeEditor.isOpen && (
					<motion.div
						ref={refs.setFloating}
						{...getFloatingProps()}
						animate='animate'
						className={cn(theme.container)}
						data-testid='node-editor'
						exit='exit'
						initial='initial'
						variants={animationVariants.container}
					>
						<QuickInput
							existingNode={existingNode}
							initialValue={nodeEditor.initialValue}
							mode={mode}
							nodeType={nodeType}
							onboardingSource={nodeEditor.onboardingSource}
							parentNode={nodeEditor.parentNode}
							position={nodeEditor.position}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default NodeEditor;
