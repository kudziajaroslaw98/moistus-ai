import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import {
	cloneElement,
	isValidElement,
	type ComponentProps,
	type ReactElement,
} from 'react';

const badgeVariants = cva(
	'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
				destructive:
					'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				outline:
					'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

interface BadgeProps
	extends ComponentProps<'span'>,
		VariantProps<typeof badgeVariants> {
	/**
	 * @deprecated Use `render` prop instead for custom element rendering.
	 * When true, renders the child as the badge element.
	 */
	asChild?: boolean;
	/**
	 * Render prop for custom element rendering (Base UI pattern).
	 * Takes precedence over asChild.
	 */
	render?: ReactElement;
}

function Badge({
	className,
	variant,
	asChild = false,
	render,
	children,
	...props
}: BadgeProps) {
	const badgeClass = cn(badgeVariants({ variant }), className);
	const badgeProps = { className: badgeClass, 'data-slot': 'badge', ...props };

	// Base UI pattern: render prop
	if (render && isValidElement(render)) {
		const renderProps = render.props as Record<string, unknown>;
		return cloneElement(render as ReactElement<Record<string, unknown>>, {
			...badgeProps,
			...renderProps,
			className: cn(badgeClass, renderProps.className as string | undefined),
			children: children ?? renderProps.children,
		});
	}

	// Legacy Radix pattern: asChild
	if (asChild && isValidElement(children)) {
		const childProps = (children as ReactElement<Record<string, unknown>>)
			.props as Record<string, unknown>;
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			...badgeProps,
			...childProps,
			className: cn(badgeClass, childProps.className as string | undefined),
		});
	}

	// Default: render as span
	return (
		<span {...badgeProps}>
			{children}
		</span>
	);
}

export { Badge, badgeVariants };
