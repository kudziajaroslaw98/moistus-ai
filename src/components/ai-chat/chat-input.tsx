'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
	type ChangeEvent,
	type KeyboardEvent,
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	isStreaming?: boolean;
	placeholder?: string;
	maxLength?: number;
}

// Quick prompt suggestions
const QUICK_PROMPTS = [
	{ label: 'Suggest ideas', prompt: 'Suggest some new ideas to explore based on my current mind map' },
	{ label: 'Summarize', prompt: 'Summarize the main themes in my mind map' },
	{ label: 'Find connections', prompt: 'What connections or patterns do you see between my ideas?' },
	{ label: 'Expand on this', prompt: 'Help me expand on the selected nodes with more details' },
];

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
	(
		{
			onSend,
			disabled = false,
			isStreaming = false,
			placeholder = 'Ask anything about your mind map...',
			maxLength = 4000,
		},
		ref
	) => {
		const [value, setValue] = useState('');
		const [showQuickPrompts, setShowQuickPrompts] = useState(false);
		const internalRef = useRef<HTMLTextAreaElement>(null);
		const shouldReduceMotion = useReducedMotion();

		// Combine refs
		const textareaRef = (node: HTMLTextAreaElement) => {
			internalRef.current = node;
			if (typeof ref === 'function') {
				ref(node);
			} else if (ref) {
				ref.current = node;
			}
		};

		// Auto-resize textarea
		useEffect(() => {
			const textarea = internalRef.current;
			if (textarea) {
				textarea.style.height = 'auto';
				const newHeight = Math.min(textarea.scrollHeight, 200);
				textarea.style.height = `${newHeight}px`;
			}
		}, [value]);

		const handleChange = useCallback(
			(e: ChangeEvent<HTMLTextAreaElement>) => {
				const newValue = e.target.value;
				if (newValue.length <= maxLength) {
					setValue(newValue);
				}
			},
			[maxLength]
		);

		const handleSend = useCallback(() => {
			const trimmedValue = value.trim();
			if (trimmedValue && !disabled && !isStreaming) {
				onSend(trimmedValue);
				setValue('');
				setShowQuickPrompts(false);
			}
		}, [value, disabled, isStreaming, onSend]);

		const handleKeyDown = useCallback(
			(e: KeyboardEvent<HTMLTextAreaElement>) => {
				// Send on Cmd/Ctrl + Enter
				if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
					e.preventDefault();
					handleSend();
				}
			},
			[handleSend]
		);

		const handleQuickPrompt = useCallback(
			(prompt: string) => {
				onSend(prompt);
				setShowQuickPrompts(false);
			},
			[onSend]
		);

		const isDisabled = disabled || isStreaming;
		const canSend = value.trim().length > 0 && !isDisabled;
		const characterCount = value.length;
		const isNearLimit = characterCount > maxLength * 0.9;

		// Animation config - use string easing to satisfy Motion types
		const transition = shouldReduceMotion
			? { duration: 0 }
			: { duration: 0.2, ease: 'easeOut' as const };

		return (
			<div className='flex flex-col gap-2'>
				{/* Quick prompts toggle */}
				<div className='flex items-center gap-2'>
					<button
						type='button'
						onClick={() => setShowQuickPrompts(!showQuickPrompts)}
						disabled={isDisabled}
						className={cn(
							'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors duration-200',
							'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
							isDisabled && 'opacity-50 cursor-not-allowed'
						)}
					>
						<Sparkles className='h-3 w-3' />
						Quick prompts
					</button>
				</div>

				{/* Quick prompts dropdown */}
				{showQuickPrompts && (
					<motion.div
						initial={{ opacity: 0, y: -5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -5 }}
						transition={transition}
						className='flex flex-wrap gap-2 pb-2'
					>
						{QUICK_PROMPTS.map((item) => (
							<button
								key={item.label}
								type='button'
								onClick={() => handleQuickPrompt(item.prompt)}
								disabled={isDisabled}
								className={cn(
									'px-2.5 py-1.5 text-xs rounded-md border transition-all duration-200',
									'border-zinc-700/50 bg-zinc-800/30 text-zinc-300',
									'hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-primary-300',
									'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
									isDisabled && 'opacity-50 cursor-not-allowed'
								)}
							>
								{item.label}
							</button>
						))}
					</motion.div>
				)}

				{/* Input area */}
				<div
					className={cn(
						'relative flex items-end gap-2 p-2 rounded-lg border transition-all duration-200',
						'bg-zinc-800/30 border-zinc-700/50',
						'focus-within:border-primary-500/50 focus-within:bg-zinc-800/50',
						isDisabled && 'opacity-60'
					)}
				>
					<textarea
						ref={textareaRef}
						value={value}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={isDisabled}
						rows={1}
						className={cn(
							'flex-1 min-h-[40px] max-h-[200px] bg-transparent text-sm text-text-primary placeholder:text-zinc-500',
							'resize-none border-none outline-none',
							'scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent'
						)}
					/>

					{/* Send button */}
					<Button
						type='button'
						onClick={handleSend}
						disabled={!canSend}
						size='icon-sm'
						variant={canSend ? 'default' : 'secondary'}
						className={cn(
							'shrink-0 transition-all duration-200',
							canSend && 'bg-primary-500 hover:bg-primary-600'
						)}
					>
						{isStreaming ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<ArrowUp className='h-4 w-4' />
						)}
					</Button>
				</div>

				{/* Character count and shortcut hint */}
				<div className='flex items-center justify-between px-1 text-[10px] text-zinc-500'>
					<span className='flex items-center gap-1'>
						<kbd className='px-1 py-0.5 rounded bg-zinc-800/50 font-mono'>
							{navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}
						</kbd>
						<span>+</span>
						<kbd className='px-1 py-0.5 rounded bg-zinc-800/50 font-mono'>
							Enter
						</kbd>
						<span>to send</span>
					</span>

					<span
						className={cn(
							'transition-colors duration-200',
							isNearLimit && 'text-amber-400'
						)}
					>
						{characterCount}/{maxLength}
					</span>
				</div>
			</div>
		);
	}
);

ChatInput.displayName = 'ChatInput';
