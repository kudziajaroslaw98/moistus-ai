'use client';

import useAppStore from '@/store/mind-map-store';
import { useCallback, useEffect, useRef, useState } from 'react';

// Keyboard navigation configuration
interface KeyboardConfig {
	enableShortcuts: boolean;
	enableTabNavigation: boolean;
	enableArrowNavigation: boolean;
	announceActions: boolean;
}

// Screen reader announcement types
type AnnouncementType = 'polite' | 'assertive' | 'off';

// Focus trap state
interface FocusState {
	activeElement: HTMLElement | null;
	focusHistory: HTMLElement[];
	trapEnabled: boolean;
	restoreFocus: HTMLElement | null;
}

// Accessibility preferences
interface AccessibilityPreferences {
	reducedMotion: boolean;
	highContrast: boolean;
	largeText: boolean;
	keyboardOnly: boolean;
	screenReaderOptimized: boolean;
}

// Default keyboard configuration
const DEFAULT_KEYBOARD_CONFIG: KeyboardConfig = {
	enableShortcuts: true,
	enableTabNavigation: true,
	enableArrowNavigation: true,
	announceActions: true,
};

export function useChatAccessibility(config: Partial<KeyboardConfig> = {}) {
	const finalConfig = { ...DEFAULT_KEYBOARD_CONFIG, ...config };

	// Chat state from store
	const {
		uiState,
		currentSession,
		openChat,
		closeChat,
		toggleChat,
		sendMessage,
		setInputValue,
		clearError,
	} = useAppStore();

	// Accessibility state
	const [focusState, setFocusState] = useState<FocusState>({
		activeElement: null,
		focusHistory: [],
		trapEnabled: false,
		restoreFocus: null,
	});

	const [preferences, setPreferences] = useState<AccessibilityPreferences>({
		reducedMotion: false,
		highContrast: false,
		largeText: false,
		keyboardOnly: false,
		screenReaderOptimized: false,
	});

	// Screen reader live regions
	const announcementRef = useRef<HTMLDivElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);

	// Chat element references
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Detect user preferences
	const detectAccessibilityPreferences = useCallback(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
		const largeText = window.matchMedia('(min-resolution: 192dpi)').matches;

		setPreferences(prev => ({
			...prev,
			reducedMotion,
			highContrast,
			largeText,
		}));
	}, []);

	// Screen reader announcements
	const announce = useCallback((
		message: string,
		type: AnnouncementType = 'polite',
		delay: number = 0
	) => {
		if (!finalConfig.announceActions) return;

		const announceMessage = () => {
			const target = type === 'assertive' ? statusRef.current : announcementRef.current;
			if (target) {
				target.textContent = message;
				// Clear after announcement
				setTimeout(() => {
					if (target) target.textContent = '';
				}, 1000);
			}
		};

		if (delay > 0) {
			setTimeout(announceMessage, delay);
		} else {
			announceMessage();
		}
	}, [finalConfig.announceActions]);

	// Focus management
	const manageFocus = useCallback((element: HTMLElement | null, remember: boolean = true) => {
		if (!element) return;

		setFocusState(prev => ({
			...prev,
			activeElement: element,
			focusHistory: remember ? [...prev.focusHistory, element].slice(-10) : prev.focusHistory,
		}));

		element.focus();
	}, []);

	const restoreFocus = useCallback(() => {
		const { restoreFocus, focusHistory } = focusState;
		const targetElement = restoreFocus || focusHistory[focusHistory.length - 1];

		if (targetElement && document.contains(targetElement)) {
			targetElement.focus();
		}
	}, [focusState]);

	// Focus trap for modal-like behavior
	const enableFocusTrap = useCallback((container: HTMLElement) => {
		const focusableElements = container.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const firstElement = focusableElements[0] as HTMLElement;
		const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement?.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement?.focus();
				}
			}
		};

		container.addEventListener('keydown', handleTabKey);

		setFocusState(prev => ({
			...prev,
			trapEnabled: true,
			restoreFocus: document.activeElement as HTMLElement,
		}));

		// Focus first element
		firstElement?.focus();

		return () => {
			container.removeEventListener('keydown', handleTabKey);
			setFocusState(prev => ({ ...prev, trapEnabled: false }));
		};
	}, []);

	// Keyboard shortcuts
	const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
		if (!finalConfig.enableShortcuts) return;

		const { ctrlKey, metaKey, altKey, shiftKey, key } = event;
		const modifierKey = ctrlKey || metaKey;

		// Chat-specific shortcuts
		switch (key) {
			case 'Escape':
				if (uiState.isOpen) {
					closeChat();
					announce('Chat closed', 'polite');
					restoreFocus();
				}
				break;

			case 'Enter':
				if (modifierKey && uiState.isOpen && inputRef.current) {
					event.preventDefault();
					const message = uiState.inputValue.trim();
					if (message) {
						sendMessage(message);
						announce('Message sent', 'polite');
					}
				}
				break;

			case '/':
				if (modifierKey) {
					event.preventDefault();
					toggleChat();
					announce(uiState.isOpen ? 'Chat closed' : 'Chat opened', 'polite');
				}
				break;

			case 'ArrowUp':
				if (altKey && uiState.isOpen) {
					event.preventDefault();
					// Navigate to previous message
					navigateMessages('up');
				}
				break;

			case 'ArrowDown':
				if (altKey && uiState.isOpen) {
					event.preventDefault();
					// Navigate to next message
					navigateMessages('down');
				}
				break;
		}
	}, [
		finalConfig.enableShortcuts,
		uiState.isOpen,
		uiState.inputValue,
		closeChat,
		toggleChat,
		sendMessage,
		announce,
		restoreFocus,
	]);

	// Message navigation
	const navigateMessages = useCallback((direction: 'up' | 'down') => {
		if (!messagesContainerRef.current) return;

		const messages = messagesContainerRef.current.querySelectorAll('[role="article"]');
		const currentIndex = Array.from(messages).findIndex(msg =>
			msg.contains(document.activeElement)
		);

		let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		targetIndex = Math.max(0, Math.min(messages.length - 1, targetIndex));

		const targetMessage = messages[targetIndex] as HTMLElement;
		if (targetMessage) {
			targetMessage.focus();
			targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

			// Announce message content
			const messageContent = targetMessage.textContent?.trim() || '';
			announce(`Message ${targetIndex + 1} of ${messages.length}: ${messageContent.substring(0, 100)}`, 'polite');
		}
	}, [announce]);

	// ARIA attributes generator
	const getAriaAttributes = useCallback((
		element: 'chat-container' | 'messages-list' | 'input' | 'send-button' | 'message'
	) => {
		const baseAttributes: Record<string, any> = {};

		switch (element) {
			case 'chat-container':
				return {
					role: 'dialog',
					'aria-labelledby': 'chat-title',
					'aria-describedby': 'chat-description',
					'aria-modal': uiState.isOpen ? 'true' : 'false',
					'aria-hidden': !uiState.isOpen,
				};

			case 'messages-list':
				return {
					role: 'log',
					'aria-label': 'Chat messages',
					'aria-live': 'polite',
					'aria-relevant': 'additions',
				};

			case 'input':
				return {
					role: 'textbox',
					'aria-label': 'Type your message',
					'aria-describedby': 'input-help',
					'aria-multiline': 'true',
					'aria-required': 'true',
					'aria-invalid': uiState.lastError ? 'true' : 'false',
				};

			case 'send-button':
				return {
					role: 'button',
					'aria-label': 'Send message',
					'aria-describedby': 'send-help',
					'aria-disabled': !uiState.inputValue.trim() || uiState.isLoading,
				};

			case 'message':
				return {
					role: 'article',
					tabIndex: 0,
					'aria-label': 'Chat message',
				};

			default:
				return baseAttributes;
		}
	}, [uiState]);

	// Generate semantic labels
	const getSemanticLabel = useCallback((
		context: 'chat-status' | 'message-count' | 'typing-indicator' | 'error'
	) => {
		switch (context) {
			case 'chat-status':
				return uiState.isLoading ? 'AI is thinking...' : 'Chat ready';

			case 'message-count':
				const messageCount = currentSession?.messages.length || 0;
				return `${messageCount} message${messageCount !== 1 ? 's' : ''} in conversation`;

			case 'typing-indicator':
				return uiState.isStreaming ? 'AI is typing a response' : '';

			case 'error':
				return uiState.lastError ? `Error: ${uiState.lastError}` : '';

			default:
				return '';
		}
	}, [uiState, currentSession]);

	// High contrast mode utilities
	const getHighContrastStyles = useCallback(() => {
		if (!preferences.highContrast) return {};

		return {
			filter: 'contrast(150%) saturate(120%)',
			border: '2px solid currentColor',
		};
	}, [preferences.highContrast]);

	// Reduced motion utilities
	const getMotionStyles = useCallback(() => {
		if (preferences.reducedMotion) {
			return {
				transition: 'none',
				animation: 'none',
				transform: 'none',
			};
		}
		return {};
	}, [preferences.reducedMotion]);

	// Setup accessibility features
	useEffect(() => {
		detectAccessibilityPreferences();

		// Listen for preference changes
		const mediaQueries = [
			window.matchMedia('(prefers-reduced-motion: reduce)'),
			window.matchMedia('(prefers-contrast: high)'),
		];

		const handleChange = () => detectAccessibilityPreferences();
		mediaQueries.forEach(mq => mq.addEventListener('change', handleChange));

		return () => {
			mediaQueries.forEach(mq => mq.removeEventListener('change', handleChange));
		};
	}, [detectAccessibilityPreferences]);

	// Setup keyboard event listeners
	useEffect(() => {
		document.addEventListener('keydown', handleKeyboardShortcuts);
		return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
	}, [handleKeyboardShortcuts]);

	// Focus management when chat opens/closes
	useEffect(() => {
		if (uiState.isOpen) {
			if (chatContainerRef.current) {
				const cleanup = enableFocusTrap(chatContainerRef.current);
				return cleanup;
			}
		} else {
			restoreFocus();
		}
	}, [uiState.isOpen, enableFocusTrap, restoreFocus]);

	// Announce state changes
	useEffect(() => {
		if (uiState.isLoading) {
			announce('AI is thinking...', 'polite');
		}
	}, [uiState.isLoading, announce]);

	useEffect(() => {
		if (uiState.lastError) {
			announce(`Error: ${uiState.lastError}`, 'assertive');
		}
	}, [uiState.lastError, announce]);

	return {
		// Refs for accessibility
		refs: {
			chatContainer: chatContainerRef,
			messagesContainer: messagesContainerRef,
			input: inputRef,
			announcement: announcementRef,
			status: statusRef,
		},

		// Accessibility state
		preferences,
		focusState,

		// Accessibility utilities
		announce,
		manageFocus,
		restoreFocus,
		enableFocusTrap,
		navigateMessages,

		// ARIA and semantic helpers
		getAriaAttributes,
		getSemanticLabel,

		// Style utilities
		getHighContrastStyles,
		getMotionStyles,

		// Keyboard navigation
		handleKeyboardShortcuts,

		// Screen reader live regions (JSX)
		liveRegions: (
			<>
				<div
					ref={announcementRef}
					aria-live="polite"
					aria-atomic="true"
					className="sr-only"
				/>
				<div
					ref={statusRef}
					aria-live="assertive"
					aria-atomic="true"
					className="sr-only"
				/>
			</>
		),

		// Accessibility configuration
		config: finalConfig,

		// Update preferences
		updatePreferences: setPreferences,
	};
}
