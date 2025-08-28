import { cn } from '@/utils/cn';
import { HTMLMotionProps, motion } from 'motion/react';
import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps
	extends HTMLMotionProps<'textarea'> {
	error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, error, ...props }, ref) => {
		return (
			<motion.textarea
				className={cn(
					'mt-1 block min-h-[80px] w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
					error
						? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
						: 'focus:border-teal-500 focus:ring-teal-500',
					className
				)}
				ref={ref}
				{...props}
			/>
		);
	}
);

Textarea.displayName = 'Textarea';

export { Textarea };
