'use client';

import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { type VariantProps } from 'class-variance-authority';
import {
	createContext,
	useContext,
	useMemo,
	type ComponentProps,
	type ReactNode,
} from 'react';

import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
	size: 'default',
	variant: 'default',
});

type BaseToggleGroupProps = ComponentProps<typeof BaseToggleGroup>;

/**
 * Base props shared between single and multiple selection modes.
 */
interface ToggleGroupBaseProps extends VariantProps<typeof toggleVariants> {
	/**
	 * Whether all toggle items are disabled.
	 */
	disabled?: boolean;
	/**
	 * Additional class names for styling.
	 */
	className?: string;
	/**
	 * Child elements (ToggleGroupItem components).
	 */
	children?: ReactNode;
}

/**
 * Props for single selection mode.
 */
interface ToggleGroupSingleProps extends ToggleGroupBaseProps {
	type?: 'single';
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
}

/**
 * Props for multiple selection mode.
 */
interface ToggleGroupMultipleProps extends ToggleGroupBaseProps {
	type: 'multiple';
	value?: string[];
	defaultValue?: string[];
	onValueChange?: (value: string[]) => void;
}

type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

function toInternalValues(
	input: string | string[] | undefined
): readonly string[] | undefined {
	if (input === undefined) {
		return undefined;
	}

	if (Array.isArray(input)) {
		return input;
	}

	return input ? [input] : [];
}

function ToggleGroup({
	className,
	variant,
	size,
	children,
	type = 'single',
	value,
	defaultValue,
	onValueChange,
	disabled,
	...props
}: ToggleGroupProps) {
	// Convert string value to array for Base UI
	const internalValue = useMemo(() => toInternalValues(value), [value]);

	const internalDefaultValue = useMemo(
		() => toInternalValues(defaultValue),
		[defaultValue]
	);

	// Convert array value back to string for single type
	const handleValueChange = (newValue: string[]) => {
		if (!onValueChange) return;

		if (type === 'single') {
			// For single selection, return the last selected item or empty string
			const stringValue =
				newValue.length > 0 ? newValue[newValue.length - 1] : '';
			(onValueChange as (v: string) => void)(stringValue);
		} else {
			(onValueChange as (v: string[]) => void)(newValue);
		}
	};

	return (
		<BaseToggleGroup
			data-size={size}
			data-slot='toggle-group'
			data-variant={variant}
			multiple={type === 'multiple'}
			value={internalValue}
			defaultValue={internalDefaultValue}
			onValueChange={handleValueChange}
			disabled={disabled}
			className={cn(
				'group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs',
				className
			)}
			{...(props as Omit<
				BaseToggleGroupProps,
				'value' | 'defaultValue' | 'onValueChange' | 'multiple'
			>)}
		>
			<ToggleGroupContext.Provider value={{ variant, size }}>
				{children}
			</ToggleGroupContext.Provider>
		</BaseToggleGroup>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant,
	size,
	...props
}: ComponentProps<typeof Toggle> & VariantProps<typeof toggleVariants>) {
	const context = useContext(ToggleGroupContext);

	return (
		<Toggle
			data-size={context.size || size}
			data-slot='toggle-group-item'
			data-variant={context.variant || variant}
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-sm last:rounded-r-sm focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
				className
			)}
			{...props}
		>
			{children}
		</Toggle>
	);
}

export { ToggleGroup, ToggleGroupItem };
export type {
	ToggleGroupMultipleProps,
	ToggleGroupProps,
	ToggleGroupSingleProps,
};
