import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

// Chat message interface
export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: Date;
	metadata?: {
		nodeId?: string;
		actionType?: string;
		sourceType?: 'manual' | 'suggestion' | 'auto';
		tokenCount?: number;
		model?: string;
	};
}

// Context mode determines how much map data is sent to AI
export type ChatContextMode = 'minimal' | 'summary' | 'full';

// Chat context interface
export interface ChatContext {
	mapId: string | null;
	selectedNodeIds: string[];
	contextMode: ChatContextMode;
}

// User preferences for chat
export interface ChatPreferences {
	responseStyle: 'concise' | 'detailed' | 'creative';
	includeContext: boolean;
	autoSuggestNodes: boolean;
}

// Chat slice interface
export interface ChatSlice {
	// State
	chatMessages: ChatMessage[];
	isChatStreaming: boolean;
	chatContext: ChatContext;
	isChatOpen: boolean;
	chatPreferences: ChatPreferences;

	// Actions
	sendChatMessage: (content: string) => Promise<void>;
	addChatMessage: (message: ChatMessage) => void;
	updateChatMessage: (id: string, content: string) => void;
	clearChatMessages: () => void;
	setChatContext: (context: Partial<ChatContext>) => void;
	setChatContextMode: (mode: ChatContextMode) => void;
	toggleChat: () => void;
	openChat: () => void;
	closeChat: () => void;
	setChatStreaming: (streaming: boolean) => void;
	updateChatPreferences: (preferences: Partial<ChatPreferences>) => void;
}

// Generate unique ID for messages
const generateMessageId = (): string => {
	return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Create chat slice implementation
export const createChatSlice: StateCreator<
	AppState,
	[],
	[],
	ChatSlice
> = (set, get) => ({
	// Initial state
	chatMessages: [],
	isChatStreaming: false,
	chatContext: {
		mapId: null,
		selectedNodeIds: [],
		contextMode: 'summary',
	},
	isChatOpen: false,
	chatPreferences: {
		responseStyle: 'concise',
		includeContext: true,
		autoSuggestNodes: true,
	},

	// Send a message and get AI response
	sendChatMessage: async (content: string) => {
		const { chatMessages, chatContext, addChatMessage, setChatStreaming, updateChatMessage } = get();

		// Add user message
		const userMessage: ChatMessage = {
			id: generateMessageId(),
			role: 'user',
			content,
			timestamp: new Date(),
		};
		addChatMessage(userMessage);

		// Create placeholder for assistant response
		const assistantMessageId = generateMessageId();
		const assistantMessage: ChatMessage = {
			id: assistantMessageId,
			role: 'assistant',
			content: '',
			timestamp: new Date(),
		};
		addChatMessage(assistantMessage);

		setChatStreaming(true);

		try {
			// Prepare messages for API (exclude empty assistant message)
			const apiMessages = [...chatMessages, userMessage].map((m) => ({
				role: m.role,
				content: m.content,
			}));

			// Get selected nodes from store
			const selectedNodes = get().selectedNodes;
			const selectedNodeIds = selectedNodes.map((n) => n.id);

			// Make API request
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					messages: apiMessages,
					context: {
						mapId: chatContext.mapId || get().mapId,
						selectedNodeIds:
							chatContext.selectedNodeIds.length > 0
								? chatContext.selectedNodeIds
								: selectedNodeIds,
						contextMode: chatContext.contextMode,
					},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to get AI response');
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			const decoder = new TextDecoder();
			let accumulatedContent = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				accumulatedContent += chunk;

				// Update the assistant message with accumulated content
				updateChatMessage(assistantMessageId, accumulatedContent);
			}

			// Refresh usage data after successful AI response
			get().fetchUsageData?.();
		} catch (error) {
			console.error('Chat error:', error);
			// Update the assistant message with error
			updateChatMessage(
				assistantMessageId,
				`Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
			);
		} finally {
			setChatStreaming(false);
		}
	},

	// Add a message to the chat
	addChatMessage: (message: ChatMessage) => {
		set((state) => ({
			chatMessages: [...state.chatMessages, message],
		}));
	},

	// Update an existing message (for streaming)
	updateChatMessage: (id: string, content: string) => {
		set((state) => ({
			chatMessages: state.chatMessages.map((m) =>
				m.id === id ? { ...m, content, timestamp: new Date() } : m
			),
		}));
	},

	// Clear all messages
	clearChatMessages: () => {
		set({ chatMessages: [] });
	},

	// Set chat context
	setChatContext: (context: Partial<ChatContext>) => {
		set((state) => ({
			chatContext: { ...state.chatContext, ...context },
		}));
	},

	// Set context mode (minimal, summary, full)
	setChatContextMode: (mode: ChatContextMode) => {
		set((state) => ({
			chatContext: { ...state.chatContext, contextMode: mode },
		}));
	},

	// Toggle chat panel visibility
	toggleChat: () => {
		set((state) => ({ isChatOpen: !state.isChatOpen }));
	},

	// Open chat panel
	openChat: () => {
		set({ isChatOpen: true });
	},

	// Close chat panel
	closeChat: () => {
		set({ isChatOpen: false });
	},

	// Set streaming state
	setChatStreaming: (streaming: boolean) => {
		set({ isChatStreaming: streaming });
	},

	// Update chat preferences
	updateChatPreferences: (preferences: Partial<ChatPreferences>) => {
		set((state) => ({
			chatPreferences: { ...state.chatPreferences, ...preferences },
		}));
	},
});
