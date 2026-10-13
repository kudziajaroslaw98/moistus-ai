import { cn } from '@/utils/cn';
import {
	Download,
	Fullscreen,
	LayoutGrid,
	MessageSquare,
	MousePointer2,
	Play,
	Plus,
	Share2,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';

/** Slash-separated breadcrumb bar as in the app's map top bar. */
export function MockTopBar({ mapName }: { mapName: string }) {
	return (
		<div className='absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between gap-3 bg-[rgba(4,4,4,0.8)] px-4 text-sm text-[#e5e5e5]'>
			<div className='flex min-w-0 items-center gap-2.5'>
				<span className='flex items-center gap-2 font-semibold text-white'>
					<Image alt='' height={14} src='/images/shiko-logo.svg' width={14} />
					Shiko
				</span>

				<span aria-hidden='true' className='text-neutral-600'>
					/
				</span>

				<span className='truncate'>{mapName}</span>
			</div>

			<div className='flex items-center gap-2'>
				<span className='inline-flex h-8 items-center gap-1.5 rounded-md border border-[#292929] px-3 text-xs font-medium text-white/87'>
					Share
					<Share2 aria-hidden='true' className='size-3' />
				</span>

				<span className='flex size-6 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white'>
					A
				</span>
			</div>
		</div>
	);
}

interface ToolProps {
	icon: LucideIcon;
	active?: boolean;
}

function Tool({ icon: Icon, active = false }: ToolProps) {
	return (
		<span
			className={cn(
				'flex size-8 flex-none items-center justify-center rounded-md border',
				active
					? 'border-[#005bc7] bg-[#005bc7] text-white'
					: 'border-[#292929] text-white/87'
			)}
		>
			<Icon aria-hidden='true' className='size-4' />
		</span>
	);
}

function ToolSeparator() {
	return <span className='h-4 w-px flex-none bg-[#262626]' />;
}

/** Bottom toolbar: select, add, AI, layout, export, tour, zoom, comments. */
export function MockToolbar({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				'absolute bottom-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-[14px] border border-[#181818] bg-[#080808] p-2 shadow-2xl shadow-black/70',
				className
			)}
		>
			<Tool active icon={MousePointer2} />

			<ToolSeparator />

			<Tool icon={Plus} />

			<Tool icon={Sparkles} />

			<Tool icon={LayoutGrid} />

			<Tool icon={Download} />

			<Tool icon={Play} />

			<ToolSeparator />

			<Tool icon={Fullscreen} />

			<ToolSeparator />

			<Tool icon={MessageSquare} />
		</div>
	);
}
