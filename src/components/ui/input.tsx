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
					'block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-zinc-100 placeholder-zinc-500 shadow-sm focus:ring-1 focus:outline-none sm:text-sm',
					error
						? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
						: 'focus:border-teal-500 focus:ring-teal-500',
					className,
					props.type === 'checkbox' || props.type === 'radio' ? 'h-4' : 'h-8'
				)}
				ref={ref}
				{...props}
			/>
		);
	}
);

Input.displayName = 'Input';

export { Input };
