'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import { useChatAccessibility } from '@/hooks/use-chat-accessibility';
import { useMobileChat } from '@/hooks/use-mobile-chat';
import useAppStore from '@/store/mind-map-store';
import {
	Bot,
	Copy,
	Maximize2,
	MessageSquare,
	Minimize2,
	RefreshCw,
	Send,
	Sparkles,
	StopCircle,
	User,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Chat Panel Props
interface ChatPanelProps {
	className?: string;
	defaultPosition?: { x: number; y: number };
	defaultSize?: { width: number; height: number };
}

// Chat Message Component
interface ChatMessageProps {
	message: {
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
	};
	isLast?: boolean;
	onCopy?: (content: string) => void;
	onRegenerate?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
	message,
	isLast = false,
	onCopy,
	onRegenerate,
}) => {
	const isUser = message.role === 'user';
	const isSystem = message.role === 'system';

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content);
		onCopy?.(message.content);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={`flex gap-3 p-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${
				isSystem ? 'opacity-70' : ''
			}`}
		>
			{/* Avatar */}
			<Avatar className='h-8 w-8 flex-shrink-0'>
				<AvatarFallback
					className={
						isUser ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
					}
				>
					{isUser ? <User className='h-4 w-4' /> : <Bot className='h-4 w-4' />}
				</AvatarFallback>
			</Avatar>

			{/* Message Content */}
			<div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
				<div
					className={`inline-block max-w-[85%] rounded-lg p-3 ${
						isUser
							? 'bg-blue-600 text-white'
							: isSystem
								? 'bg-gray-100 text-gray-700 border'
								: 'bg-white text-gray-900 border border-gray-200'
					}`}
				>
					{isUser ? (
						<p className='whitespace-pre-wrap'>{message.content}</p>
					) : (
						<div className='prose prose-sm max-w-none'>
							<ReactMarkdown>{message.content}</ReactMarkdown>
						</div>
					)}
				</div>

				{/* Message Actions */}
				{!isSystem && (
					<div
						className={`mt-2 flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
					>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant='ghost'
										size='sm'
										onClick={handleCopy}
										className='h-6 w-6 p-0 opacity-60 hover:opacity-100'
									>
										<Copy className='h-3 w-3' />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Copy message</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						{!isUser && onRegenerate && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant='ghost'
											size='sm'
											onClick={() => onRegenerate(message.id)}
											className='h-6 w-6 p-0 opacity-60 hover:opacity-100'
										>
											<RefreshCw className='h-3 w-3' />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Regenerate response</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
				)}

				{/* Metadata */}
				{message.metadata && (
					<div
						className={`mt-1 text-xs opacity-60 ${isUser ? 'text-right' : 'text-left'}`}
					>
						{message.metadata.model && (
							<span>Model: {message.metadata.model}</span>
						)}
						{message.metadata.tokenCount && (
							<span className='ml-2'>
								Tokens: {message.metadata.tokenCount}
							</span>
						)}
					</div>
				)}
			</div>
		</motion.div>
	);
};

// Streaming Message Component
const StreamingMessage: React.FC<{ content: string }> = ({ content }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className='flex gap-3 p-4'
		>
			<Avatar className='h-8 w-8 flex-shrink-0'>
				<AvatarFallback className='bg-green-100 text-green-700'>
					<Bot className='h-4 w-4' />
				</AvatarFallback>
			</Avatar>

			<div className='flex-1'>
				<div className='inline-block max-w-[85%] rounded-lg border border-gray-200 bg-white p-3 text-gray-900'>
					<div className='prose prose-sm max-w-none'>
						<ReactMarkdown>{content}</ReactMarkdown>
					</div>
					<div className='mt-2 flex items-center gap-1'>
						<div className='h-2 w-2 animate-pulse rounded-full bg-green-500'></div>
						<span className='text-xs text-green-600'>AI is typing...</span>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

// Suggested Actions Component
const SuggestedActions: React.FC<{
	actions: Array<{
		id: string;
		type: 'create_node' | 'connect_nodes' | 'expand_topic' | 'summarize';
		label: string;
		description: string;
		params?: Record<string, any>;
	}>;
	onExecute: (actionId: string) => void;
}> = ({ actions, onExecute }) => {
	if (actions.length === 0) return null;

	return (
		<div className='border-t border-gray-200 p-4'>
			<h4 className='mb-2 text-sm font-medium text-gray-700'>
				Suggested Actions
			</h4>
			<div className='flex flex-wrap gap-2'>
				{actions.map((action) => (
					<Button
						key={action.id}
						variant='outline'
						size='sm'
						onClick={() => onExecute(action.id)}
						className='h-auto flex-col items-start p-2 text-left'
					>
						<Sparkles className='mb-1 h-3 w-3' />
						<span className='text-xs font-medium'>{action.label}</span>
						<span className='text-xs text-gray-500'>{action.description}</span>
					</Button>
				))}
			</div>
		</div>
	);
};

// Main Chat Panel Component
export const ChatPanel: React.FC<ChatPanelProps> = ({
	className,
	defaultPosition,
	defaultSize,
}) => {
	const {
		// Chat state
		currentSession,
		uiState,
		streamingMessage,
		suggestedActions,
		context,

		// Chat actions
		sendMessage,
		stopStreaming,
		openChat,
		closeChat,
		minimizeChat,
		maximizeChat,
		setInputValue,
		clearError,
		createNewSession,
		regenerateResponse,
		executeSuggestedAction,

		// Context
		mapId,
		selectedNodes,
		mindMap,
	} = useAppStore();

	// Mobile optimization
	const {
		isMobile,
		isTablet,
		orientation,
		isKeyboardOpen,
		touchHandlers,
		mobileDimensions,
		optimizeForMobile,
		triggerHapticFeedback,
	} = useMobileChat();

	// Accessibility features
	const accessibilityFeatures = useChatAccessibility();
	const {
		refs,
		preferences,
		announce,
		getAriaAttributes,
		getSemanticLabel,
		getHighContrastStyles,
		getMotionStyles,
		liveRegions,
	} = accessibilityFeatures;

	const [isVisible, setIsVisible] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive
	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, []);

	useEffect(() => {
		if (currentSession?.messages.length || streamingMessage) {
			scrollToBottom();
		}
	}, [currentSession?.messages.length, streamingMessage, scrollToBottom]);

	// Initialize chat session when map changes
	useEffect(() => {
		if (mapId && !currentSession) {
			createNewSession(mapId, mindMap?.title);
		}
	}, [mapId, currentSession, createNewSession, mindMap?.title]);

	// Show/hide chat panel based on UI state
	useEffect(() => {
		setIsVisible(uiState.isOpen);
	}, [uiState.isOpen]);

	// Handle message submission
	const handleSendMessage = useCallback(async () => {
		const message = uiState.inputValue.trim();
		if (!message || uiState.isLoading) return;

		// Trigger haptic feedback on mobile
		if (isMobile) {
			triggerHapticFeedback('light');
		}

		setInputValue('');
		await sendMessage(message, {
			sourceType: 'manual',
			nodeId: selectedNodes[0]?.id,
		});

		// Announce message sent
		announce('Message sent', 'polite');
	}, [
		uiState.inputValue,
		uiState.isLoading,
		isMobile,
		setInputValue,
		sendMessage,
		selectedNodes,
		triggerHapticFeedback,
		announce,
	]);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleSendMessage();
			}
		},
		[handleSendMessage]
	);

	// Handle copy message
	const handleCopyMessage = useCallback(
		(content: string) => {
			announce('Message copied to clipboard', 'polite');
			if (isMobile) {
				triggerHapticFeedback('light');
			}
		},
		[announce, isMobile, triggerHapticFeedback]
	);

	if (!isVisible) return null;

	// Use mobile dimensions when on mobile devices
	const dimensions = isMobile
		? mobileDimensions
		: { width: uiState.size.width, height: uiState.size.height };
	const motionStyles = getMotionStyles();
	const contrastStyles = getHighContrastStyles();

	return (
		<>
			{liveRegions}
			<AnimatePresence>
				<motion.div
					ref={refs.chatContainer}
					initial={
						preferences.reducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }
					}
					animate={
						preferences.reducedMotion ? {} : { opacity: 1, scale: 1, y: 0 }
					}
					exit={
						preferences.reducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }
					}
					transition={preferences.reducedMotion ? {} : { duration: 0.2 }}
					className={`fixed ${isMobile ? 'right-4 left-4' : 'right-4 top-4'} z-50 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl ${className}`}
					style={{
						...motionStyles,
						...contrastStyles,
						...(uiState.position &&
							!isMobile && {
								left: uiState.position.x,
								top: uiState.position.y,
							}),
						...(isMobile && {
							bottom: isKeyboardOpen ? '10px' : '20px',
							left: '16px',
							right: '16px',
							width: 'auto',
						}),
						width: isMobile ? 'auto' : dimensions.width,
						height: dimensions.height,
					}}
					{...touchHandlers}
					{...getAriaAttributes('chat-container')}
				>
					{/* Header */}
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle
							id='chat-title'
							className='flex items-center gap-2 text-sm font-medium'
						>
							<MessageSquare className='h-4 w-4' />
							AI Chat
							{context?.selectedNodeIds &&
								context.selectedNodeIds.length > 0 && (
									<span className='text-xs text-gray-500'>
										({context.selectedNodeIds.length} selected)
									</span>
								)}
						</CardTitle>

						{/* Hidden description for screen readers */}
						<div id='chat-description' className='sr-only'>
							{getSemanticLabel('chat-status')}.{' '}
							{getSemanticLabel('message-count')}. Use Ctrl+/ to toggle chat,
							Ctrl+Enter to send messages, Escape to close.
						</div>

						<div className='flex items-center gap-1'>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant='ghost'
											size='sm'
											onClick={
												uiState.isMinimized ? maximizeChat : minimizeChat
											}
											className='h-6 w-6 p-0'
										>
											{uiState.isMinimized ? (
												<Maximize2 className='h-3 w-3' />
											) : (
												<Minimize2 className='h-3 w-3' />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										{uiState.isMinimized ? 'Maximize' : 'Minimize'}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>

							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant='ghost'
											size='sm'
											onClick={closeChat}
											className='h-6 w-6 p-0'
										>
											<X className='h-3 w-3' />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Close chat</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</CardHeader>

					{!uiState.isMinimized && (
						<>
							{/* Messages Area */}
							<CardContent className='flex-1 overflow-hidden p-0'>
								<ScrollArea
									className='h-full'
									{...getAriaAttributes('messages-list')}
									ref={refs.messagesContainer}
								>
									<div className='space-y-2'>
										{/* Session Messages */}
										{currentSession?.messages.map((message, index) => (
											<div key={message.id} {...getAriaAttributes('message')}>
												<ChatMessage
													message={message}
													isLast={index === currentSession.messages.length - 1}
													onCopy={handleCopyMessage}
													onRegenerate={regenerateResponse}
												/>
											</div>
										))}

										{/* Streaming Message */}
										{uiState.isStreaming && streamingMessage && (
											<StreamingMessage content={streamingMessage} />
										)}

										{/* Error Display */}
										{uiState.lastError && (
											<motion.div
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												className='mx-4 rounded-lg bg-red-50 border border-red-200 p-3'
											>
												<div className='flex items-center justify-between'>
													<p className='text-sm text-red-700'>
														{uiState.lastError}
													</p>
													<Button
														variant='ghost'
														size='sm'
														onClick={clearError}
														className='h-6 w-6 p-0'
													>
														<X className='h-3 w-3' />
													</Button>
												</div>
											</motion.div>
										)}

										<div ref={messagesEndRef} />
									</div>
								</ScrollArea>
							</CardContent>

							{/* Suggested Actions */}
							<SuggestedActions
								actions={suggestedActions}
								onExecute={executeSuggestedAction}
							/>

							{/* Input Area */}
							<div className='border-t border-gray-200 p-4'>
								<div className='flex gap-2'>
									<div className='flex-1'>
										<Textarea
											ref={refs.input}
											value={uiState.inputValue}
											onChange={(e) => setInputValue(e.target.value)}
											onKeyDown={handleKeyDown}
											placeholder={
												isMobile
													? 'Ask about your map...'
													: 'Ask about your mind map...'
											}
											className={`${isMobile ? 'min-h-[60px]' : 'min-h-[80px]'} resize-none`}
											disabled={uiState.isLoading}
											{...getAriaAttributes('input')}
										/>
										{/* Input help text for screen readers */}
										<div id='input-help' className='sr-only'>
											Type your message and press Ctrl+Enter to send, or use the
											send button.
										</div>
									</div>

									<div className='flex flex-col gap-2'>
										{uiState.isStreaming ? (
											<Button
												onClick={stopStreaming}
												size='sm'
												variant='outline'
												className='h-10 w-10 p-0'
											>
												<StopCircle className='h-4 w-4' />
											</Button>
										) : (
											<Button
												onClick={handleSendMessage}
												disabled={
													!uiState.inputValue.trim() || uiState.isLoading
												}
												size='sm'
												className='h-10 w-10 p-0'
												{...getAriaAttributes('send-button')}
											>
												<Send className='h-4 w-4' />
											</Button>
										)}
										{/* Send button help text for screen readers */}
										<div id='send-help' className='sr-only'>
											Send your message to the AI assistant.
										</div>
									</div>
								</div>

								{/* Status Indicator */}
								<div className='mt-2 flex items-center justify-between text-xs text-gray-500'>
									<span aria-live='polite'>
										{uiState.isLoading
											? 'Thinking...'
											: uiState.isStreaming
												? 'Streaming response...'
												: `${uiState.inputValue.length}/2000`}
									</span>

									{context?.selectedNodeIds &&
										context.selectedNodeIds.length > 0 && (
											<span
												aria-label={`${context.selectedNodeIds.length} nodes selected for context`}
											>
												{context.selectedNodeIds.length} nodes selected
											</span>
										)}
								</div>
							</div>
						</>
					)}
				</motion.div>
			</AnimatePresence>
		</>
	);
};

export default ChatPanel;
