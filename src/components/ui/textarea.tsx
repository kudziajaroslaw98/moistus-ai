import { cn } from '@/utils/cn';
import { type HTMLMotionProps, motion } from 'motion/react';
import { forwardRef } from 'react';

export interface TextareaProps extends HTMLMotionProps<'textarea'> {
	error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, error, ...props }, ref) => {
		return (
			<motion.textarea
				ref={ref}
				className={cn(
					'mt-1 block min-h-[80px] w-full rounded-sm border  border-zinc-700/50 bg-zinc-800/30 px-3 py-2 text-text-high placeholder-node-text-secondary transition-all duration-200 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
					error
						? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
						: 'focus:border-app-primary/60 focus:bg-zinc-800/70 focus:ring-2 focus:ring-app-primary/20 focus:ring-offset-2 focus:ring-offset-app-primary-muted',
					className
				)}
				{...props}
			/>
		);
	}
);

Textarea.displayName = 'Textarea';

export { Textarea };
