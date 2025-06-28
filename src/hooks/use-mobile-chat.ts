'use client';

import useAppStore from '@/store/mind-map-store';
import { useCallback, useEffect, useState } from 'react';

// Mobile breakpoints
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

// Touch gesture types
type TouchGesture = 'tap' | 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'pinch' | 'long-press';

// Mobile chat configuration
interface MobileChatConfig {
	minHeight: number;
	maxHeight: number;
	collapsedHeight: number;
	swipeThreshold: number;
	longPressDelay: number;
	autoCollapseDelay: number;
}

// Mobile chat state
interface MobileChatState {
	isMobile: boolean;
	isTablet: boolean;
	orientation: 'portrait' | 'landscape';
	viewportHeight: number;
	viewportWidth: number;
	keyboardHeight: number;
	isKeyboardOpen: boolean;
	isDragging: boolean;
	dragOffset: { x: number; y: number };
	lastTouchTime: number;
	gestureState: {
		isActive: boolean;
		type: TouchGesture | null;
		startPosition: { x: number; y: number };
		currentPosition: { x: number; y: number };
	};
}

// Default mobile configuration
const DEFAULT_MOBILE_CONFIG: MobileChatConfig = {
	minHeight: 200,
	maxHeight: 600,
	collapsedHeight: 60,
	swipeThreshold: 50,
	longPressDelay: 500,
	autoCollapseDelay: 5000,
};

export function useMobileChat(config: Partial<MobileChatConfig> = {}) {
	const finalConfig = { ...DEFAULT_MOBILE_CONFIG, ...config };

	// Chat state from store
	const {
		uiState,
		setSize,
		setPosition,
		minimizeChat,
		maximizeChat,
		openChat,
		closeChat,
		toggleChat,
	} = useAppStore();

	// Mobile-specific state
	const [mobileState, setMobileState] = useState<MobileChatState>({
		isMobile: false,
		isTablet: false,
		orientation: 'portrait',
		viewportHeight: 0,
		viewportWidth: 0,
		keyboardHeight: 0,
		isKeyboardOpen: false,
		isDragging: false,
		dragOffset: { x: 0, y: 0 },
		lastTouchTime: 0,
		gestureState: {
			isActive: false,
			type: null,
			startPosition: { x: 0, y: 0 },
			currentPosition: { x: 0, y: 0 },
		},
	});

	// Auto-collapse timer
	const [autoCollapseTimer, setAutoCollapseTimer] = useState<NodeJS.Timeout | null>(null);

	// Detect mobile and viewport changes
	const updateViewport = useCallback(() => {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const isMobile = width < MOBILE_BREAKPOINT;
		const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
		const orientation = width > height ? 'landscape' : 'portrait';

		setMobileState(prev => ({
			...prev,
			isMobile,
			isTablet,
			orientation,
			viewportWidth: width,
			viewportHeight: height,
		}));

		// Adjust chat size for mobile
		if (isMobile) {
			const mobileWidth = Math.min(width - 32, 400); // 16px margin on each side
			const mobileHeight = orientation === 'portrait'
				? Math.min(height * 0.7, finalConfig.maxHeight)
				: Math.min(height * 0.8, finalConfig.maxHeight);

			setSize({ width: mobileWidth, height: mobileHeight });

			// Position chat at bottom on mobile
			setPosition({
				x: (width - mobileWidth) / 2,
				y: height - mobileHeight - 20
			});
		}
	}, [finalConfig.maxHeight, setSize, setPosition]);

	// Detect keyboard on mobile
	const detectKeyboard = useCallback(() => {
		if (!mobileState.isMobile) return;

		const initialHeight = mobileState.viewportHeight;
		const currentHeight = window.visualViewport?.height || window.innerHeight;
		const heightDiff = initialHeight - currentHeight;
		const keyboardThreshold = 150; // Minimum height difference to consider keyboard open

		const isKeyboardOpen = heightDiff > keyboardThreshold;
		const keyboardHeight = isKeyboardOpen ? heightDiff : 0;

		setMobileState(prev => ({
			...prev,
			keyboardHeight,
			isKeyboardOpen,
		}));

		// Adjust chat position when keyboard opens
		if (isKeyboardOpen && uiState.isOpen) {
			const newY = currentHeight - uiState.size.height - 10;
			setPosition({ x: uiState.position?.x || 16, y: Math.max(10, newY) });
		}
	}, [mobileState.isMobile, mobileState.viewportHeight, uiState, setPosition]);

	// Touch gesture handling
	const handleTouchStart = useCallback((event: React.TouchEvent) => {
		const touch = event.touches[0];
		const now = Date.now();

		setMobileState(prev => ({
			...prev,
			isDragging: true,
			lastTouchTime: now,
			gestureState: {
				isActive: true,
				type: null,
				startPosition: { x: touch.clientX, y: touch.clientY },
				currentPosition: { x: touch.clientX, y: touch.clientY },
			},
		}));

		// Clear auto-collapse timer on interaction
		if (autoCollapseTimer) {
			clearTimeout(autoCollapseTimer);
			setAutoCollapseTimer(null);
		}
	}, [autoCollapseTimer]);

	const handleTouchMove = useCallback((event: React.TouchEvent) => {
		if (!mobileState.gestureState.isActive) return;

		const touch = event.touches[0];
		const currentPos = { x: touch.clientX, y: touch.clientY };

		setMobileState(prev => ({
			...prev,
			gestureState: {
				...prev.gestureState,
				currentPosition: currentPos,
			},
		}));

		// Calculate drag offset for chat repositioning
		const deltaX = currentPos.x - mobileState.gestureState.startPosition.x;
		const deltaY = currentPos.y - mobileState.gestureState.startPosition.y;

		setMobileState(prev => ({
			...prev,
			dragOffset: { x: deltaX, y: deltaY },
		}));
	}, [mobileState.gestureState]);

	const handleTouchEnd = useCallback((event: React.TouchEvent) => {
		const { gestureState, lastTouchTime } = mobileState;
		const touchDuration = Date.now() - lastTouchTime;

		if (!gestureState.isActive) return;

		const deltaX = gestureState.currentPosition.x - gestureState.startPosition.x;
		const deltaY = gestureState.currentPosition.y - gestureState.startPosition.y;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		let detectedGesture: TouchGesture | null = null;

		// Detect gesture type
		if (touchDuration > finalConfig.longPressDelay && distance < 10) {
			detectedGesture = 'long-press';
		} else if (distance > finalConfig.swipeThreshold) {
			const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

			if (angle >= -45 && angle <= 45) {
				detectedGesture = 'swipe-right';
			} else if (angle >= 135 || angle <= -135) {
				detectedGesture = 'swipe-left';
			} else if (angle >= 45 && angle <= 135) {
				detectedGesture = 'swipe-down';
			} else if (angle >= -135 && angle <= -45) {
				detectedGesture = 'swipe-up';
			}
		} else if (distance < 10 && touchDuration < 300) {
			detectedGesture = 'tap';
		}

		// Handle gestures
		handleGesture(detectedGesture, { deltaX, deltaY, distance });

		// Reset gesture state
		setMobileState(prev => ({
			...prev,
			isDragging: false,
			dragOffset: { x: 0, y: 0 },
			gestureState: {
				isActive: false,
				type: detectedGesture,
				startPosition: { x: 0, y: 0 },
				currentPosition: { x: 0, y: 0 },
			},
		}));

		// Start auto-collapse timer
		startAutoCollapseTimer();
	}, [mobileState, finalConfig.longPressDelay, finalConfig.swipeThreshold]);

	// Handle detected gestures
	const handleGesture = useCallback((
		gesture: TouchGesture | null,
		metrics: { deltaX: number; deltaY: number; distance: number }
	) => {
		if (!gesture) return;

		switch (gesture) {
			case 'swipe-down':
				if (uiState.isOpen && !uiState.isMinimized) {
					minimizeChat();
				}
				break;

			case 'swipe-up':
				if (uiState.isOpen && uiState.isMinimized) {
					maximizeChat();
				} else if (!uiState.isOpen) {
					openChat();
				}
				break;

			case 'swipe-left':
				if (uiState.isOpen) {
					closeChat();
				}
				break;

			case 'swipe-right':
				if (!uiState.isOpen) {
					openChat();
				}
				break;

			case 'long-press':
				// Show context menu or additional options
				handleLongPress();
				break;

			case 'tap':
				// Handle tap interactions
				break;
		}
	}, [uiState, minimizeChat, maximizeChat, openChat, closeChat]);

	// Handle long press gesture
	const handleLongPress = useCallback(() => {
		// Could show context menu, settings, or other options
		console.log('Long press detected on mobile chat');
	}, []);

	// Auto-collapse functionality
	const startAutoCollapseTimer = useCallback(() => {
		if (!mobileState.isMobile || !uiState.isOpen) return;

		const timer = setTimeout(() => {
			if (uiState.isOpen && !uiState.isMinimized) {
				minimizeChat();
			}
		}, finalConfig.autoCollapseDelay);

		setAutoCollapseTimer(timer);
	}, [mobileState.isMobile, uiState.isOpen, uiState.isMinimized, minimizeChat, finalConfig.autoCollapseDelay]);

	// Optimize chat for mobile when opened
	const optimizeForMobile = useCallback(() => {
		if (!mobileState.isMobile) return;

		// Adjust size and position for mobile
		updateViewport();

		// Ensure chat is visible and accessible
		if (uiState.isOpen) {
			const { viewportWidth, viewportHeight, isKeyboardOpen, keyboardHeight } = mobileState;
			const availableHeight = isKeyboardOpen ? viewportHeight - keyboardHeight : viewportHeight;

			const optimalHeight = Math.min(
				availableHeight * 0.7,
				finalConfig.maxHeight
			);

			setSize({
				width: Math.min(viewportWidth - 32, 400),
				height: optimalHeight,
			});
		}
	}, [mobileState, uiState.isOpen, updateViewport, setSize, finalConfig.maxHeight]);

	// Handle haptic feedback (if supported)
	const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
		if ('vibrate' in navigator) {
			const patterns = {
				light: [10],
				medium: [50],
				heavy: [100],
			};
			navigator.vibrate(patterns[type]);
		}
	}, []);

	// Setup event listeners
	useEffect(() => {
		updateViewport();

		const handleResize = () => {
			updateViewport();
			detectKeyboard();
		};

		const handleOrientationChange = () => {
			// Delay to allow viewport to settle
			setTimeout(() => {
				updateViewport();
				optimizeForMobile();
			}, 100);
		};

		const handleVisualViewportChange = () => {
			detectKeyboard();
		};

		window.addEventListener('resize', handleResize);
		window.addEventListener('orientationchange', handleOrientationChange);

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleVisualViewportChange);
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('orientationchange', handleOrientationChange);

			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
			}

			if (autoCollapseTimer) {
				clearTimeout(autoCollapseTimer);
			}
		};
	}, [updateViewport, detectKeyboard, optimizeForMobile, autoCollapseTimer]);

	// Auto-optimize when chat state changes
	useEffect(() => {
		optimizeForMobile();
	}, [uiState.isOpen, optimizeForMobile]);

	// Mobile-specific chat dimensions
	const getMobileChatDimensions = useCallback(() => {
		if (!mobileState.isMobile) {
			return {
				width: uiState.size.width,
				height: uiState.size.height,
			};
		}

		const { viewportWidth, viewportHeight, isKeyboardOpen, keyboardHeight, orientation } = mobileState;
		const availableHeight = isKeyboardOpen ? viewportHeight - keyboardHeight : viewportHeight;

		const width = Math.min(viewportWidth - 32, 400);
		const height = uiState.isMinimized
			? finalConfig.collapsedHeight
			: Math.min(
				orientation === 'portrait' ? availableHeight * 0.7 : availableHeight * 0.8,
				finalConfig.maxHeight
			);

		return { width, height };
	}, [mobileState, uiState, finalConfig]);

	return {
		// Mobile state
		isMobile: mobileState.isMobile,
		isTablet: mobileState.isTablet,
		orientation: mobileState.orientation,
		isKeyboardOpen: mobileState.isKeyboardOpen,
		keyboardHeight: mobileState.keyboardHeight,
		isDragging: mobileState.isDragging,

		// Gesture handling
		touchHandlers: {
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
		},

		// Mobile-optimized dimensions
		mobileDimensions: getMobileChatDimensions(),

		// Mobile utilities
		optimizeForMobile,
		triggerHapticFeedback,
		startAutoCollapseTimer,

		// Gesture state
		gestureState: mobileState.gestureState,
		dragOffset: mobileState.dragOffset,

		// Configuration
		config: finalConfig,
	};
}
