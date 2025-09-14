import { cn } from '@/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { HTMLMotionProps, motion } from 'motion/react';
import { forwardRef } from 'react';

const buttonVariants = cva(
	'inline-flex items-center font-medium transition-all duration-200 cursor-pointer focus:outline-none disabled:opacity-38 disabled:pointer-events-none',
	{
		variants: {
			variant: {
				default: 'bg-teal-600 text-white hover:bg-teal-700',
				secondary:
					'border text-white/87 hover:text-white hover:bg-white/5',
				destructive:
					'bg-rose-600 text-white hover:bg-rose-700',
				ghost:
					'bg-transparent hover:bg-white/5 text-white/60 hover:text-white/87',
				'ghost-destructive':
					'bg-transparent hover:bg-rose-600/10 text-rose-400 hover:text-rose-300',
				outline:
					'border bg-transparent hover:bg-white/5 text-white/60 hover:text-white/87',
				success:
					'bg-emerald-600 text-white hover:bg-emerald-700',
				sky: 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-lg shadow-sky-600/25 hover:shadow-xl hover:shadow-sky-600/30 transition-all duration-200',
				// Material Design control button variant
				control: 'h-6 px-1.5 text-xs border border-white/10 bg-white/5 text-white/87 hover:bg-white/10 hover:border-white/20 rounded',
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
				'icon-lg': '!h-12 w-12 p-0 rounded-md',
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
		defaultVariants: {
			variant: 'default',
			size: 'default',
			align: 'default',
		},
	}
);

export interface ButtonProps
	extends HTMLMotionProps<'button'>,
		VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, align, ...props }, ref) => {
		return (
			<motion.button
				className={cn(buttonVariants({ variant, size, align, className }))}
				ref={ref}
				{...props}
			/>
		);
	}
);

Button.displayName = 'Button';

export { Button, buttonVariants };
