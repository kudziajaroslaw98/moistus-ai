/** Class names the playground's panels share, taken from the dashboard's recipe editor and cards. */

export const PANEL_CLASS =
	'overflow-hidden rounded-2xl border border-[#1d1f24] bg-[#0e0f12]';

export const PANEL_HEADER_CLASS =
	'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#1d1f24] px-4 py-3';

export const PANEL_TITLE_CLASS = 'text-[13px] font-semibold text-white';

export const INPUT_CLASS =
	'h-10 w-full rounded-[10px] border border-[#1d1f24] bg-[#0b0b0d] px-3 text-sm text-white outline-none transition-colors duration-200 ease placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-[#0e0f12] disabled:text-zinc-500';

export const TEXTAREA_CLASS =
	'w-full resize-none rounded-[10px] border border-[#1d1f24] bg-[#0b0b0d] px-3 py-2.5 font-mono text-xs leading-[18px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

export const FIELD_LABEL_CLASS = 'text-[13px] font-medium text-zinc-200';

/** The quiet bordered button used across the dashboard (same as a card's action). */
export const QUIET_BUTTON_CLASS =
	'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-3.5 text-[13px] text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50';
