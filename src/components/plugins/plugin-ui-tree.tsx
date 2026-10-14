'use client';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PLUGIN_UI_ICONS } from '@/lib/plugins/plugin-icons';
import type { PluginUiNode, PluginUiPick } from '@/lib/plugins/ui-tree';
import { cn } from '@/utils/cn';
import { Check, Ellipsis } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Draws a plugin's declarative view with Shiko's own styles (task-node card language:
 * badges, the blue progress bar, outline buttons). Plugins choose primitives and a few
 * tokens, never classes or markup.
 */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const GAP = ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4'] as const;

const TEXT_SIZE = {
	sm: 'text-xs leading-4',
	md: 'text-sm leading-5',
	lg: 'text-base leading-6',
	xl: 'text-[28px] leading-8',
} as const;

const TEXT_TONE = {
	default: 'text-white/87',
	muted: 'text-white/60',
	strong: 'text-zinc-100',
	info: 'text-blue-400/90',
	success: 'text-emerald-400/90',
	warning: 'text-amber-400/90',
	danger: 'text-red-500/90',
} as const;

const TEXT_WEIGHT = {
	normal: 'font-normal',
	medium: 'font-medium',
	semibold: 'font-semibold',
} as const;

const BADGE_TONE: Record<Tone, string> = {
	neutral: 'border-white/10 bg-white/5 text-white/60',
	success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400/90',
	warning: 'border-amber-400/20 bg-amber-400/10 text-amber-400/90',
	danger: 'border-red-500/20 bg-red-500/10 text-red-500/90',
	info: 'border-blue-400/20 bg-blue-400/10 text-blue-400/90',
};

/** A tinted group (a `stack` or `row` with a tone): the badge colors, as a panel. */
const PANEL_TONE: Record<Tone, string> = {
	neutral: 'border-white/10 bg-white/5',
	success: 'border-emerald-400/20 bg-emerald-400/10',
	warning: 'border-amber-400/20 bg-amber-400/10',
	danger: 'border-red-500/20 bg-red-500/10',
	info: 'border-blue-400/20 bg-blue-400/10',
};

const ICON_TONE: Record<Tone, string> = {
	neutral: 'text-white/60',
	success: 'text-emerald-400/90',
	warning: 'text-amber-400/90',
	danger: 'text-red-500/90',
	info: 'text-blue-400/90',
};

const ALIGN = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
	baseline: 'items-baseline',
} as const;

const JUSTIFY = {
	start: 'justify-start',
	center: 'justify-center',
	end: 'justify-end',
	between: 'justify-between',
} as const;

export interface PluginUiTreeProps {
	tree: PluginUiNode;
	/** Called for buttons, menu items and checkboxes. Omit to render them disabled (previews, viewers). */
	onAction?: (action: string, payload: unknown) => void;
	/**
	 * Called instead of `onAction` for a button or menu item that asks for a node to be
	 * picked on the canvas. Without it (the playground has no map) the action runs as is.
	 */
	onPick?: (pick: PluginUiPick, action: string, payload: unknown) => void;
	/** Called for a button that opens the node editor (`edit`); such a button never runs its action. */
	onEdit?: () => void;
	disabled?: boolean;
}

export function PluginUiTree({
	tree,
	onAction,
	onPick,
	onEdit,
	disabled = false,
}: PluginUiTreeProps) {
	const interactive = Boolean(onAction) && !disabled;

	const run = (action: string, payload: unknown, pick?: PluginUiPick) => {
		if (pick && onPick) onPick(pick, action, payload);
		else onAction?.(action, payload);
	};

	// A plugin's `key` (e.g. a list row id) keeps focus on the right row when rows move.
	// Missing or repeated keys fall back to the position.
	const renderChildren = (children: PluginUiNode[]): ReactNode[] => {
		const seen = new Set<string>();
		return children.map((child, index) => {
			const key = child.key && !seen.has(child.key) ? `k:${child.key}` : `i:${index}`;
			if (child.key) seen.add(child.key);
			return renderNode(child, key);
		});
	};

	const renderNode = (node: PluginUiNode, key: number | string): ReactNode => {
		switch (node.type) {
			case 'stack':
				return (
					<div
						key={key}
						className={cn(
							'flex flex-col',
							GAP[node.gap ?? 2],
							ALIGN[node.align ?? 'stretch'],
							node.tone && cn('rounded-lg border p-2', PANEL_TONE[node.tone])
						)}
					>
						{renderChildren(node.children)}
					</div>
				);
			case 'row':
				return (
					<div
						key={key}
						className={cn(
							'min-w-0',
							GAP[node.gap ?? 2],
							ALIGN[node.align ?? 'center'],
							node.tone && cn('rounded-lg border p-2', PANEL_TONE[node.tone]),
							node.equal
								? 'grid grid-flow-col auto-cols-[minmax(0,1fr)]'
								: cn('flex', JUSTIFY[node.justify ?? 'start'], node.wrap && 'flex-wrap')
						)}
					>
						{renderChildren(node.children)}
					</div>
				);
			case 'text':
				return (
					<span
						key={key}
						className={cn(
							'min-w-0 whitespace-pre-wrap break-words',
							TEXT_SIZE[node.size ?? 'md'],
							TEXT_TONE[node.tone ?? 'default'],
							TEXT_WEIGHT[
								node.weight ?? (node.tone === 'strong' ? 'medium' : 'normal')
							],
							node.strike && 'line-through'
						)}
					>
						{node.value}
					</span>
				);
			case 'badge':
				return (
					<span
						key={key}
						className={cn(
							'shrink-0 rounded-lg border px-1.5 py-0.5 text-[10px] font-medium leading-[15px]',
							BADGE_TONE[node.tone ?? 'neutral']
						)}
					>
						{node.label}
					</span>
				);
			case 'progress': {
				const percent = Math.round(node.value * 100);
				return (
					<div className='flex flex-col gap-2' key={key}>
						{(node.label || node.showValue) && (
							<div className='flex justify-between text-sm leading-5'>
								<span className='text-white/60'>{node.label}</span>

								{node.showValue && (
									<span className='text-white/87'>{`${percent}%`}</span>
								)}
							</div>
						)}

						<div
							aria-label={node.label || 'Progress'}
							aria-valuemax={100}
							aria-valuemin={0}
							aria-valuenow={percent}
							className='h-1 overflow-hidden rounded-full bg-white/6'
							role='progressbar'
						>
							<div
								style={{ width: `${percent}%` }}
								className={cn(
									'h-full rounded-full bg-gradient-to-r transition-[width] duration-300 ease-out',
									node.tone === 'success'
										? 'from-emerald-400/60 to-emerald-400/80'
										: 'from-blue-400/60 to-blue-400/80'
								)}
							/>
						</div>
					</div>
				);
			}
			case 'button': {
				const Icon = node.icon ? PLUGIN_UI_ICONS[node.icon] : null;
				// Icon-only needs an icon; without one the label still shows.
				const iconOnly = Boolean(node.iconOnly && Icon);
				return (
					<button
						aria-label={iconOnly ? node.label : undefined}
						disabled={!interactive}
						key={key}
						title={iconOnly ? node.label : undefined}
						type='button'
						onClick={(event) => {
							event.stopPropagation();
							// An edit button opens the node editor. Where a host has none, it does
							// nothing: its action isn't meant to run (checks skip it too).
							if (node.edit) onEdit?.();
							else run(node.action, node.payload, node.pick);
						}}
						className={cn(
							// `nodrag` only: `nopan` would stop the canvas panning from here in pan mode.
							'nodrag inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-700 text-[13px] font-medium text-zinc-50',
							iconOnly ? 'w-8 shrink-0' : 'px-3',
							'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-white/5',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
							'disabled:pointer-events-none disabled:cursor-default disabled:opacity-50'
						)}
					>
						{Icon && <Icon aria-hidden className='size-3.5' />}

						{!iconOnly && node.label}
					</button>
				);
			}
			case 'menu':
				return (
					<DropdownMenu key={key}>
						<DropdownMenuTrigger
							aria-label={node.label}
							disabled={!interactive}
							title={node.label}
							onClick={(event) => event.stopPropagation()}
							className={cn(
								'nodrag nowheel inline-flex size-7 shrink-0 items-center justify-center rounded-md text-white/60',
								'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-white/8 [@media(hover:hover)]:hover:text-zinc-50',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
								'disabled:cursor-default disabled:pointer-events-none disabled:opacity-50'
							)}
						>
							<Ellipsis aria-hidden className='size-4' />
						</DropdownMenuTrigger>

						<DropdownMenuContent align='end' className='w-56'>
							{node.items.map((item, index) => {
								if ('separator' in item) {
									return <DropdownMenuSeparator key={`s:${index}`} />;
								}
								const ItemIcon = item.icon ? PLUGIN_UI_ICONS[item.icon] : null;
								return (
									<DropdownMenuItem
										key={`${item.action}:${index}`}
										variant={item.danger ? 'destructive' : 'default'}
										onClick={() => run(item.action, item.payload, item.pick)}
									>
										{ItemIcon && <ItemIcon aria-hidden />}

										{item.label}
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			case 'checkbox':
				return (
					<button
						aria-checked={node.checked}
						disabled={!interactive}
						key={key}
						role='checkbox'
						type='button'
						onClick={(event) => {
							event.stopPropagation();
							onAction?.(node.action, node.payload);
						}}
						className={cn(
							'nodrag flex items-center gap-3 rounded-lg p-2 text-left text-sm leading-5',
							'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-white/5',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:pointer-events-none disabled:cursor-default'
						)}
					>
						<span
							className={cn(
								'flex size-5 shrink-0 items-center justify-center rounded border-2',
								node.checked
									? 'border-emerald-400/90 bg-emerald-400/15 text-emerald-400/90'
									: 'border-white/40'
							)}
						>
							{node.checked && <Check aria-hidden className='size-3.5' />}
						</span>

						<span
							className={
								node.checked ? 'text-white/40 line-through' : 'text-white/87'
							}
						>
							{node.label}
						</span>
					</button>
				);
			case 'divider':
				return <div aria-hidden className='h-px w-full bg-white/8' key={key} />;
			case 'icon': {
				const Icon = PLUGIN_UI_ICONS[node.name];
				return (
					<Icon
						aria-hidden
						key={key}
						className={cn(
							'size-3.5 shrink-0',
							ICON_TONE[node.tone ?? 'neutral']
						)}
					/>
				);
			}
		}
	};

	return <>{renderNode(tree, 'root')}</>;
}
