'use client';

import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';

interface TagInputProps {
	value: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	maxTags?: number;
	className?: string;
	error?: boolean;
}

export function TagInput({
	value = [],
	onChange,
	placeholder = 'Type and press Enter...',
	maxTags = 20,
	className,
	error,
}: TagInputProps) {
	const [inputValue, setInputValue] = useState('');

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag();
		} else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
			// Remove last tag when backspace is pressed on empty input
			removeTag(value.length - 1);
		}
	};

	const addTag = () => {
		const trimmedValue = inputValue.trim();

		if (!trimmedValue) return;

		// Check if tag already exists
		if (value.includes(trimmedValue)) {
			setInputValue('');
			return;
		}

		// Check max tags limit
		if (value.length >= maxTags) {
			setInputValue('');
			return;
		}

		onChange([...value, trimmedValue]);
		setInputValue('');
	};

	const removeTag = (indexToRemove: number) => {
		onChange(value.filter((_, index) => index !== indexToRemove));
	};

	return (
		<div
			className={cn(
				'flex min-h-[2.25rem] flex-wrap items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-1.5 shadow-sm transition-all duration-200',
				'hover:border-zinc-600/50 hover:bg-zinc-800/50',
				'focus-within:border-app-primary/60 focus-within:bg-zinc-800/70 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:ring-offset-2 focus-within:ring-offset-app-primary-muted',
				error
					? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/20'
					: '',
				className
			)}
		>
			{/* Tags */}
			{value.map((tag, index) => (
				<span
					key={index}
					className='group inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/30 transition-colors hover:bg-sky-500/30'
				>
					{tag}
					<button
						type='button'
						onClick={() => removeTag(index)}
						className='rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-sky-400'
						aria-label={`Remove ${tag} tag`}
					>
						<X className='h-3 w-3' />
					</button>
				</span>
			))}

			{/* Input */}
			<input
				type='text'
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={addTag}
				placeholder={value.length === 0 ? placeholder : ''}
				className='min-w-[120px] flex-1 border-none bg-transparent text-sm text-zinc-100 placeholder-zinc-400 outline-none'
				disabled={value.length >= maxTags}
			/>

			{/* Tag count indicator */}
			{value.length > 0 && (
				<span className='text-xs text-zinc-500'>
					{value.length}/{maxTags}
				</span>
			)}
		</div>
	);
}
