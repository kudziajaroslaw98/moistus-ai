import type { DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface CreateTileProps {
	title: string;
	hint?: ReactNode;
	viewMode: DashboardViewMode;
	onClick?: () => void;
	href?: string;
	disabled?: boolean;
}

/** Dashed tile that ends a catalog grid ("New recipe", "Submit a new plugin"). */
export function CreateTile({
	title,
	hint,
	viewMode,
	onClick,
	href,
	disabled = false,
}: CreateTileProps) {
	const className = cn(
		'group/new flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[#2a2c33] text-zinc-400',
		'transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
		'[@media(hover:hover)]:hover:border-[#3a3d46] [@media(hover:hover)]:hover:text-white',
		viewMode === 'grid'
			? 'min-h-[250px]'
			: 'min-h-[120px] rounded-xl px-4 py-5 text-center',
		disabled && 'cursor-not-allowed opacity-60'
	);
	const content = (
		<>
			<span className='flex size-9 shrink-0 items-center justify-center rounded-full border border-[#2a2c33] bg-[#0e0f12]'>
				<Plus aria-hidden='true' className='size-4' />
			</span>

			<span className='flex min-w-0 flex-col items-center gap-0.5 text-center'>
				<span className='text-sm font-medium text-zinc-200'>{title}</span>

				{hint && <span className='text-xs text-zinc-500'>{hint}</span>}
			</span>
		</>
	);

	return href && !disabled ? (
		<Link className={className} href={href}>
			{content}
		</Link>
	) : (
		<button
			aria-disabled={disabled || undefined}
			className={className}
			onClick={disabled ? undefined : onClick}
			type='button'
		>
			{content}
		</button>
	);
}
