'use client';

import {
	Panel,
	PanelIcon,
	type PanelWidth,
} from '@/components/ui/panel';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SideSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	subtitle?: ReactNode;
	icon?: LucideIcon;
	hue?: number;
	/** Pinned under the scrolling body (buttons, a reason field). */
	footer?: ReactNode;
	/** `md` is 40rem, `lg` 47.5rem (wide content such as code changes). */
	width?: 'md' | 'lg';
	children: ReactNode;
}

const WIDTHS: Record<'md' | 'lg', PanelWidth> = {
	md: 'lg',
	lg: 'xl',
};

/**
 * Right-hand sheet for details of a card (versions, a submission, a report): the
 * page behind stays a card grid instead of splitting into list and detail panes.
 * A wide, modal `Panel`, so it looks and behaves like every other panel.
 */
export function SideSheet({
	open,
	onOpenChange,
	title,
	subtitle,
	icon: Icon,
	hue = 214,
	footer,
	width = 'md',
	children,
}: SideSheetProps) {
	return (
		<Panel
			bodyClassName='flex flex-col gap-5 pt-5'
			onOpenChange={onOpenChange}
			open={open}
			subtitle={subtitle}
			title={title}
			titleAttr={title}
			width={WIDTHS[width]}
			footer={
				footer ? <div className='flex w-full flex-col gap-2.5'>{footer}</div> : undefined
			}
			leading={
				Icon ? (
					<PanelIcon
						className='size-10 rounded-[11px] [&_svg]:size-5'
						style={{ color: `hsl(${hue} 80% 68%)` }}
					>
						<Icon />
					</PanelIcon>
				) : undefined
			}
		>
			{children}
		</Panel>
	);
}
