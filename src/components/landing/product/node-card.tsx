import { cn } from '@/utils/cn';
import type { CSSProperties, ReactNode } from 'react';

export interface NodeCardProps {
	children?: ReactNode;
	className?: string;
	/** Stage coordinates. When both are set the card is absolutely positioned. */
	x?: number;
	y?: number;
	/** 1 = default node (#1e1e1e), 2 = raised, used by AI suggestions (#222222). */
	elevation?: 1 | 2;
	selected?: boolean;
	/** Drop the 16px padding (the ghost card paints its own inner panel). */
	flush?: boolean;
}

/** Node shell as rendered by BaseNodeWrapper: grain texture, 10px radius, 6% border. */
export function NodeCard({
	children,
	className,
	x,
	y,
	elevation = 1,
	selected = false,
	flush = false,
}: NodeCardProps) {
	const positioned = x !== undefined && y !== undefined;
	const style: CSSProperties = {
		backgroundColor: elevation === 2 ? '#222222' : '#1e1e1e',
		...(positioned ? { left: x, top: y } : null),
	};

	return (
		<div
			style={style}
			className={cn(
				'box-border w-[320px] rounded-[10px] border bg-[url("/images/groovepaper.png")] bg-repeat bg-blend-color-burn text-sm leading-5 text-[#f1f1f1]',
				positioned && 'absolute',
				selected ? 'border-[rgba(96,165,250,0.3)]' : 'border-white/6',
				flush ? 'p-0' : 'p-4',
				className
			)}
		>
			{children}
		</div>
	);
}

interface TextNodeProps extends NodeCardProps {
	bold?: boolean;
}

/** Centred text node, 66px tall like the app's text nodes. */
export function TextNode({ children, bold, className, ...rest }: TextNodeProps) {
	return (
		<NodeCard
			className={cn(
				'flex min-h-[66px] items-center justify-center text-center',
				bold && 'font-bold',
				className
			)}
			{...rest}
		>
			{children}
		</NodeCard>
	);
}
