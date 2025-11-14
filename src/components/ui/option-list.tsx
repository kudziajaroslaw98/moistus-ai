import {
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

/**
 * Flexible, accessible list component for option pickers.
 * Supports horizontal/vertical layout, keyboard navigation, and custom item rendering.
 * @template T Item type
 * @param items Array of items to render
 * @param direction Layout direction: "horizontal" or "vertical"
 * @param gap Tailwind gap class (default: gap-2)
 * @param renderItem Render function: (item, idx, { focused, ref }) => ReactNode
 * @param className Additional classes for the container
 * @param initialFocusIdx Optional initial focused index
 * @param onItemSelect Optional callback for selection (item, idx)
 */
export interface OptionListProps<T> {
	items: readonly T[];
	direction?: 'horizontal' | 'vertical';
	gap?: string;
	renderItem: (
		item: T,
		idx: number,
		opts: { focused: boolean; ref: RefObject<HTMLDivElement | null> }
	) => ReactNode;
	className?: string;
	initialFocusIdx?: number;
	onItemSelect?: (item: T, idx: number) => void;
}

export function OptionList<T>({
	items,
	direction = 'horizontal',
	gap = 'gap-2',
	renderItem,
	className = '',
	initialFocusIdx = 0,
	onItemSelect,
}: OptionListProps<T>): ReactNode {
	const [focusedIdx, setFocusedIdx] = useState<number>(initialFocusIdx);
	const itemRefs = useRef<Array<RefObject<HTMLDivElement | null>>>(
		items.map(() => ({ current: null }))
	);

	// Ensure refs are always up to date
	useEffect(() => {
		if (itemRefs.current.length !== items.length) {
			itemRefs.current = items.map(() => ({ current: null }));
		}
	}, [items.length]);

	// Focus the current item
	useEffect(() => {
		if (itemRefs.current[focusedIdx]?.current) {
			itemRefs.current[focusedIdx].current!.focus();
		}
	}, [focusedIdx, items]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			if (items.length === 0) return;
			let nextIdx = focusedIdx;

			if (
				(direction === 'horizontal' && e.key === 'ArrowRight') ||
				(direction === 'vertical' && e.key === 'ArrowDown')
			) {
				nextIdx = (focusedIdx + 1) % items.length;
				e.preventDefault();
			} else if (
				(direction === 'horizontal' && e.key === 'ArrowLeft') ||
				(direction === 'vertical' && e.key === 'ArrowUp')
			) {
				nextIdx = (focusedIdx - 1 + items.length) % items.length;
				e.preventDefault();
			} else if (e.key === 'Home') {
				nextIdx = 0;
				e.preventDefault();
			} else if (e.key === 'End') {
				nextIdx = items.length - 1;
				e.preventDefault();
			} else if (e.key === 'Enter' || e.key === ' ') {
				if (onItemSelect) onItemSelect(items[focusedIdx], focusedIdx);
				e.preventDefault();
			}

			setFocusedIdx(nextIdx);
		},
		[direction, focusedIdx, items, onItemSelect]
	);

	return (
		<div
			aria-orientation={direction}
			className={`flex ${direction === 'vertical' ? 'flex-col' : 'flex-row'} ${gap} ${className}`}
			onKeyDown={handleKeyDown}
			role='listbox'
			tabIndex={0}
		>
			{items.map((item, idx) => {
				const ref =
					itemRefs.current[idx] || (itemRefs.current[idx] = { current: null });
				return (
					<div
						aria-selected={focusedIdx === idx}
						className='outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded'
						key={idx}
						onClick={() => onItemSelect && onItemSelect(item, idx)}
						onFocus={() => setFocusedIdx(idx)}
						ref={ref}
						role='option'
						tabIndex={focusedIdx === idx ? 0 : -1}
					>
						{renderItem(item, idx, { focused: focusedIdx === idx, ref })}
					</div>
				);
			})}
		</div>
	);
}
