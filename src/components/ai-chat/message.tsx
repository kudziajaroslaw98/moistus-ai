import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/store/slices/chat-slice';
import { cn } from '@/utils/cn';
import { Bot, CheckCheck, Copy, Settings, User } from 'lucide-react';
import { memo, useState } from 'react';

export interface MessageProps extends ChatMessage {
	isLoading?: boolean;
	error?: string;
	showMetadata?: boolean;
}

function MessageComponent({
	id: _id,
	content,
	role,
	timestamp,
	metadata,
	isLoading = false,
	error,
	showMetadata = false,
}: MessageProps) {
	const [copied, setCopied] = useState(false);
	const [showMeta, setShowMeta] = useState(showMetadata);

	const isUser = role === 'user';
	const isSystem = role === 'system';

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(content);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy text:', err);
		}
	};

	return (
		<div
			className={cn(
				'flex gap-3 w-full animate-in fade-in-50 slide-in-from-bottom-2 duration-300',
				isUser ? 'flex-row-reverse' : 'flex-row'
			)}
			role='article'
			aria-label={`${role} message`}
		>
			{/* Avatar */}
			<div className='flex-shrink-0'>
				<Avatar className='h-8 w-8'>
					{isUser ? (
						<>
							<AvatarImage src='/user-avatar.png' alt='User' />

							<AvatarFallback className='bg-blue-600 text-white text-xs'>
								<User className='h-4 w-4' />
							</AvatarFallback>
						</>
					) : isSystem ? (
						<>
							<AvatarImage src='/system-avatar.png' alt='System' />

							<AvatarFallback className='bg-gray-600 text-white text-xs'>
								<Settings className='h-4 w-4' />
							</AvatarFallback>
						</>
					) : (
						<>
							<AvatarImage src='/ai-avatar.png' alt='AI Assistant' />

							<AvatarFallback className='bg-teal-600 text-white text-xs'>
								<Bot className='h-4 w-4' />
							</AvatarFallback>
						</>
					)}
				</Avatar>
			</div>

			{/* Message Content */}
			<div
				className={cn(
					'flex flex-col gap-1 max-w-[85%] min-w-0 group',
					isUser ? 'items-end' : 'items-start'
				)}
			>
				{/* Message Bubble */}
				<div className='relative'>
					<div
						className={cn(
							'rounded-xl px-4 py-3 text-sm break-words shadow-sm relative',
							isUser
								? 'bg-blue-600 text-white rounded-br-md max-w-fit ml-auto'
								: isSystem
									? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded-bl-md border border-yellow-300 dark:border-yellow-700'
									: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md',
							isLoading && 'opacity-70 animate-pulse',
							error && 'border-2 border-red-300 dark:border-red-700'
						)}
					>
						{isLoading ? (
							<div className='flex items-center gap-3 py-1'>
								<div className='flex space-x-1'>
									<div className='w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]'></div>

									<div className='w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]'></div>

									<div className='w-2 h-2 bg-current rounded-full animate-bounce'></div>
								</div>

								<span className='text-xs opacity-70'>AI is thinking...</span>
							</div>
						) : error ? (
							<div className='text-red-600 dark:text-red-400'>
								<div className='flex items-center gap-2 mb-1'>
									<span className='text-xs font-semibold'>⚠️ Error</span>
								</div>

								<div className='text-xs'>{error}</div>
							</div>
						) : (
							<div className='whitespace-pre-wrap leading-relaxed'>
								{content}
							</div>
						)}
					</div>

					{/* Copy Button */}
					{!isLoading && !error && content && (
						<Button
							variant='ghost'
							size='icon'
							className={cn(
								'absolute -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
								isUser ? '-left-8' : '-right-8'
							)}
							onClick={handleCopy}
							aria-label='Copy message'
						>
							{copied ? (
								<CheckCheck className='h-3 w-3 text-green-600' />
							) : (
								<Copy className='h-3 w-3' />
							)}
						</Button>
					)}
				</div>

				{/* Timestamp and Status */}
				<div
					className={cn(
						'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-2',
						isUser ? 'flex-row-reverse' : 'flex-row'
					)}
				>
					<time dateTime={timestamp} className='tabular-nums'>
						{new Date(timestamp).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})}
					</time>

					{isUser && !isLoading && !error && (
						<span className='text-blue-500' aria-label='Message sent'>
							✓
						</span>
					)}

					{metadata && (showMeta || metadata.sourceType) && (
						<>
							{metadata.sourceType && (
								<span
									className={cn(
										'px-1.5 py-0.5 rounded text-xs font-medium',
										metadata.sourceType === 'auto' &&
											'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
										metadata.sourceType === 'suggestion' &&
											'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
										metadata.sourceType === 'manual' &&
											'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
									)}
								>
									{metadata.sourceType}
								</span>
							)}

							{showMeta && (
								<button
									onClick={() => setShowMeta(!showMeta)}
									className='text-xs opacity-50 hover:opacity-100 transition-opacity'
								>
									hide
								</button>
							)}
						</>
					)}

					{metadata && !showMeta && (metadata.model || metadata.tokenCount) && (
						<button
							onClick={() => setShowMeta(true)}
							className='text-xs opacity-50 hover:opacity-100 transition-opacity'
						>
							info
						</button>
					)}
				</div>

				{/* Metadata Display */}
				{metadata && showMeta && (
					<div
						className={cn(
							'text-xs text-gray-500 dark:text-gray-400 px-2 space-y-1',
							isUser ? 'text-right' : 'text-left'
						)}
					>
						{metadata.model && (
							<div className='flex items-center gap-1'>
								<span className='font-medium'>Model:</span>

								<span className='font-mono'>{metadata.model}</span>
							</div>
						)}

						{metadata.tokenCount && (
							<div className='flex items-center gap-1'>
								<span className='font-medium'>Tokens:</span>

								<span className='font-mono'>{metadata.tokenCount}</span>
							</div>
						)}

						{metadata.nodeId && (
							<div className='flex items-center gap-1'>
								<span className='font-medium'>Node:</span>

								<span className='font-mono text-xs'>
									{metadata.nodeId.slice(0, 8)}...
								</span>
							</div>
						)}

						{metadata.actionType && (
							<div className='flex items-center gap-1'>
								<span className='font-medium'>Action:</span>

								<span>{metadata.actionType}</span>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// Loading message component for streaming responses
export function LoadingMessage() {
	return (
		<MessageComponent
			id='loading'
			content=''
			role='assistant'
			timestamp={new Date().toISOString()}
			isLoading={true}
		/>
	);
}

// Error message component
export function ErrorMessage({ error }: { error: string }) {
	return (
		<MessageComponent
			id='error'
			content=''
			role='assistant'
			timestamp={new Date().toISOString()}
			error={error}
		/>
	);
}

export const Message = memo(MessageComponent);
