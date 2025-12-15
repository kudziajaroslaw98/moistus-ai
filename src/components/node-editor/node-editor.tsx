'use client';

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
import { AnimateChangeInHeight } from '../animate-change-in-height';
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
	const { nodeEditor, closeNodeEditor, nodes, resetQuickInput } = useAppStore(
		useShallow((state) => ({
			nodeEditor: state.nodeEditor,
			closeNodeEditor: state.closeNodeEditor,
			nodes: state.nodes,
			resetQuickInput: state.resetQuickInput,
		}))
	);

	const initializedRef = useRef<string | null>(null);

	// Get mode and existing node data from store
	const mode = nodeEditor.mode;
	const existingNode = nodeEditor.existingNodeId
		? nodes.find((node) => node.id === nodeEditor.existingNodeId)
		: undefined;

	// Determine node type from context
	const nodeType: AvailableNodeTypes =
		mode === 'edit'
			? (existingNode?.data?.node_type as AvailableNodeTypes) || 'defaultNode'
			: nodeEditor.suggestedType || 'defaultNode';

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
		outsidePress: true,
	});

	const { getReferenceProps } = useInteractions([dismiss]);

	if (!nodeEditor.isOpen) return null;

	const theme = {
		container: 'bg-base border border-border-subtle w-3xl rounded-md',
	};

	return (
		<div className='fixed flex flex-col items-center top-0 left-0 w-full h-full bg-zinc-950/50 z-[100] backdrop-blur-sm pt-32'>
			<AnimatePresence>
				{nodeEditor.isOpen && (
					<motion.div
						ref={refs.setFloating}
						{...getReferenceProps()}
						animate='animate'
						className={cn(theme.container)}
						exit='exit'
						initial='initial'
						variants={animationVariants.container}
					>
						<AnimateChangeInHeight>
							<QuickInput
								existingNode={existingNode}
								mode={mode}
								nodeType={nodeType}
								parentNode={nodeEditor.parentNode}
								position={nodeEditor.position}
							/>
						</AnimateChangeInHeight>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default NodeEditor;
