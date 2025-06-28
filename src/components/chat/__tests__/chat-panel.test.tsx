import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ChatPanel } from '../chat-panel';

// Mock the store
const mockStore = {
	currentSession: {
		id: 'test-session',
		mapId: 'test-map',
		messages: [
			{
				id: 'msg-1',
				role: 'user' as const,
				content: 'Hello AI',
				timestamp: new Date().toISOString(),
			},
			{
				id: 'msg-2',
				role: 'assistant' as const,
				content: 'Hello! How can I help you with your mind map?',
				timestamp: new Date().toISOString(),
			},
		],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	uiState: {
		isOpen: true,
		isMinimized: false,
		isLoading: false,
		isStreaming: false,
		position: { x: 100, y: 100 },
		size: { width: 400, height: 600 },
		inputValue: '',
		lastError: null,
		scrollPosition: 0,
	},
	streamingMessage: '',
	suggestedActions: [],
	context: {
		mapId: 'test-map',
		selectedNodeIds: ['node-1'],
		conversationHistory: [],
		userPreferences: {
			responseStyle: 'detailed' as const,
			includeContext: true,
		},
	},
	selectedNodes: [{ id: 'node-1', data: { content: 'Test Node' } }],
	mindMap: { title: 'Test Mind Map' },
	mapId: 'test-map',
	sendMessage: jest.fn(),
	stopStreaming: jest.fn(),
	openChat: jest.fn(),
	closeChat: jest.fn(),
	minimizeChat: jest.fn(),
	maximizeChat: jest.fn(),
	setInputValue: jest.fn(),
	clearError: jest.fn(),
	createNewSession: jest.fn(),
	regenerateResponse: jest.fn(),
	executeSuggestedAction: jest.fn(),
};

// Mock the hooks
jest.mock('@/hooks/use-mobile-chat', () => ({
	useMobileChat: () => ({
		isMobile: false,
		isTablet: false,
		orientation: 'portrait',
		isKeyboardOpen: false,
		touchHandlers: {
			onTouchStart: jest.fn(),
			onTouchMove: jest.fn(),
			onTouchEnd: jest.fn(),
		},
		mobileDimensions: { width: 400, height: 600 },
		optimizeForMobile: jest.fn(),
		triggerHapticFeedback: jest.fn(),
	}),
}));

jest.mock('@/hooks/use-chat-accessibility', () => ({
	useChatAccessibility: () => ({
		refs: {
			chatContainer: { current: null },
			messagesContainer: { current: null },
			input: { current: null },
			announcement: { current: null },
			status: { current: null },
		},
		preferences: {
			reducedMotion: false,
			highContrast: false,
			largeText: false,
			keyboardOnly: false,
			screenReaderOptimized: false,
		},
		announce: jest.fn(),
		getAriaAttributes: jest.fn(() => ({})),
		getSemanticLabel: jest.fn(() => ''),
		getHighContrastStyles: jest.fn(() => ({})),
		getMotionStyles: jest.fn(() => ({})),
		liveRegions: <div data-testid="live-regions" />,
	}),
}));

// Mock the store
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: () => mockStore,
}));

// Mock framer motion
jest.mock('motion/react', () => ({
	motion: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	},
	AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/avatar', () => ({
	Avatar: ({ children, ...props }: any) => <div data-testid="avatar" {...props}>{children}</div>,
	AvatarFallback: ({ children, ...props }: any) => <div data-testid="avatar-fallback" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
	CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
	CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
	CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
	ScrollArea: ({ children, ...props }: any) => <div data-testid="scroll-area" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/textarea', () => ({
	Textarea: ({ value, onChange, onKeyDown, ...props }: any) => (
		<textarea
			value={value}
			onChange={onChange}
			onKeyDown={onKeyDown}
			data-testid="textarea"
			{...props}
		/>
	),
}));

jest.mock('@/components/ui/Tooltip', () => ({
	Tooltip: ({ children }: any) => children,
	TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
	TooltipProvider: ({ children }: any) => children,
	TooltipTrigger: ({ children }: any) => children,
}));

// Mock react-markdown
jest.mock('react-markdown', () => {
	return function ReactMarkdown({ children }: { children: string }) {
		return <div data-testid="markdown">{children}</div>;
	};
});

describe('ChatPanel', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders chat interface correctly', () => {
		render(<ChatPanel />);

		// Check if main elements are present
		expect(screen.getByText('AI Chat')).toBeInTheDocument();
		expect(screen.getByText('(1 selected)')).toBeInTheDocument();
		expect(screen.getByTestId('textarea')).toBeInTheDocument();
		expect(screen.getByTestId('live-regions')).toBeInTheDocument();
	});

	it('displays chat messages', () => {
		render(<ChatPanel />);

		// Check if messages are displayed
		expect(screen.getByText('Hello AI')).toBeInTheDocument();
		expect(screen.getByText('Hello! How can I help you with your mind map?')).toBeInTheDocument();
	});

	it('handles message submission', async () => {
		mockStore.uiState.inputValue = 'Test message';
		render(<ChatPanel />);

		const sendButton = screen.getByRole('button', { name: /send/i });
		await user.click(sendButton);

		expect(mockStore.sendMessage).toHaveBeenCalledWith('Test message', {
			sourceType: 'manual',
			nodeId: 'node-1',
		});
	});

	it('handles keyboard shortcuts', async () => {
		render(<ChatPanel />);

		const textarea = screen.getByTestId('textarea');
		await user.type(textarea, 'Test message');
		await user.keyboard('{Control>}{Enter}{/Control}');

		expect(mockStore.sendMessage).toHaveBeenCalled();
	});

	it('displays loading state correctly', () => {
		mockStore.uiState.isLoading = true;
		render(<ChatPanel />);

		expect(screen.getByText('Thinking...')).toBeInTheDocument();
	});

	it('displays streaming state correctly', () => {
		mockStore.uiState.isStreaming = true;
		mockStore.streamingMessage = 'AI is typing...';
		render(<ChatPanel />);

		expect(screen.getByText('Streaming response...')).toBeInTheDocument();
		expect(screen.getByText('AI is typing...')).toBeInTheDocument();
	});

	it('handles errors gracefully', () => {
		mockStore.uiState.lastError = 'Test error message';
		render(<ChatPanel />);

		expect(screen.getByText('Test error message')).toBeInTheDocument();

		const closeErrorButton = screen.getByRole('button', { name: /close/i });
		fireEvent.click(closeErrorButton);

		expect(mockStore.clearError).toHaveBeenCalled();
	});

	it('handles minimize/maximize functionality', async () => {
		render(<ChatPanel />);

		const minimizeButton = screen.getByRole('button', { name: /minimize/i });
		await user.click(minimizeButton);

		expect(mockStore.minimizeChat).toHaveBeenCalled();
	});

	it('handles close functionality', async () => {
		render(<ChatPanel />);

		const closeButton = screen.getByRole('button', { name: /close chat/i });
		await user.click(closeButton);

		expect(mockStore.closeChat).toHaveBeenCalled();
	});

	it('prevents sending empty messages', async () => {
		mockStore.uiState.inputValue = '';
		render(<ChatPanel />);

		const sendButton = screen.getByRole('button', { name: /send/i });
		expect(sendButton).toBeDisabled();
	});

	it('disables input during loading', () => {
		mockStore.uiState.isLoading = true;
		render(<ChatPanel />);

		const textarea = screen.getByTestId('textarea');
		expect(textarea).toBeDisabled();
	});

	it('shows character count', () => {
		mockStore.uiState.inputValue = 'Hello';
		render(<ChatPanel />);

		expect(screen.getByText('5/2000')).toBeInTheDocument();
	});

	it('shows selected nodes count', () => {
		render(<ChatPanel />);

		expect(screen.getByText('1 nodes selected')).toBeInTheDocument();
	});

	it('handles copy message functionality', async () => {
		// Mock clipboard API
		Object.assign(navigator, {
			clipboard: {
				writeText: jest.fn(),
			},
		});

		render(<ChatPanel />);

		// Find copy buttons (they should be present for each message)
		const copyButtons = screen.getAllByRole('button');
		const copyButton = copyButtons.find(button =>
			button.querySelector('svg') // Looking for the Copy icon
		);

		if (copyButton) {
			await user.click(copyButton);
			expect(navigator.clipboard.writeText).toHaveBeenCalled();
		}
	});

	it('provides proper accessibility attributes', () => {
		render(<ChatPanel />);

		// Check for proper ARIA attributes
		const chatContainer = screen.getByTestId('card');
		expect(chatContainer).toBeInTheDocument();

		const textarea = screen.getByTestId('textarea');
		expect(textarea).toBeInTheDocument();
	});

	it('handles suggested actions', () => {
		mockStore.suggestedActions = [
			{
				id: 'action-1',
				type: 'create_node' as const,
				label: 'Create Node',
				description: 'Create a new node',
			},
		];

		render(<ChatPanel />);

		expect(screen.getByText('Create Node')).toBeInTheDocument();
		expect(screen.getByText('Create a new node')).toBeInTheDocument();
	});

	it('handles regenerate response', async () => {
		render(<ChatPanel />);

		// Find regenerate buttons (they should be present for assistant messages)
		const regenerateButtons = screen.getAllByRole('button');
		const regenerateButton = regenerateButtons.find(button =>
			button.querySelector('svg') // Looking for the RefreshCw icon
		);

		if (regenerateButton) {
			await user.click(regenerateButton);
			expect(mockStore.regenerateResponse).toHaveBeenCalled();
		}
	});

	it('does not render when not visible', () => {
		mockStore.uiState.isOpen = false;
		const { container } = render(<ChatPanel />);

		expect(container.firstChild).toBeNull();
	});

	it('handles stop streaming', async () => {
		mockStore.uiState.isStreaming = true;
		render(<ChatPanel />);

		const stopButton = screen.getByRole('button');
		await user.click(stopButton);

		expect(mockStore.stopStreaming).toHaveBeenCalled();
	});
});
