'use client';

/**
 * Spotlight Overlay Component
 *
 * Renders a dimming overlay that highlights the current tour node.
 * Uses CSS to dim non-focused nodes while keeping the spotlight visible.
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';

interface SpotlightOverlayProps {
	isActive: boolean;
	spotlightNodeId: string | null;
}

export const SpotlightOverlay = memo(function SpotlightOverlay({
	isActive,
	spotlightNodeId,
}: SpotlightOverlayProps) {
	const [nodeRect, setNodeRect] = useState<DOMRect | null>(null);

	// Find and track the spotlight node's position
	useEffect(() => {
		if (!isActive || !spotlightNodeId) {
			setNodeRect(null);
			return;
		}

		const updateNodeRect = () => {
			// React Flow nodes have data-id attribute
			const nodeElement = document.querySelector(
				`[data-id="${spotlightNodeId}"]`
			);
			if (nodeElement) {
				setNodeRect(nodeElement.getBoundingClientRect());
			}
		};

		// Initial update
		updateNodeRect();

		// Update on viewport changes (zoom/pan)
		const observer = new MutationObserver(updateNodeRect);
		const reactFlowViewport = document.querySelector('.react-flow__viewport');
		if (reactFlowViewport) {
			observer.observe(reactFlowViewport, {
				attributes: true,
				attributeFilter: ['style', 'transform'],
				subtree: true,
			});
		}

		// Also update on resize
		window.addEventListener('resize', updateNodeRect);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', updateNodeRect);
		};
	}, [isActive, spotlightNodeId]);

	if (!isActive) return null;

	return (
		<AnimatePresence>
			{nodeRect && (
				<motion.div
					key="spotlight-dim"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
					className="pointer-events-none fixed inset-0 z-40"
					style={{
						// Create a spotlight effect using a radial gradient mask
						background: `radial-gradient(
							ellipse ${nodeRect.width * 2}px ${nodeRect.height * 2}px
							at ${nodeRect.left + nodeRect.width / 2}px ${nodeRect.top + nodeRect.height / 2}px,
							transparent 30%,
							rgba(0, 0, 0, 0.5) 70%,
							rgba(0, 0, 0, 0.7) 100%
						)`,
					}}
				/>
			)}

			{/* Glow effect around spotlight node */}
			{nodeRect && (
				<motion.div
					key="spotlight-glow"
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.9 }}
					transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
					className="pointer-events-none fixed z-30"
					style={{
						left: nodeRect.left - 8,
						top: nodeRect.top - 8,
						width: nodeRect.width + 16,
						height: nodeRect.height + 16,
						borderRadius: 12,
						boxShadow: `
							0 0 0 2px rgba(255, 255, 255, 0.3),
							0 0 30px rgba(255, 255, 255, 0.2),
							0 0 60px rgba(255, 255, 255, 0.1)
						`,
					}}
				/>
			)}
		</AnimatePresence>
	);
});
