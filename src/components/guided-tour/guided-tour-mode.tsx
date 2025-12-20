'use client';

/**
 * Guided Tour Mode Component
 *
 * Orchestrates the Prezi-style guided tour experience.
 * Handles viewport navigation, spotlight effect, and controls overlay.
 */

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { memo, useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { TourControls } from './tour-controls';
import { SpotlightOverlay } from './spotlight-overlay';
import { useTourKeyboard } from './use-tour-keyboard';

export const GuidedTourMode = memo(function GuidedTourMode() {
	const { setViewport, getViewport, getNode } = useReactFlow();
	const isFullscreenRef = useRef(false);

	const {
		isTourActive,
		spotlightNodeId,
		showInfoBar,
		currentPathIndex,
		tourPath,
		nextStop,
		prevStop,
		stopTour,
		goToStop,
		getCurrentStop,
		getTotalStops,
		nodes,
	} = useAppStore(
		useShallow((state) => ({
			isTourActive: state.isTourActive,
			spotlightNodeId: state.spotlightNodeId,
			showInfoBar: state.showInfoBar,
			currentPathIndex: state.currentPathIndex,
			tourPath: state.tourPath,
			nextStop: state.nextStop,
			prevStop: state.prevStop,
			stopTour: state.stopTour,
			goToStop: state.goToStop,
			getCurrentStop: state.getCurrentStop,
			getTotalStops: state.getTotalStops,
			nodes: state.nodes,
		}))
	);

	const currentStop = getCurrentStop();
	const totalStops = getTotalStops();

	// Navigate viewport to spotlight node
	const navigateToNode = useCallback(
		(nodeId: string) => {
			const node = getNode(nodeId);
			if (!node) return;

			// Get node dimensions (use defaults if not available)
			const nodeWidth = node.measured?.width || node.width || 200;
			const nodeHeight = node.measured?.height || node.height || 100;

			// Calculate center of node
			const centerX = node.position.x + nodeWidth / 2;
			const centerY = node.position.y + nodeHeight / 2;

			// Zoom level for focus (slightly zoomed in)
			const zoom = 1.2;

			// Calculate viewport to center the node
			const viewportX = -centerX * zoom + window.innerWidth / 2;
			const viewportY = -centerY * zoom + window.innerHeight / 2;

			setViewport(
				{ x: viewportX, y: viewportY, zoom },
				{ duration: 500 } // Smooth transition
			);
		},
		[getNode, setViewport]
	);

	// Navigate to spotlight node when it changes
	useEffect(() => {
		if (isTourActive && spotlightNodeId) {
			navigateToNode(spotlightNodeId);
		}
	}, [isTourActive, spotlightNodeId, navigateToNode]);

	// Toggle fullscreen
	const toggleFullscreen = useCallback(async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
				isFullscreenRef.current = true;
			} else {
				await document.exitFullscreen();
				isFullscreenRef.current = false;
			}
		} catch (error) {
			console.error('Fullscreen toggle failed:', error);
		}
	}, []);

	// Exit tour and fullscreen
	const handleExit = useCallback(() => {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		}
		stopTour();
	}, [stopTour]);

	// Keyboard navigation
	useTourKeyboard({
		isActive: isTourActive,
		totalStops,
		onNext: nextStop,
		onPrevious: prevStop,
		onExit: handleExit,
		onGoToStop: goToStop,
		onToggleFullscreen: toggleFullscreen,
	});

	// Don't render if not active
	if (!isTourActive || !currentStop) return null;

	return (
		<>
			{/* Spotlight overlay */}
			<SpotlightOverlay
				isActive={isTourActive}
				spotlightNodeId={spotlightNodeId}
			/>

			{/* Tour controls */}
			<TourControls
				currentStop={currentStop}
				isFullscreen={isFullscreenRef.current}
				showInfoBar={showInfoBar}
				onNext={nextStop}
				onPrevious={prevStop}
				onExit={handleExit}
				onGoToStop={goToStop}
				onToggleFullscreen={toggleFullscreen}
			/>
		</>
	);
});

export default GuidedTourMode;
