'use client';

import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { MessageSquarePlus, Sparkles, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { AIUsageIndicator } from './ai-usage-indicator';
import { ChatContextSelector } from './chat-context-selector';
import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';

export function ChatPanel() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();

	const {
		chatMessages,
		isChatOpen,
		isChatStreaming,
		chatContext,
		closeChat,
		sendChatMessage,
		clearChatMessages,
		setChatContextMode,
		selectedNodes,
		nodes,
	} = useAppStore(
		useShallow((state) => ({
			chatMessages: state.chatMessages,
			isChatOpen: state.isChatOpen,
			isChatStreaming: state.isChatStreaming,
			chatContext: state.chatContext,
			closeChat: state.closeChat,
			sendChatMessage: state.sendChatMessage,
			clearChatMessages: state.clearChatMessages,
			setChatContextMode: state.setChatContextMode,
			selectedNodes: state.selectedNodes,
			nodes: state.nodes,
		}))
	);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (scrollRef.current && chatMessages.length > 0) {
			const scrollElement = scrollRef.current.querySelector(
				'[data-slot="scroll-area-viewport"]'
			);
			if (scrollElement) {
				scrollElement.scrollTop = scrollElement.scrollHeight;
			}
		}
	}, [chatMessages]);

	const handleSend = useCallback(
		async (content: string) => {
			await sendChatMessage(content);
		},
		[sendChatMessage]
	);

	const handleClearChat = useCallback(() => {
		clearChatMessages();
	}, [clearChatMessages]);

	// Animation config - use string easing to satisfy Motion types
	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: 'easeOut' as const };

	const hasMessages = chatMessages.length > 0;
	const hasSelection = selectedNodes.length > 0;

	return (
		<SidePanel
			isOpen={isChatOpen}
			onClose={closeChat}
			title='AI Assistant'
			className='w-[400px]'
			footer={
				<div className='w-full'>
					<ChatInput
						onSend={handleSend}
						isStreaming={isChatStreaming}
						placeholder={
							hasSelection
								? `Ask about ${selectedNodes.length} selected node${selectedNodes.length > 1 ? 's' : ''}...`
								: 'Ask anything about your mind map...'
						}
					/>
				</div>
			}
		>
			<div className='flex flex-1 flex-col h-full min-h-0'>
				{/* Header row: Context selector + AI usage */}
				<div className='flex items-start gap-2 mx-4 mt-3'>
					<div className='flex-1 min-w-0'>
						<ChatContextSelector
							contextMode={chatContext.contextMode}
							onContextModeChange={setChatContextMode}
							nodeCount={nodes.length}
							disabled={isChatStreaming}
						/>
					</div>
					<AIUsageIndicator />
				</div>

				{/* Selection indicator */}
				{hasSelection && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={transition}
						className='shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20'
					>
						<div className='flex items-center gap-2 text-xs text-primary-300'>
							<Sparkles className='h-3.5 w-3.5' />
							<span>
								+ {selectedNodes.length} focused node
								{selectedNodes.length > 1 ? 's' : ''}
							</span>
						</div>
					</motion.div>
				)}

				{/* Messages area */}
				{hasMessages ? (
					<div className='flex-1 min-h-0 flex flex-col'>
						{/* Header with clear button */}
						<div className='shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-800/50'>
							<span className='text-xs text-zinc-500'>
								{chatMessages.length} message{chatMessages.length !== 1 ? 's' : ''}
							</span>

							<Button
								variant='ghost'
								size='icon-sm'
								onClick={handleClearChat}
								className='text-zinc-400 hover:text-rose-400'
								title='Clear conversation'
							>
								<Trash2 className='h-3.5 w-3.5' />
							</Button>
						</div>

						{/* Scrollable message list */}
						<ScrollArea className='flex-1 px-4' ref={scrollRef}>
							<div className='py-4 space-y-1'>
								{chatMessages.map((message, index) => (
									<ChatMessage
										key={message.id}
										message={message}
										isStreaming={
											isChatStreaming &&
											message.role === 'assistant' &&
											index === chatMessages.length - 1
										}
									/>
								))}
							</div>
						</ScrollArea>
					</div>
				) : (
					// Empty state
					<div className='flex-1 flex flex-col items-center justify-center px-6 text-center'>
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={transition}
							className='flex flex-col items-center gap-4'
						>
							<div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/20 to-violet-500/20 border border-primary-500/20'>
								<MessageSquarePlus className='h-8 w-8 text-primary-400' />
							</div>

							<div className='space-y-2'>
								<h3 className='text-base font-medium text-zinc-200'>
									Start a conversation
								</h3>
								<p className='text-sm text-zinc-400 max-w-[280px]'>
									Ask questions, brainstorm ideas, or get suggestions for your
									mind map.
								</p>
							</div>

							<div className='pt-4 space-y-2 w-full max-w-[280px]'>
								<p className='text-xs text-zinc-500 uppercase tracking-wider'>
									Try asking
								</p>
								<div className='flex flex-col gap-2'>
									{[
										'What themes do you see in my map?',
										'Suggest ideas for expanding this topic',
										'How can I better organize these concepts?',
									].map((prompt) => (
										<button
											key={prompt}
											type='button'
											onClick={() => handleSend(prompt)}
											disabled={isChatStreaming}
											className={cn(
												'px-3 py-2 text-left text-xs rounded-lg transition-all duration-200',
												'bg-zinc-800/30 border border-zinc-700/50 text-zinc-300',
												'hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-primary-300',
												'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
												isChatStreaming && 'opacity-50 cursor-not-allowed'
											)}
										>
											{prompt}
										</button>
									))}
								</div>
							</div>
						</motion.div>
					</div>
				)}
			</div>
		</SidePanel>
	);
}
