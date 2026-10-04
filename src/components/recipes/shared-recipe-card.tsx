import {
	RECIPE_ICONS,
	RECIPE_NODE_TYPE_INFO,
	RECIPE_SCOPE_INFO,
} from '@/lib/extensions/recipe-icons';
import type { RecipeIconKey, SharedRecipe } from '@/lib/extensions/recipe-schema';
import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

/** Header gradient and chip colours per icon, in the template card palette. */
const ICON_THEMES: Record<RecipeIconKey, { gradient: string; chip: string }> = {
	alert: {
		gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 50%, #7c2d12 100%)',
		chip: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
	},
	grid: {
		gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 50%, #312e81 100%)',
		chip: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
	},
	help: {
		gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 50%, #164e63 100%)',
		chip: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
	},
	sparkles: {
		gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 50%, #3b0764 100%)',
		chip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
	},
	lightbulb: {
		gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 50%, #422006 100%)',
		chip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
	},
	'list-checks': {
		gradient: 'linear-gradient(135deg, #10b981 0%, #047857 50%, #064e3b 100%)',
		chip: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
	},
	'file-text': {
		gradient: 'linear-gradient(135deg, #64748b 0%, #334155 50%, #0f172a 100%)',
		chip: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
	},
	'chef-hat': {
		gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 50%, #500724 100%)',
		chip: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
	},
};

const SCOPE_CHIPS = {
	node: 'Runs on one idea',
	branch: 'Runs on a branch',
	map: 'Runs on the whole map',
} as const;

interface SharedRecipeCardProps {
	recipe: SharedRecipe;
	/** Buttons in the card footer (add, open dashboard, sign in). */
	actions: ReactNode;
}

/**
 * A shared recipe shown before it's added, styled like a template card. The full
 * instruction is always visible so nobody adds a prompt they haven't read.
 */
export function SharedRecipeCard({ recipe, actions }: SharedRecipeCardProps) {
	const { definition } = recipe;
	const Icon = RECIPE_ICONS[definition.icon].icon;
	const theme = ICON_THEMES[definition.icon];
	const author = recipe.authorName ?? 'a Shiko user';

	return (
		<article className='overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50'>
			<div className='relative h-32' style={{ background: theme.gradient }}>
				<div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20' />

				<div className='absolute left-3 top-3 rounded-lg bg-black/30 p-2 backdrop-blur-sm'>
					<Icon aria-hidden className='h-5 w-5 text-white/90' />
				</div>

				<span
					className={cn(
						'absolute right-3 top-3 rounded-full border px-2 py-1 text-xs font-medium backdrop-blur-sm',
						theme.chip
					)}
				>
					{SCOPE_CHIPS[definition.scope]}
				</span>

				<div className='absolute inset-x-0 bottom-0 p-3'>
					<h2 className='truncate text-base font-medium text-white'>
						{definition.title}
					</h2>
				</div>
			</div>

			<div className='space-y-5 p-5'>
				{definition.description && (
					<p className='text-sm text-zinc-400'>{definition.description}</p>
				)}

				<div className='space-y-2'>
					<h3 className='text-sm font-medium text-text-primary'>Instruction</h3>

					<p className='whitespace-pre-line rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3 text-sm leading-relaxed text-zinc-200'>
						{definition.instruction}
					</p>

					<p className='text-xs text-zinc-400'>
						This is everything the recipe tells the AI. Nothing is hidden.
					</p>
				</div>

				<dl className='flex flex-wrap gap-6'>
					<div className='space-y-2'>
						<dt className='text-xs text-zinc-500'>Creates</dt>

						<dd className='flex flex-wrap gap-1.5'>
							{definition.output.nodeTypes.map((type) => {
								const TypeIcon = RECIPE_NODE_TYPE_INFO[type].icon;
								return (
									<span
										className='inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 px-2.5 py-1 text-xs text-zinc-300'
										key={type}
									>
										<TypeIcon aria-hidden className='size-3' />

										{RECIPE_NODE_TYPE_INFO[type].label}
									</span>
								);
							})}
						</dd>
					</div>

					{definition.output.labels.length > 0 && (
						<div className='space-y-2'>
							<dt className='text-xs text-zinc-500'>Labels</dt>

							<dd className='flex flex-wrap gap-1.5'>
								{definition.output.labels.map((label) => (
									<span
										className='rounded-full border border-zinc-700/50 px-2.5 py-1 text-xs text-zinc-300'
										key={label}
									>
										{label}
									</span>
								))}
							</dd>
						</div>
					)}

					<div className='space-y-2'>
						<dt className='text-xs text-zinc-500'>Results</dt>

						<dd className='text-sm leading-6 text-zinc-300'>
							{`Up to ${definition.output.maxItems} · ${RECIPE_SCOPE_INFO[definition.scope].short}`}
						</dd>
					</div>
				</dl>

				<div className='flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/60 pt-4'>
					<span className='text-xs text-zinc-500'>
						{`by ${author} · ${recipe.installCount} ${recipe.installCount === 1 ? 'add' : 'adds'}`}
					</span>

					<div className='flex flex-wrap gap-2'>{actions}</div>
				</div>
			</div>
		</article>
	);
}
