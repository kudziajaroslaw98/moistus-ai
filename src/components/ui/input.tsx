import { cn } from '@/utils/cn';
import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, error, ...props }, ref) => {
		return (
			<input
				className={cn(
					'block rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-1.5 text-zinc-100 placeholder-zinc-400 shadow-sm transition-all duration-200 focus:outline-none sm:text-sm',
					'hover:border-zinc-600/50 hover:bg-zinc-800/50',
					'focus:border-sky-500/60 focus:bg-zinc-800/70 focus:ring-2 focus:ring-sky-500/20 focus:ring-offset-2 focus:ring-offset-zinc-900',
					error
						? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
						: '',
					className,
					props.type === 'checkbox' || props.type === 'radio'
						? 'h-4 w-4'
						: 'h-9 w-full'
				)}
				ref={ref}
				{...props}
			/>
		);
	}
);

Input.displayName = 'Input';

export { Input };
