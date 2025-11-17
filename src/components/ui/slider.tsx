'use client';

import { cn } from '@/utils/cn';
import {
	type ChangeEvent,
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

interface SliderProps {
	className?: string;
	min?: number;
	max?: number;
	step?: number;
	value?: number[];
	defaultValue?: number[];
	onValueChange?: (value: number[]) => void;
	disabled?: boolean;
}

const Slider = forwardRef<HTMLDivElement, SliderProps>(
	(
		{
			className,
			min = 0,
			max = 100,
			step = 1,
			value,
			defaultValue = [0],
			onValueChange,
			disabled = false,
		},
		ref
	) => {
		const isControlled = value !== undefined;
		const [internalValue, setInternalValue] = useState(value || defaultValue);
		const trackRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (isControlled && value) {
				setInternalValue(value);
			}
		}, [isControlled, value]);

		const handleChange = useCallback(
			(newValue: number[]) => {
				if (!isControlled) {
					setInternalValue(newValue);
				}

				onValueChange?.(newValue);
			},
			[isControlled, onValueChange]
		);

		const getPercentage = useCallback(
			(val: number) => {
				return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
			},
			[min, max]
		);

		const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
			const newValue = parseFloat(e.target.value);
			handleChange([newValue]);
		};

		return (
			<div
				ref={ref}
				className={cn(
					'relative flex w-full touch-none select-none items-center',
					disabled && 'opacity-50 pointer-events-none',
					className
				)}
			>
				<div
					className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-zinc-700'
					ref={trackRef}
				>
					<div
						className='absolute h-full bg-teal-500'
						style={{
							width: `${getPercentage(internalValue[0])}%`,
						}}
					/>
				</div>

				<input
					disabled={disabled}
					max={max}
					min={min}
					onChange={handleInputChange}
					step={step}
					type='range'
					value={internalValue[0]}
					className={cn(
						'absolute w-full h-8 cursor-pointer opacity-0 z-10',
						disabled && 'cursor-not-allowed'
					)}
				/>

				<div
					className='absolute h-4 w-4 rounded-full border border-zinc-600 bg-zinc-100 shadow'
					style={{
						left: `calc(${getPercentage(internalValue[0])}% - 0.5rem)`,
						transform: 'translateY(0)',
						pointerEvents: 'none',
					}}
				/>
			</div>
		);
	}
);

Slider.displayName = 'Slider';

export { Slider };
