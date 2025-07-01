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
	userPreferences: {
		responseStyle: 'concise' | 'detailed' | 'creative';
		includeContext: boolean;
		autoSuggestNodes: boolean;
	};
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
	messages: ChatMessage[];
	aiContext: ChatContext | null;

	updateUserPreferences: (
		preferences: Partial<ChatContext['userPreferences']>
	) => void;
}

// Create chat slice implementation
export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (
	set,
	get
) => ({
	// Initial state
	messages: [
		{
			content: 'system text',
			id: 'i0',
			role: 'system',
			timestamp: new Date().toUTCString(),
		},
		{
			content: 'user text',
			id: 'i1',
			role: 'user',
			timestamp: new Date().toUTCString(),
		},
		{
			content: 'asistant text',
			id: 'i2',
			role: 'assistant',
			timestamp: new Date().toUTCString(),
		},
	],
	aiContext: {
		userPreferences: {
			autoSuggestNodes: true,
			includeContext: true,
			responseStyle: 'concise',
		},
	},

	updateUserPreferences: (
		preferences: Partial<ChatContext['userPreferences']>
	) => {
		set((state) => ({
			aiContext: state.aiContext
				? {
						...state.aiContext,
						userPreferences: {
							...state.aiContext.userPreferences,
							...preferences,
						},
					}
				: null,
		}));
	},
});
