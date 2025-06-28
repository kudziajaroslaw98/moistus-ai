import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { StateCreator } from 'zustand';

// Chat message interface
export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: string;
	metadata?: {
		nodeId?: string;
		actionType?: string;
		sourceType?: 'manual' | 'suggestion' | 'auto';
		tokenCount?: number;
		model?: string;
	};
}

// Chat context interface
export interface ChatContext {
	mapId: string;
	mapTitle?: string;
	selectedNodeIds: string[];
	nodes?: AppNode[];
	edges?: AppEdge[];
	conversationHistory: ChatMessage[];
	userPreferences: {
		responseStyle: 'concise' | 'detailed' | 'creative';
		includeContext: boolean;
		autoSuggestNodes: boolean;
	};
}

// Chat UI state
export interface ChatUIState {
	isOpen: boolean;
	isMinimized: boolean;
	isLoading: boolean;
	isStreaming: boolean;
	position: { x: number; y: number } | null;
	size: { width: number; height: number };
	inputValue: string;
	lastError: string | null;
	scrollPosition: number;
}

// Chat session interface
export interface ChatSession {
	id: string;
	mapId: string;
	messages: ChatMessage[];
	createdAt: string;
	updatedAt: string;
	title?: string;
	metadata?: {
		totalMessages: number;
		totalTokens: number;
		averageResponseTime: number;
	};
}

// Chat slice interface
export interface ChatSlice {
	// State
	currentSession: ChatSession | null;
	sessions: ChatSession[];
	context: ChatContext | null;
	uiState: ChatUIState;
	streamingMessage: string;
	suggestedActions: Array<{
		id: string;
		type: 'create_node' | 'connect_nodes' | 'expand_topic' | 'summarize';
		label: string;
		description: string;
		params?: Record<string, any>;
	}>;

	// Session management
	createNewSession: (mapId: string, mapTitle?: string) => void;
	loadSession: (sessionId: string) => Promise<void>;
	deleteSession: (sessionId: string) => void;
	updateSessionTitle: (sessionId: string, title: string) => void;
	clearAllSessions: () => void;

	// Message management
	addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
	updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
	deleteMessage: (messageId: string) => void;
	clearMessages: () => void;
	regenerateResponse: (messageId: string) => Promise<void>;

	// Chat interaction
	sendMessage: (content: string, metadata?: ChatMessage['metadata']) => Promise<void>;
	stopStreaming: () => void;
	retryLastMessage: () => Promise<void>;

	// Context management
	updateContext: (context: Partial<ChatContext>) => void;
	refreshContext: (mapId: string) => Promise<void>;
	setSelectedNodes: (nodeIds: string[]) => void;
	updateUserPreferences: (preferences: Partial<ChatContext['userPreferences']>) => void;

	// UI state management
	openChat: () => void;
	closeChat: () => void;
	toggleChat: () => void;
	minimizeChat: () => void;
	maximizeChat: () => void;
	setPosition: (position: { x: number; y: number }) => void;
	setSize: (size: { width: number; height: number }) => void;
	setInputValue: (value: string) => void;
	setScrollPosition: (position: number) => void;
	clearError: () => void;

	// Streaming handling
	handleStreamingChunk: (chunk: string) => void;
	finalizeStreamingMessage: (finalContent: string, metadata?: ChatMessage['metadata']) => void;
	resetStreamingMessage: () => void;

	// Suggested actions
	addSuggestedAction: (action: ChatSlice['suggestedActions'][0]) => void;
	removeSuggestedAction: (actionId: string) => void;
	clearSuggestedActions: () => void;
	executeSuggestedAction: (actionId: string) => Promise<void>;

	// Persistence
	saveSession: (sessionId?: string) => Promise<void>;
	loadSessions: (mapId: string) => Promise<void>;
	exportChat: (sessionId: string, format: 'json' | 'markdown' | 'txt') => string;
	importChat: (data: string, format: 'json') => Promise<void>;

	// Analytics
	trackChatUsage: (event: {
		type: 'message_sent' | 'session_created' | 'action_executed';
		metadata?: Record<string, any>;
	}) => void;
	getChatStatistics: () => {
		totalSessions: number;
		totalMessages: number;
		averageMessagesPerSession: number;
		mostUsedActions: Array<{ action: string; count: number }>;
	};
}

// Create chat slice implementation
export const createChatSlice: StateCreator<
	ChatSlice,
	[],
	[],
	ChatSlice
> = (set, get) => ({
	// Initial state
	currentSession: null,
	sessions: [],
	context: null,
	uiState: {
		isOpen: false,
		isMinimized: false,
		isLoading: false,
		isStreaming: false,
		position: null,
		size: { width: 400, height: 600 },
		inputValue: '',
		lastError: null,
		scrollPosition: 0,
	},
	streamingMessage: '',
	suggestedActions: [],

	// Session management
	createNewSession: (mapId: string, mapTitle?: string) => {
		const newSession: ChatSession = {
			id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			mapId,
			messages: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			title: mapTitle ? `Chat: ${mapTitle}` : 'New Chat Session',
			metadata: {
				totalMessages: 0,
				totalTokens: 0,
				averageResponseTime: 0,
			},
		};

		set((state) => ({
			currentSession: newSession,
			sessions: [newSession, ...state.sessions],
			context: {
				mapId,
				mapTitle,
				selectedNodeIds: [],
				conversationHistory: [],
				userPreferences: {
					responseStyle: 'detailed',
					includeContext: true,
					autoSuggestNodes: true,
				},
			},
		}));
	},

	loadSession: async (sessionId: string) => {
		const session = get().sessions.find(s => s.id === sessionId);
		if (session) {
			set({ currentSession: session });
		}
	},

	deleteSession: (sessionId: string) => {
		set((state) => ({
			sessions: state.sessions.filter(s => s.id !== sessionId),
			currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
		}));
	},

	updateSessionTitle: (sessionId: string, title: string) => {
		set((state) => ({
			sessions: state.sessions.map(s =>
				s.id === sessionId ? { ...s, title, updatedAt: new Date().toISOString() } : s
			),
			currentSession: state.currentSession?.id === sessionId
				? { ...state.currentSession, title, updatedAt: new Date().toISOString() }
				: state.currentSession,
		}));
	},

	clearAllSessions: () => {
		set({ sessions: [], currentSession: null });
	},

	// Message management
	addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
		const newMessage: ChatMessage = {
			...message,
			id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date().toISOString(),
		};

		set((state) => {
			if (!state.currentSession) return state;

			const updatedSession = {
				...state.currentSession,
				messages: [...state.currentSession.messages, newMessage],
				updatedAt: new Date().toISOString(),
				metadata: {
					...state.currentSession.metadata,
					totalMessages: state.currentSession.messages.length + 1,
				},
			};

			return {
				currentSession: updatedSession,
				sessions: state.sessions.map(s =>
					s.id === updatedSession.id ? updatedSession : s
				),
			};
		});
	},

	updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
		set((state) => {
			if (!state.currentSession) return state;

			const updatedSession = {
				...state.currentSession,
				messages: state.currentSession.messages.map(m =>
					m.id === messageId ? { ...m, ...updates } : m
				),
				updatedAt: new Date().toISOString(),
			};

			return {
				currentSession: updatedSession,
				sessions: state.sessions.map(s =>
					s.id === updatedSession.id ? updatedSession : s
				),
			};
		});
	},

	deleteMessage: (messageId: string) => {
		set((state) => {
			if (!state.currentSession) return state;

			const updatedSession = {
				...state.currentSession,
				messages: state.currentSession.messages.filter(m => m.id !== messageId),
				updatedAt: new Date().toISOString(),
			};

			return {
				currentSession: updatedSession,
				sessions: state.sessions.map(s =>
					s.id === updatedSession.id ? updatedSession : s
				),
			};
		});
	},

	clearMessages: () => {
		set((state) => {
			if (!state.currentSession) return state;

			const updatedSession = {
				...state.currentSession,
				messages: [],
				updatedAt: new Date().toISOString(),
			};

			return {
				currentSession: updatedSession,
				sessions: state.sessions.map(s =>
					s.id === updatedSession.id ? updatedSession : s
				),
			};
		});
	},

	regenerateResponse: async (messageId: string) => {
		// Implementation would trigger a new API call for the message
		console.log('Regenerating response for message:', messageId);
	},

	// Chat interaction
	sendMessage: async (content: string, metadata?: ChatMessage['metadata']) => {
		const { addMessage, context, currentSession } = get();

		if (!currentSession || !context) return;

		// Add user message
		addMessage({
			role: 'user',
			content,
			metadata,
		});

		// Set loading state
		set((state) => ({
			uiState: { ...state.uiState, isLoading: true, isStreaming: true },
		}));

		try {
			// Prepare request data
			const requestData = {
				messages: currentSession.messages.concat([{
					id: 'temp',
					role: 'user' as const,
					content,
					timestamp: new Date().toISOString(),
					metadata,
				}]),
				context,
				modelPreferences: {
					model: 'gpt-4o-mini',
					temperature: 0.7,
					maxTokens: 1000,
				},
			};

			// Send to chat API
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let streamingContent = '';

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value);
					streamingContent += chunk;
					get().handleStreamingChunk(chunk);
				}

				// Finalize streaming message
				get().finalizeStreamingMessage(streamingContent, {
					model: 'gpt-4o-mini',
				});
			}
		} catch (error) {
			console.error('Error sending message:', error);
			set((state) => ({
				uiState: {
					...state.uiState,
					lastError: error instanceof Error ? error.message : 'Unknown error',
					isLoading: false,
					isStreaming: false,
				},
			}));
		}
	},

	stopStreaming: () => {
		set((state) => ({
			uiState: { ...state.uiState, isStreaming: false, isLoading: false },
		}));
	},

	retryLastMessage: async () => {
		const { currentSession } = get();
		if (!currentSession || currentSession.messages.length === 0) return;

		const lastUserMessage = [...currentSession.messages]
			.reverse()
			.find(m => m.role === 'user');

		if (lastUserMessage) {
			await get().sendMessage(lastUserMessage.content, lastUserMessage.metadata);
		}
	},

	// Context management
	updateContext: (context: Partial<ChatContext>) => {
		set((state) => ({
			context: state.context ? { ...state.context, ...context } : null,
		}));
	},

	refreshContext: async (mapId: string) => {
		// Implementation would fetch fresh context from the app state
		console.log('Refreshing context for map:', mapId);
	},

	setSelectedNodes: (nodeIds: string[]) => {
		set((state) => ({
			context: state.context ? { ...state.context, selectedNodeIds: nodeIds } : null,
		}));
	},

	updateUserPreferences: (preferences: Partial<ChatContext['userPreferences']>) => {
		set((state) => ({
			context: state.context ? {
				...state.context,
				userPreferences: { ...state.context.userPreferences, ...preferences }
			} : null,
		}));
	},

	// UI state management
	openChat: () => {
		set((state) => ({
			uiState: { ...state.uiState, isOpen: true, isMinimized: false },
		}));
	},

	closeChat: () => {
		set((state) => ({
			uiState: { ...state.uiState, isOpen: false },
		}));
	},

	toggleChat: () => {
		set((state) => ({
			uiState: { ...state.uiState, isOpen: !state.uiState.isOpen },
		}));
	},

	minimizeChat: () => {
		set((state) => ({
			uiState: { ...state.uiState, isMinimized: true },
		}));
	},

	maximizeChat: () => {
		set((state) => ({
			uiState: { ...state.uiState, isMinimized: false },
		}));
	},

	setPosition: (position: { x: number; y: number }) => {
		set((state) => ({
			uiState: { ...state.uiState, position },
		}));
	},

	setSize: (size: { width: number; height: number }) => {
		set((state) => ({
			uiState: { ...state.uiState, size },
		}));
	},

	setInputValue: (value: string) => {
		set((state) => ({
			uiState: { ...state.uiState, inputValue: value },
		}));
	},

	setScrollPosition: (position: number) => {
		set((state) => ({
			uiState: { ...state.uiState, scrollPosition: position },
		}));
	},

	clearError: () => {
		set((state) => ({
			uiState: { ...state.uiState, lastError: null },
		}));
	},

	// Streaming handling
	handleStreamingChunk: (chunk: string) => {
		set((state) => ({
			streamingMessage: state.streamingMessage + chunk,
		}));
	},

	finalizeStreamingMessage: (finalContent: string, metadata?: ChatMessage['metadata']) => {
		const { addMessage, resetStreamingMessage } = get();

		addMessage({
			role: 'assistant',
			content: finalContent,
			metadata,
		});

		resetStreamingMessage();

		set((state) => ({
			uiState: { ...state.uiState, isLoading: false, isStreaming: false },
		}));
	},

	resetStreamingMessage: () => {
		set({ streamingMessage: '' });
	},

	// Suggested actions
	addSuggestedAction: (action) => {
		set((state) => ({
			suggestedActions: [...state.suggestedActions, action],
		}));
	},

	removeSuggestedAction: (actionId: string) => {
		set((state) => ({
			suggestedActions: state.suggestedActions.filter(a => a.id !== actionId),
		}));
	},

	clearSuggestedActions: () => {
		set({ suggestedActions: [] });
	},

	executeSuggestedAction: async (actionId: string) => {
		const action = get().suggestedActions.find(a => a.id === actionId);
		if (!action) return;

		console.log('Executing suggested action:', action);
		// Implementation would execute the action based on type
	},

	// Persistence
	saveSession: async (sessionId?: string) => {
		const { currentSession } = get();
		const session = sessionId
			? get().sessions.find(s => s.id === sessionId)
			: currentSession;

		if (session) {
			// Implementation would save to localStorage or database
			localStorage.setItem(`chat_session_${session.id}`, JSON.stringify(session));
		}
	},

	loadSessions: async (mapId: string) => {
		// Implementation would load sessions from localStorage or database
		const sessions: ChatSession[] = [];

		// Load from localStorage
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('chat_session_')) {
				try {
					const session = JSON.parse(localStorage.getItem(key) || '');
					if (session.mapId === mapId) {
						sessions.push(session);
					}
				} catch (error) {
					console.error('Error loading session:', error);
				}
			}
		}

		set({ sessions: sessions.sort((a, b) =>
			new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		) });
	},

	exportChat: (sessionId: string, format: 'json' | 'markdown' | 'txt') => {
		const session = get().sessions.find(s => s.id === sessionId);
		if (!session) return '';

		switch (format) {
			case 'json':
				return JSON.stringify(session, null, 2);
			case 'markdown':
				let markdown = `# ${session.title}\n\n`;
				session.messages.forEach(msg => {
					markdown += `**${msg.role.toUpperCase()}**: ${msg.content}\n\n`;
				});
				return markdown;
			case 'txt':
				let text = `${session.title}\n${'='.repeat(session.title?.length || 0)}\n\n`;
				session.messages.forEach(msg => {
					text += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
				});
				return text;
			default:
				return '';
		}
	},

	importChat: async (data: string, format: 'json') => {
		try {
			if (format === 'json') {
				const session: ChatSession = JSON.parse(data);
				set((state) => ({
					sessions: [session, ...state.sessions],
				}));
			}
		} catch (error) {
			console.error('Error importing chat:', error);
		}
	},

	// Analytics
	trackChatUsage: (event) => {
		console.log('Chat usage tracked:', event);
		// Implementation would send to analytics service
	},

	getChatStatistics: () => {
		const { sessions } = get();
		const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);

		return {
			totalSessions: sessions.length,
			totalMessages,
			averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
			mostUsedActions: [], // Implementation would analyze action usage
		};
	},
});
