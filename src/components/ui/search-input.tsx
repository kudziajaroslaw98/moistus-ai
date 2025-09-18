import { cn } from '@/utils/cn';
import { Search } from 'lucide-react';
import {
	forwardRef,
	useState,
	type ChangeEvent,
	type FocusEvent,
	type InputHTMLAttributes,
} from 'react';
import { Input } from './input';

export interface SearchInputProps
	extends InputHTMLAttributes<HTMLInputElement> {
	error?: boolean;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	({ className, placeholder = 'Search...', error, ...props }, ref) => {
		const [isFocused, setIsFocused] = useState(false);
		const [hasValue, setHasValue] = useState(
			!!props.value || !!props.defaultValue
		);

		const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
			setIsFocused(true);
			props.onFocus?.(e);
		};

		const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
			setIsFocused(false);
			props.onBlur?.(e);
		};

		const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
			setHasValue(!!e.target.value);
			props.onChange?.(e);
		};

		return (
			<div className={cn('relative group', className)}>
				{/* Search Icon */}
				<Search
					className={cn(
						'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 pointer-events-none z-10',
						isFocused || hasValue
							? 'text-sky-400'
							: 'text-zinc-400 group-hover:text-zinc-300'
					)}
				/>

				{/* Input Field */}
				<Input
					ref={ref}
					className={cn('pl-10 pr-4 py-2.5')}
					placeholder={placeholder}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleChange}
					{...props}
				/>

				{/* Floating Label */}
				{placeholder && (
					<label
						className={cn(
							'absolute left-10 transition-all duration-200 pointer-events-none px-4 py-0.5 bg-zinc-950 rounded-sm',
							isFocused || hasValue
								? '-top-2.5 text-xs text-sky-400 font-medium'
								: 'top-1/2 -translate-y-1/2 text-zinc-400 opacity-0'
						)}
					>
						{placeholder}
					</label>
				)}
			</div>
		);
	}
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
