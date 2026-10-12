'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ChevronRight, X } from 'lucide-react';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';

/**
 * The one side panel. Every drawer in the app (settings, share, history, plugins, the
 * mobile menu...) is a `Panel` with the same header, sections, rows, fields and footer.
 *
 * - `modal`: dims the page, traps focus, Esc and a click outside close it. Use for forms
 *   and menus, anything the person should finish or dismiss before going on.
 * - `docked`: no dim, the page stays usable, only the X and Esc (with focus inside) close
 *   it. Use for panels whose actions show up on the canvas (History, Recipes, Plugins).
 */

export type PanelVariant = 'modal' | 'docked';
/** md: 28rem (default), lg: 40rem (wide sheets), xl: 47.5rem (code diffs). */
export type PanelWidth = 'md' | 'lg' | 'xl';

const WIDTHS: Record<PanelWidth, string> = {
	md: 'w-[min(92vw,28rem)]',
	lg: 'w-[min(94vw,40rem)]',
	xl: 'w-[min(94vw,47.5rem)]',
};

/** Same blue glow and gradient as the mobile menu. */
const GLOW_SURFACE =
	'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_32%),linear-gradient(180deg,#0e0e12,#08080a)]';

/** Buttons in a panel footer or a row: one height and radius everywhere. */
export const panelButtonClass = 'h-9 rounded-[10px] px-3.5 text-[13.5px]';
export const panelButtonSmClass = 'h-[30px] rounded-[9px] px-2.5 text-[12.5px]';

/** Inputs, textareas and select triggers inside a panel field. */
export const panelInputClass =
	// `Input` appends its own `h-9`, which would win over a plain `h-10`.
	'!h-10 rounded-[10px] border-white/10 bg-white/[0.04] px-3 text-sm sm:text-sm';
/** Select triggers: the trigger sets its own height per `size`, so the variant must match. */
export const panelSelectClass =
	'w-full rounded-[10px] border-white/10 bg-white/[0.04] text-sm data-[size=default]:h-10';
export const panelTextareaClass =
	'min-h-24 rounded-[10px] border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm sm:text-sm';

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

/** Links and small text buttons in a subtitle ("Open Plugins page", "‹ All recipes"). */
export const panelSubtitleLinkClass = cn(
	'inline-flex items-center gap-0.5 rounded-sm text-text-secondary transition-colors duration-200 ease hover:text-text-primary',
	focusRing
);

interface PanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	/** Native tooltip for a truncated title. */
	titleAttr?: string;
	/** Second line under the title: the map name, a back link, a link out. */
	subtitle?: ReactNode;
	/** Icon tile before the title (wide sheets). */
	leading?: ReactNode;
	/** Controls before the close button. */
	headerActions?: ReactNode;
	/** Underline tab strip pinned under the header (use `PanelTabsList`). */
	tabs?: ReactNode;
	/** Filters or search pinned under the header. */
	subbar?: ReactNode;
	/** Pinned footer content: `PanelFooterNote` left, `PanelFooterActions` right. */
	footer?: ReactNode;
	variant?: PanelVariant;
	width?: PanelWidth;
	/** `glow` is the mobile menu's surface, `flat` a plain dark one. */
	surface?: 'glow' | 'flat';
	/** Accessible name of the close button. */
	closeLabel?: string;
	/** Replaces the default scrolling, padded body (keeps `min-h-0 flex-1`). */
	bodyClassName?: string;
	className?: string;
	'data-testid'?: string;
	children: ReactNode;
}

export function Panel({
	open,
	onOpenChange,
	title,
	titleAttr,
	subtitle,
	leading,
	headerActions,
	tabs,
	subbar,
	footer,
	variant = 'modal',
	width = 'md',
	surface = 'glow',
	closeLabel = 'Close panel',
	bodyClassName,
	className,
	'data-testid': testId,
	children,
}: PanelProps) {
	const isModal = variant === 'modal';

	return (
		<BaseDialog.Root
			disablePointerDismissal={!isModal}
			modal={isModal}
			onOpenChange={(nextOpen, details) => {
				// A docked panel sits beside the canvas: Esc pressed while editing a node
				// must not also close it, only Esc with focus inside the panel does.
				if (
					!isModal &&
					!nextOpen &&
					details.reason === 'escape-key' &&
					!(details.event.target instanceof Element && details.event.target.closest('[data-slot="panel"]'))
				) {
					details.cancel();
					return;
				}

				onOpenChange(nextOpen);
			}}
			open={open}
		>
			<BaseDialog.Portal>
				{isModal && (
					<BaseDialog.Backdrop
						className={cn(
							'fixed inset-0 z-[80] bg-black/50 backdrop-blur-[8px]',
							'transition-opacity duration-[280ms] ease-[cubic-bezier(.23,1,.32,1)]',
							'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-200'
						)}
					/>
				)}

				<BaseDialog.Popup
					// overflow-clip, not -hidden: a hidden box can still be scrolled by
					// focus or scrollIntoView, and an absolute child (sr-only labels)
					// makes it scrollable, which slid the whole panel out of view.
					className={cn(
						'fixed inset-y-0 right-0 flex h-dvh max-w-full flex-col overflow-clip border-l border-white/14 text-text-primary shadow-[-30px_0_60px_-30px_rgba(0,0,0,0.8)] outline-none',
						isModal ? 'z-[81]' : 'z-40',
						WIDTHS[width],
						surface === 'glow' ? GLOW_SURFACE : 'bg-base',
						// Slide in from the right, a little faster on the way out. With
						// reduced motion it only fades.
						'translate-x-0 opacity-100 transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(.23,1,.32,1)]',
						'data-[starting-style]:translate-x-full data-[starting-style]:opacity-0',
						'data-[ending-style]:translate-x-full data-[ending-style]:opacity-0 data-[ending-style]:duration-200',
						'motion-reduce:data-[starting-style]:translate-x-0 motion-reduce:data-[ending-style]:translate-x-0',
						className
					)}
					data-slot='panel'
					data-testid={testId}
					data-variant={variant}
					finalFocus={isModal}
					initialFocus={isModal}
				>
					<header className='sticky top-0 z-10 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-base/90 py-2 pl-5 pr-3 backdrop-blur-xl'>
						<div className='flex min-w-0 flex-1 items-center gap-3'>
							{leading}

							<div className='min-w-0'>
								<BaseDialog.Title
									className='truncate text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.04em] text-text-primary'
									title={titleAttr}
								>
									{title}
								</BaseDialog.Title>

								{subtitle && (
									<div className='mt-0.5 truncate text-[12.5px] leading-[1.3] text-text-secondary'>
										{subtitle}
									</div>
								)}
							</div>
						</div>

						<div className='flex shrink-0 items-center gap-1.5'>
							{headerActions}

							<BaseDialog.Close
								aria-label={closeLabel}
								className={cn(
									'inline-grid size-8 cursor-pointer place-items-center rounded-lg bg-transparent text-text-secondary transition-colors duration-200 ease hover:bg-white/6 hover:text-text-primary',
									focusRing
								)}
							>
								<X aria-hidden className='size-5' />
							</BaseDialog.Close>
						</div>
					</header>

					{tabs}

					{subbar && (
						<div className='shrink-0 border-b border-white/8 px-5 py-3'>
							{subbar}
						</div>
					)}

					<div
						className={cn(
							'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6',
							bodyClassName
						)}
					>
						{children}
					</div>

					{footer && (
						<footer className='flex shrink-0 items-center justify-between gap-3 border-t border-white/8 bg-base/90 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl'>
							{footer}
						</footer>
					)}
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}

/** Status text at the left of the footer ("All changes are saved"). */
export function PanelFooterNote({
	className,
	...props
}: ComponentProps<'p'>) {
	return (
		<p
			className={cn('min-w-0 text-xs text-text-tertiary', className)}
			{...props}
		/>
	);
}

/** Buttons at the right of the footer: secondary first, primary last. */
export function PanelFooterActions({
	className,
	...props
}: ComponentProps<'div'>) {
	return (
		<div
			className={cn('ml-auto flex shrink-0 items-center gap-2', className)}
			{...props}
		/>
	);
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

/**
 * Underline tab strip. Render it in `Panel`'s `tabs` slot inside a `Tabs` root that also
 * wraps the panel, so the strip and the `TabsContent` panels share one context.
 */
export function PanelTabsList({
	className,
	...props
}: ComponentProps<typeof TabsList>) {
	return (
		<TabsList
			className={cn(
				'h-[42px] w-full shrink-0 justify-start gap-[22px] overflow-x-auto border-b border-white/8 p-0 px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
				className
			)}
			{...props}
		/>
	);
}

export function PanelTab({
	className,
	...props
}: ComponentProps<typeof TabsTrigger>) {
	return (
		<TabsTrigger
			className={cn(
				'-mb-px h-[42px] flex-none gap-[7px] rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-[13.5px] font-medium text-text-secondary',
				'data-[active]:border-b-primary-400 data-[active]:bg-transparent data-[active]:text-text-primary',
				'[@media(hover:hover)]:hover:bg-transparent [@media(hover:hover)]:hover:text-text-primary',
				className
			)}
			{...props}
		/>
	);
}

/* ── Sections ──────────────────────────────────────────────────────────── */

interface PanelSectionProps extends Omit<ComponentProps<'section'>, 'title'> {
	/** Small caps label. */
	label?: ReactNode;
	/** Count or note at the right of the label. */
	meta?: ReactNode;
	/**
	 * `icon` centers a numeric count over the trailing icon buttons of the rows below
	 * (a 32px box, the size of the icon buttons). `edge` right-aligns it.
	 */
	metaAlign?: 'edge' | 'icon';
	/** One line under the label. */
	description?: ReactNode;
	/** Wraps the children (spacing between a section's own blocks). */
	contentClassName?: string;
}

/**
 * Flat group separated by a hairline. No card, no big heading: the label is the only
 * title a section gets.
 */
export function PanelSection({
	label,
	meta,
	metaAlign = 'edge',
	description,
	contentClassName,
	className,
	children,
	...props
}: PanelSectionProps) {
	const hasMeta = meta !== undefined && meta !== null && meta !== false && meta !== '';

	return (
		<section
			className={cn(
				'mt-5 border-t border-white/8 pt-4 first:mt-0 first:border-t-0',
				className
			)}
			{...props}
		>
			{(label || hasMeta) && (
				<div className='mb-1.5 flex items-baseline justify-between gap-3'>
					<h3 className='text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary'>
						{label}
					</h3>

					{hasMeta && (
						<span
							className={cn(
								'text-xs tabular-nums text-text-tertiary',
								metaAlign === 'icon' &&
									typeof meta === 'number' &&
									'-my-2 -mr-2 grid size-8 place-items-center'
							)}
						>
							{meta}
						</span>
					)}
				</div>
			)}

			{description && (
				<p className='mb-2.5 text-[12.5px] leading-[1.45] text-text-secondary'>
					{description}
				</p>
			)}

			{contentClassName ? (
				<div className={contentClassName}>{children}</div>
			) : (
				children
			)}
		</section>
	);
}

/* ── Rows ──────────────────────────────────────────────────────────────── */

const ICON_TONES = {
	default: 'border-white/8 bg-white/[0.03] text-text-secondary',
	edit: 'border-primary-500/20 bg-primary-500/10 text-primary-300',
	add: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
	move: 'border-success-500/20 bg-success-500/10 text-success-300',
	delete: 'border-error-500/20 bg-error-500/10 text-error-300',
} as const;

/** The 32px tile that leads a row (also used on its own in sheet headers). */
export function PanelIcon({
	tone = 'default',
	className,
	...props
}: ComponentProps<'span'> & { tone?: keyof typeof ICON_TONES }) {
	return (
		<span
			aria-hidden
			className={cn(
				'grid size-8 shrink-0 place-items-center rounded-[9px] border [&_svg]:size-4',
				ICON_TONES[tone],
				className
			)}
			{...props}
		/>
	);
}

interface PanelRowProps extends Omit<
	ComponentProps<'div'>,
	'title' | 'onClick'
> {
	/** Renders the row as a link (a menu that goes to a page or a section). */
	href?: string;
	icon?: ReactNode;
	iconTone?: keyof typeof ICON_TONES;
	/** Replaces the icon tile (an avatar). */
	leading?: ReactNode;
	title: ReactNode;
	/** Small chip after the title ("Current", "Published"). */
	badge?: ReactNode;
	description?: ReactNode;
	/** Quieter line under the description (author, version). */
	meta?: ReactNode;
	/** Right side: a time, a switch, a menu. */
	trailing?: ReactNode;
	/** Show a chevron after the trailing content (rows that open something). */
	chevron?: boolean;
	/** Highlights the row (the current history entry). */
	current?: boolean;
	tone?: 'default' | 'accent' | 'danger';
	/** `top` keeps icon and trailing content at the first line of long rows. */
	align?: 'center' | 'top';
	/** Rows with a handler render as a button, others as a plain row. */
	onClick?: (event: MouseEvent<HTMLElement>) => void;
	disabled?: boolean;
	/** Single-line description (truncated). */
	singleLine?: boolean;
}

/** One row component for menu items, list items and settings. */
export function PanelRow({
	icon,
	iconTone,
	leading,
	title,
	badge,
	description,
	meta,
	trailing,
	chevron,
	current,
	tone = 'default',
	align = 'center',
	onClick,
	href,
	disabled,
	singleLine,
	className,
	...props
}: PanelRowProps) {
	const rowClass = cn(
		'flex min-h-[52px] w-[calc(100%+1rem)] -mx-2 gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-200 ease',
		align === 'center' ? 'items-center' : 'items-start',
		'[@media(hover:hover)]:hover:bg-white/[0.04]',
		current && 'bg-primary-500/[0.07] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]',
		(onClick || href) && cn('cursor-pointer', focusRing),
		disabled && 'pointer-events-none opacity-50',
		className
	);

	const content = (
		<>
			{leading ??
				(icon && <PanelIcon tone={iconTone}>{icon}</PanelIcon>)}

			<span className='block min-w-0 flex-1'>
				<span
					className={cn(
						'flex items-center gap-2 text-[15px] font-medium leading-[1.3]',
						tone === 'default' && 'text-text-primary',
						tone === 'accent' && 'text-primary-300',
						tone === 'danger' && 'text-error-300'
					)}
				>
					<span className='min-w-0 truncate'>{title}</span>

					{badge}
				</span>

				{meta && (
					<span className='mt-px block text-xs text-text-tertiary'>{meta}</span>
				)}

				{description && (
					<span
						className={cn(
							'mt-px block text-[12.5px] leading-[1.4] text-text-secondary',
							singleLine && 'truncate'
						)}
					>
						{description}
					</span>
				)}
			</span>

			{(trailing || chevron) && (
				<span
					className={cn(
						'flex shrink-0 items-center gap-2 text-[12.5px] tabular-nums text-text-tertiary',
						align === 'top' && 'mt-0.5'
					)}
				>
					{trailing}

					{chevron && (
						<ChevronRight aria-hidden className='size-4 text-text-disabled' />
					)}
				</span>
			)}
		</>
	);

	if (href) {
		return (
			<a
				className={rowClass}
				href={href}
				onClick={onClick}
				{...(props as ComponentProps<'a'>)}
			>
				{content}
			</a>
		);
	}

	if (onClick) {
		return (
			<button
				className={rowClass}
				disabled={disabled}
				onClick={onClick}
				type='button'
				{...(props as ComponentProps<'button'>)}
			>
				{content}
			</button>
		);
	}

	return (
		<div className={rowClass} {...props}>
			{content}
		</div>
	);
}

/** Small status chip: "Current", "Published", "Expired". */
export function PanelBadge({
	tone = 'default',
	className,
	...props
}: ComponentProps<'span'> & {
	tone?: 'default' | 'current' | 'ok' | 'warn' | 'error';
}) {
	return (
		<span
			className={cn(
				'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10.5px] font-medium uppercase tracking-[0.08em]',
				tone === 'default' && 'border-white/14 text-text-secondary',
				tone === 'current' &&
					'border-primary-500/40 bg-primary-500/10 text-primary-300',
				tone === 'ok' && 'border-success-500/30 bg-success-500/10 text-success-300',
				tone === 'warn' && 'border-warning-500/30 bg-warning-500/10 text-warning-300',
				tone === 'error' && 'border-error-500/30 bg-error-500/10 text-error-300',
				className
			)}
			{...props}
		/>
	);
}

/* ── Fields ────────────────────────────────────────────────────────────── */

interface PanelFieldProps {
	label: ReactNode;
	htmlFor?: string;
	required?: boolean;
	/** "4/255": turns red when over the max. */
	count?: { value: number; max: number };
	hint?: ReactNode;
	error?: ReactNode;
	errorId?: string;
	className?: string;
	children: ReactNode;
}

/** Label (and optional counter), the control, then a hint or an error. */
export function PanelField({
	label,
	htmlFor,
	required,
	count,
	hint,
	error,
	errorId,
	className,
	children,
}: PanelFieldProps) {
	return (
		<div className={cn('mt-3.5 first:mt-0', className)}>
			<div className='flex items-baseline justify-between gap-3'>
				<label
					className='text-[13px] font-medium text-text-primary'
					htmlFor={htmlFor}
				>
					{label}

					{required && <span className='text-error-400'> *</span>}
				</label>

				{count && (
					<span
						className={cn(
							'text-[11.5px] tabular-nums',
							count.value > count.max ? 'text-error-400' : 'text-text-tertiary'
						)}
					>
						{count.value}/{count.max}
					</span>
				)}
			</div>

			<div className='mt-1.5'>{children}</div>

			{hint && (
				<p className='mt-1.5 text-xs leading-[1.4] text-text-tertiary'>{hint}</p>
			)}

			{error && (
				<p
					className='mt-1.5 text-xs leading-[1.4] text-error-400'
					id={errorId}
					role='alert'
				>
					{error}
				</p>
			)}
		</div>
	);
}
