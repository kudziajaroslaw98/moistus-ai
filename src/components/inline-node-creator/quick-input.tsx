'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { createNodeFromCommand } from './node-creator';
import type { QuickInputProps } from './types';

const theme = {
	container: 'p-4',
	input:
		'bg-zinc-900 text-zinc-100 placeholder-zinc-500 border-0 focus:ring-1 focus:ring-teal-500',
	preview: 'bg-zinc-900/50 border border-zinc-800 rounded-md p-3 mt-3',
	previewLabel: 'text-xs text-zinc-500 uppercase tracking-wider mb-1',
	previewContent: 'text-sm text-zinc-300',
	hint: 'text-xs text-zinc-500 mt-2',
	error: 'text-xs text-red-400 mt-2',
	examples: 'text-xs text-zinc-500 mt-2 flex items-center gap-2',
	exampleButton:
		'text-teal-500 hover:text-teal-400 cursor-pointer transition-colors',
};

export const QuickInput: React.FC<QuickInputProps> = ({
	command,
	parentNode,
	position,
}) => {
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const [value, setValue] = useState('');
	const [preview, setPreview] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

	const { closeInlineCreator, addNode } = useAppStore(
		useShallow((state) => ({
			closeInlineCreator: state.closeInlineCreator,
			addNode: state.addNode,
		}))
	);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Parse input in real-time for preview
	useEffect(() => {
		if (!value.trim() || !command.quickParse) {
			setPreview(null);
			setError(null);
			return;
		}

		try {
			const parsed = command.quickParse(value);
			setPreview(parsed);
			setError(null);
		} catch (err) {
			setPreview(null);
			setError('Invalid input format');
		}
	}, [value, command]);

	// Handle node creation
	const handleCreate = useCallback(async () => {
		if (!value.trim() || isCreating) return;

		setIsCreating(true);
		setError(null);

		try {
			const nodeData = command.quickParse
				? command.quickParse(value)
				: { content: value };

			const result = await createNodeFromCommand({
				command,
				data: nodeData,
				position,
				parentNode,
				addNode,
			});

			if (result.success) {
				closeInlineCreator();
			} else {
				setError(result.error || 'Failed to create node');
			}
		} catch (err) {
			setError('An error occurred while creating the node');
		} finally {
			setIsCreating(false);
		}
	}, [
		value,
		command,
		position,
		parentNode,
		addNode,
		closeInlineCreator,
		isCreating,
	]);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleCreate();
			}
		},
		[handleCreate]
	);

	// Handle example cycling
	const handleUseExample = useCallback(() => {
		if (command.examples && command.examples.length > 0) {
			const example = command.examples[currentExampleIndex];
			setValue(example);
			setCurrentExampleIndex((prev) => (prev + 1) % command.examples.length);
		}
	}, [command.examples, currentExampleIndex]);

	// Render preview based on node type
	const renderPreview = () => {
		if (!preview) return null;

		switch (command.nodeType) {
			case 'taskNode':
				return (
					<div>
						{preview.tasks && preview.tasks.length > 0 ? (
							<div className='space-y-1.5'>
								{preview.tasks.slice(0, 5).map((task: any, index: number) => (
									<div key={index} className='flex items-center gap-2'>
										<div className='w-3 h-3 border border-zinc-600 rounded-sm' />

										<span className='text-sm'>{task.text}</span>
									</div>
								))}

								{preview.tasks.length > 5 && (
									<div className='text-xs text-zinc-500 pl-5'>
										+{preview.tasks.length - 5} more tasks...
									</div>
								)}
							</div>
						) : (
							<div className='flex items-center gap-2'>
								<div className='w-4 h-4 border border-zinc-600 rounded' />

								<span>New task</span>
							</div>
						)}

						<div className='mt-2 space-y-1'>
							{preview.dueDate && (
								<div className='text-xs text-zinc-500'>
									Due: {preview.dueDate.toLocaleDateString()}
								</div>
							)}

							{preview.priority && (
								<div className='text-xs text-zinc-500'>
									Priority: {preview.priority}
								</div>
							)}

							{preview.tasks && preview.tasks.length > 1 && (
								<div className='text-xs text-zinc-500'>
									Total tasks: {preview.tasks.length}
								</div>
							)}
						</div>
					</div>
				);

			case 'codeNode':
				return (
					<div>
						<div className='text-xs text-teal-500 mb-1'>
							{preview.language || 'plaintext'}
						</div>

						<pre className='text-xs overflow-x-auto'>
							<code>{preview.code || '// Your code here'}</code>
						</pre>
					</div>
				);

			case 'imageNode':
				return (
					<div>
						<div className='text-xs text-zinc-500 mb-1'>Image URL:</div>

						<div className='text-xs truncate'>{preview.url}</div>

						{preview.alt && (
							<div className='text-xs text-zinc-500 mt-1'>
								Alt: {preview.alt}
							</div>
						)}
					</div>
				);

			case 'annotationNode':
				return (
					<div
						className={cn(
							'px-2 py-1 rounded',
							preview.type === 'warning' && 'bg-yellow-500/10 text-yellow-400',
							preview.type === 'error' && 'bg-red-500/10 text-red-400',
							preview.type === 'success' && 'bg-green-500/10 text-green-400',
							preview.type === 'info' && 'bg-blue-500/10 text-blue-400',
							(!preview.type || preview.type === 'note') &&
								'bg-zinc-700/50 text-zinc-300'
						)}
					>
						{preview.icon && <span className='mr-1'>{preview.icon}</span>}

						{preview.text}
					</div>
				);

			default:
				return (
					<div className='text-sm'>
						{preview.content || preview.text || preview.question || 'Preview'}
					</div>
				);
		}
	};

	return (
		<div className={theme.container}>
			<div className='flex items-center gap-2 mb-3'>
				<command.icon className='w-4 h-4 text-zinc-400' />

				<h3 className='text-sm font-medium text-zinc-100'>{command.label}</h3>

				<Sparkles className='w-3 h-3 text-teal-500 ml-auto' />
			</div>

			<textarea
				ref={inputRef}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={`Type naturally... ${command.examples?.[0] || ''}`}
				className={cn(
					theme.input,
					'w-full px-3 py-2 text-sm rounded-md resize-none',
					'min-h-[80px] max-h-[200px]'
				)}
				disabled={isCreating}
			/>

			{preview && (
				<motion.div
					className={theme.preview}
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
				>
					<div className={theme.previewLabel}>Preview</div>

					<div className={theme.previewContent}>{renderPreview()}</div>
				</motion.div>
			)}

			{command.examples && command.examples.length > 0 && !value && (
				<div className={theme.examples}>
					<span>Try:</span>

					<button
						onClick={handleUseExample}
						className={theme.exampleButton}
						type='button'
					>
						{command.examples[currentExampleIndex]}
					</button>

					{command.examples.length > 1 && (
						<span className='text-zinc-600'>
							({currentExampleIndex + 1}/{command.examples.length})
						</span>
					)}
				</div>
			)}

			{error && (
				<motion.div
					className={theme.error}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
				>
					{error}
				</motion.div>
			)}

			<div className='flex items-center justify-between mt-4'>
				<span className='text-xs text-zinc-500'>
					Press Enter to create • Shift+Enter for new line
				</span>

				<button
					onClick={handleCreate}
					disabled={!value.trim() || isCreating}
					className={cn(
						'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
						'bg-teal-600 hover:bg-teal-700 text-white',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)}
				>
					{isCreating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	);
};
