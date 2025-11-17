'use client';

import { cn } from '@/utils/cn';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, forwardRef, useState } from 'react';
import { Input } from './input';

export interface CreateMapFormProps {
	onSubmit: (title: string) => Promise<void> | void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	buttonText?: string;
	loadingText?: string;
}

const CreateMapForm = forwardRef<HTMLFormElement, CreateMapFormProps>(
	(
		{
			onSubmit,
			placeholder = 'New map title...',
			className,
			disabled = false,
			buttonText = 'Create',
			loadingText = 'Creating...',
		},
		ref
	) => {
		const [title, setTitle] = useState('');
		const [isSubmitting, setIsSubmitting] = useState(false);

		const handleSubmit = async (e: FormEvent) => {
			e.preventDefault();
			if (!title.trim() || isSubmitting || disabled) return;

			setIsSubmitting(true);

			try {
				await onSubmit(title.trim());
				setTitle('');
			} catch (error) {
				console.error('Error in CreateMapForm:', error);
			} finally {
				setIsSubmitting(false);
			}
		};

		const isDisabled = disabled || isSubmitting || !title.trim();

		return (
			<form
				className={cn('group relative max-w-md', className)}
				onSubmit={handleSubmit}
				ref={ref}
			>
				{/* Unified Input Group Container */}
				<div className='relative flex items-center rounded-lg border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-sm shadow-lg transition-all duration-200 hover:border-zinc-600/50 hover:bg-zinc-800/50 focus-within:border-sky-500/60 focus-within:bg-zinc-800/70 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900'>
					{/* Input Field */}
					<Input
						className='flex-1 !bg-transparent focus:!bg-transparent focus:border-transparent shadow-none focus:ring-offset-0 ring-transparent !border-transparent px-4 py-2.5 text-zinc-100 placeholder-zinc-400 focus:!outline-none focus:ring-0 disabled:opacity-50'
						disabled={disabled || isSubmitting}
						onChange={(e) => setTitle(e.target.value)}
						placeholder={placeholder}
						type='text'
						value={title}
					/>

					{/* Create Button */}
					<motion.button
						disabled={isDisabled}
						type='submit'
						whileHover={!isDisabled ? { scale: 1.02 } : {}}
						whileTap={!isDisabled ? { scale: 0.98 } : {}}
						className={cn(
							'relative m-1 overflow-hidden rounded-md px-4 py-2 font-medium text-white shadow-lg transition-all duration-200',
							'bg-gradient-to-r from-sky-600 to-sky-700 shadow-sky-600/25',
							!isDisabled &&
								'hover:shadow-xl hover:shadow-sky-600/30 active:shadow-sky-600/40',
							isDisabled && 'opacity-50 cursor-not-allowed'
						)}
					>
						{/* Background Glow Effect */}
						<div className='absolute inset-0 bg-gradient-to-r from-sky-500 to-sky-600 opacity-0 transition-opacity duration-200 group-hover:opacity-20' />

						{/* Button Content */}
						<div className='relative flex items-center gap-2'>
							<motion.div
								animate={isSubmitting ? { rotate: 360 } : { rotate: 0 }}
								transition={
									isSubmitting
										? { duration: 1, repeat: Infinity, ease: 'linear' as const }
										: {}
								}
							>
								<Plus className='h-4 w-4' />
							</motion.div>

							<span className='text-sm'>
								{isSubmitting ? loadingText : buttonText}
							</span>
						</div>
					</motion.button>
				</div>
			</form>
		);
	}
);

CreateMapForm.displayName = 'CreateMapForm';

export { CreateMapForm };
