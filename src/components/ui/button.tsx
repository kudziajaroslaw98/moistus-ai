import { cn } from '@/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLMotionProps, motion } from 'motion/react';
import { forwardRef } from 'react';

const buttonVariants = cva(
	'inline-flex items-center font-medium transition-all ease-out duration-300 cursor-pointer focus:outline-none disabled:opacity-38',
	{
		variants: {
			variant: {
				normal: '',
				outline: '',
				ghost: '',
			},
			state: {
				normal: '',
				disabled: 'pointer-events-none',
				dimmed: '',
				destructive: '',
				success: '',
			},
			size: {
				default: 'h-8 px-3 py-1.5 text-xs rounded-sm',
				sm: 'h-6 px-2 py-1 text-xs rounded',
				md: 'h-10 px-4 py-2 text-sm rounded',
				lg: 'h-12 px-6 py-3 text-sm rounded-md',
				icon: '!h-8 !w-8 p-0 rounded-sm',
				'icon-sm': '!h-6 !w-6 p-0 rounded',
				'icon-xs': '!h-4 !w-4 p-0 rounded',
				'icon-md': '!h-10 !w-10 p-0 rounded',
					'icon-lg': '!h-12 !w-12 p-0 rounded-md',
				// Material Design control sizes - 24px height for consistency
				'control-sm': 'h-6 px-1.5 text-xs rounded',
				'control-md': 'h-8 px-2 text-sm rounded',
			},
			align: {
				default: 'justify-center',
				left: 'justify-start',
				right: 'justify-end',
			},
		},
		compoundVariants: [
			{
				variant: 'normal',
				state: 'normal',
				className: 'bg-primary-600 text-white hover:bg-primary-700',
			},
			{
				variant: 'normal',
				state: 'dimmed',
				className:
					'bg-primary-600/70 text-white/85 hover:bg-primary-600/85 hover:text-white',
			},
			{
				variant: 'normal',
				state: 'destructive',
				className: 'bg-rose-600 text-white hover:bg-rose-700',
			},
			{
				variant: 'normal',
				state: 'success',
				className: 'bg-emerald-600 text-white hover:bg-emerald-700',
			},
			{
				variant: 'normal',
				state: 'disabled',
				className: 'bg-primary-600/60 text-white/70 opacity-38',
			},
			{
				variant: 'outline',
				state: 'normal',
				className:
					'border border-border-default bg-transparent text-white/87 hover:text-white hover:bg-white/5',
			},
			{
				variant: 'outline',
				state: 'dimmed',
				className:
					'border border-border-default bg-transparent text-white/60 hover:text-white/70 hover:bg-white/5',
			},
			{
				variant: 'outline',
				state: 'destructive',
				className:
					'border border-error-500 bg-transparent text-error-500 hover:border-error-400 hover:text-error-400 hover:bg-error-500/10',
			},
			{
				variant: 'outline',
				state: 'success',
				className:
					'border border-success-500 bg-transparent text-success-400 hover:border-success-400 hover:text-success-300 hover:bg-success-500/10',
			},
			{
				variant: 'outline',
				state: 'disabled',
				className:
					'border border-border-default bg-transparent text-text-disabled opacity-38',
			},
			{
				variant: 'ghost',
				state: 'normal',
				className:
					'bg-transparent text-white/60 hover:text-white/87 hover:bg-white/5',
			},
			{
				variant: 'ghost',
				state: 'dimmed',
				className:
					'bg-transparent text-white/45 hover:text-white/60 hover:bg-white/5',
			},
			{
				variant: 'ghost',
				state: 'destructive',
				className:
					'bg-transparent text-rose-400 hover:text-rose-300 hover:bg-rose-600/10',
			},
			{
				variant: 'ghost',
				state: 'success',
				className:
					'bg-transparent text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10',
			},
			{
				variant: 'ghost',
				state: 'disabled',
				className: 'bg-transparent text-text-disabled opacity-38',
			},
		],
		defaultVariants: {
			variant: 'normal',
			state: 'normal',
			size: 'default',
			align: 'default',
		},
	}
);

export interface ButtonProps
	extends HTMLMotionProps<'button'>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, state, size, align, disabled, ...props }, ref) => {
		const effectiveState = disabled ? 'disabled' : (state ?? 'normal');
		return (
			<motion.button
				className={cn(
					buttonVariants({
						variant,
						state: effectiveState,
						size,
						align,
						className,
					})
				)}
				disabled={disabled}
				ref={ref}
				{...props}
			/>
		);
	}
);

Button.displayName = 'Button';

export { Button, buttonVariants };
