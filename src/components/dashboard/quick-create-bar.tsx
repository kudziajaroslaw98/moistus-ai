'use client';

import { cn } from '@/utils/cn';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import type { DashboardTemplate } from './use-dashboard-data';

interface QuickCreateFormProps {
	/** Creates a map titled with the typed thought. */
	onCreate: (title: string) => Promise<void> | void;
	/** Empty submit opens the full create dialog instead. */
	onOpenDialog: () => void;
	isCreating?: boolean;
	label: string;
	placeholder: string;
	size?: 'md' | 'lg';
	autoFocus?: boolean;
}

/** One-line "type a thought, press Enter" map creation. */
export function QuickCreateForm({
	onCreate,
	onOpenDialog,
	isCreating = false,
	label,
	placeholder,
	size = 'md',
	autoFocus = false,
}: QuickCreateFormProps) {
	const inputId = useId();
	const [title, setTitle] = useState('');
	const isLarge = size === 'lg';

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (isCreating) return;

		const trimmed = title.trim();
		if (!trimmed) {
			onOpenDialog();
			return;
		}

		await onCreate(trimmed);
	};

	return (
		<form
			className={cn(
				'flex flex-col sm:flex-row sm:flex-wrap',
				isLarge ? 'gap-3' : 'gap-2.5'
			)}
			onSubmit={handleSubmit}
		>
			<label className='sr-only' htmlFor={inputId}>
				{label}
			</label>

			<input
				autoComplete='off'

				autoFocus={autoFocus}
				disabled={isCreating}
				id={inputId}
				maxLength={120}
				onChange={(e) => setTitle(e.target.value)}
				placeholder={placeholder}
				type='text'
				value={title}
				className={cn(
					'w-full min-w-0 border border-[rgba(96,165,250,0.3)] bg-[#1e1e1e] text-white placeholder:text-zinc-500',
					'sm:w-auto sm:flex-[1_1_260px] transition-[border-color,box-shadow] duration-200 ease focus:border-[rgba(96,165,250,0.6)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] focus:outline-none',
					'disabled:opacity-60',
					isLarge
						? 'h-16 rounded-2xl px-[22px] text-xl font-medium'
						: 'h-12 rounded-xl px-4 text-[15px]'
				)}
			/>

			<button
				disabled={isCreating}
				type='submit'
				className={cn(
					'inline-flex w-full shrink-0 items-center justify-center gap-2 bg-[#005bc7] sm:w-auto font-semibold text-white',
					'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#0a68d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
					'disabled:cursor-wait disabled:opacity-80',
					isLarge
						? 'h-16 rounded-2xl px-6 text-[15px]'
						: 'h-12 rounded-xl px-[18px]'
				)}
			>
				{isCreating && (
					<Loader2 aria-hidden='true' className='size-4 animate-spin' />
				)}
				Create map
			</button>
		</form>
	);
}

interface QuickCreateBarProps extends Omit<
	QuickCreateFormProps,
	'label' | 'placeholder' | 'size'
> {
	templates: DashboardTemplate[];
	onPickTemplate: (template: DashboardTemplate) => void;
}

/** Dotted panel above the map grid: quick create + top template shortcuts. */
export function QuickCreateBar({
	templates,
	onPickTemplate,
	...formProps
}: QuickCreateBarProps) {
	return (
		<div className='mt-7 flex flex-col gap-4 rounded-[18px] border border-[#1d1f24] bg-[#0c0d10] bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1.3px)] bg-[size:18px_18px] p-[18px] lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-6'>
			<div className='w-full lg:w-auto lg:flex-[1_1_420px]'>
				<QuickCreateForm
					{...formProps}
					label='New map from a thought'
					placeholder='Start a map from a thought…'
				/>
			</div>

			{/* Phones: one link instead of a row of chips that doesn't fit. */}
			<Link
				className='group/start inline-flex items-center gap-1.5 self-start rounded-sm py-1 text-[13px] text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:hidden'
				href='/dashboard/templates'
			>
				or start with a template
				<ArrowRight
					aria-hidden='true'
					className='size-3 transition-transform duration-200 ease-out motion-safe:group-hover/start:translate-x-0.5'
				/>
			</Link>

			{templates.length > 0 && (
				<div className='hidden flex-wrap items-center gap-2 text-[13px] text-zinc-500 sm:flex'>
					<span>or start from</span>

					{templates.slice(0, 3).map((template) => (
						<button
							className='rounded-full border border-[#2a2c33] bg-[#0e0f12] px-3 py-1.5 text-zinc-300 transition-colors duration-200 ease [@media(hover:hover)]:hover:border-[#3a3d46] [@media(hover:hover)]:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
							key={template.id}
							onClick={() => onPickTemplate(template)}
							type='button'
						>
							{template.name}
						</button>
					))}

					<Link
						className='group/all inline-flex items-center gap-1.5 rounded-sm px-1 py-1.5 text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
						href='/dashboard/templates'
					>
						All templates
						<ArrowRight
							aria-hidden='true'
							className='size-3 transition-transform duration-200 ease-out motion-safe:group-hover/all:translate-x-0.5'
						/>
					</Link>
				</div>
			)}
		</div>
	);
}
