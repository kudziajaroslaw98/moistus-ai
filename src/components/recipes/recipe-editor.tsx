'use client';

import { RecipeChoiceChip } from '@/components/recipes/recipe-choice-chip';
import { RecipeIconPicker } from '@/components/recipes/recipe-icon-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import { useContributions } from '@/hooks/extensions/use-contributions';
import {
	RecipeRequestError,
	useSavedRecipes,
} from '@/hooks/extensions/use-saved-recipes';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import { recipeToContribution } from '@/lib/extensions/recipe-contributions';
import {
	RECIPE_NODE_TYPE_INFO,
	RECIPE_NODE_TYPE_ORDER,
	RECIPE_SCOPE_INFO,
} from '@/lib/extensions/recipe-icons';
import {
	RECIPE_LIMITS,
	RECIPE_SCOPES,
	recipeDefinitionSchema,
	type RecipeDefinition,
	type SavedRecipe,
} from '@/lib/extensions/recipe-schema';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { FileText, Loader2, Lock, Play, Save } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

export const BLANK_RECIPE: RecipeDefinition = {
	title: '',
	description: '',
	icon: 'sparkles',
	scope: 'node',
	instruction: '',
	output: { maxItems: 4, nodeTypes: ['defaultNode'], labels: [] },
};

type FieldErrors = Partial<
	Record<'title' | 'description' | 'instruction' | 'nodeTypes' | 'labels', string>
>;

/** Field-level messages in plain words; the schema stays the final gate on save. */
function validateDraft(draft: RecipeDefinition): FieldErrors {
	const errors: FieldErrors = {};
	if (!draft.title.trim()) errors.title = 'Give the recipe a name.';
	else if (draft.title.trim().length > RECIPE_LIMITS.title)
		errors.title = `Names can be up to ${RECIPE_LIMITS.title} characters.`;
	if (draft.description.trim().length > RECIPE_LIMITS.description)
		errors.description = `Descriptions can be up to ${RECIPE_LIMITS.description} characters.`;
	if (!draft.instruction.trim())
		errors.instruction = 'Write what the AI should do.';
	else if (draft.instruction.trim().length > RECIPE_LIMITS.instruction)
		errors.instruction = `Instructions can be up to ${RECIPE_LIMITS.instruction} characters.`;
	if (draft.output.nodeTypes.length === 0)
		errors.nodeTypes = 'Pick at least one node type.';
	if (draft.output.labels.some((label) => label.length > RECIPE_LIMITS.labelLength))
		errors.labels = `Labels can be up to ${RECIPE_LIMITS.labelLength} characters.`;
	return errors;
}

function Section({
	title,
	description,
	delay,
	children,
}: {
	title: string;
	description: string;
	delay: number;
	children: ReactNode;
}) {
	const shouldReduceMotion = useReducedMotion();
	return (
		<motion.section
			animate={{ opacity: 1, y: 0 }}
			className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
			initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
			transition={
				shouldReduceMotion ? { duration: 0 } : { delay, duration: 0.25, ease: 'easeOut' }
			}
		>
			<div className='space-y-1'>
				<h3 className='text-lg font-semibold text-text-primary'>{title}</h3>

				<p className='text-xs text-text-secondary'>{description}</p>
			</div>

			{children}
		</motion.section>
	);
}

function CharCount({ count, max }: { count: number; max: number }) {
	return (
		<span
			className={cn(
				'text-xs tabular-nums',
				count > max ? 'text-error-500' : 'text-text-secondary'
			)}
		>
			{`${count}/${max}`}
		</span>
	);
}

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p className='text-xs text-error-500' id={id} role='alert'>
			{message}
		</p>
	);
}

interface RecipeEditorProps {
	/** Saved recipe being edited; null creates a new one. */
	recipeId: string | null;
	initial: RecipeDefinition | null;
	onSaved: (recipe: SavedRecipe) => void;
	onClose: () => void;
	onDirtyChange: (isDirty: boolean) => void;
}

export function RecipeEditor({
	recipeId,
	initial,
	onSaved,
	onClose,
	onDirtyChange,
}: RecipeEditorProps) {
	const [baseline, setBaseline] = useState<RecipeDefinition>(initial ?? BLANK_RECIPE);
	const [draft, setDraft] = useState<RecipeDefinition>(initial ?? BLANK_RECIPE);
	const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
	const [showAllErrors, setShowAllErrors] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const { canSaveRecipes, createRecipe, updateRecipe } = useSavedRecipes();
	const { createContext, runContribution } = useContributions();
	const { isAtLimit } = useSubscriptionLimits();
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
	const isStreaming = useAppStore((state) => state.isStreaming);
	const selectedNode = useAppStore((state) =>
		state.selectedNodes.length === 1 ? state.selectedNodes[0] : null
	);

	const errors = useMemo(() => validateDraft(draft), [draft]);
	const isValid = Object.keys(errors).length === 0;
	const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
	const visibleError = (field: keyof FieldErrors) =>
		showAllErrors || touched[field] ? errors[field] : undefined;

	useEffect(() => {
		onDirtyChange(isDirty);
	}, [isDirty, onDirtyChange]);

	const update = (patch: Partial<RecipeDefinition>) =>
		setDraft((current) => ({ ...current, ...patch }));
	const updateOutput = (patch: Partial<RecipeDefinition['output']>) =>
		setDraft((current) => ({ ...current, output: { ...current.output, ...patch } }));
	const touch = (field: keyof FieldErrors) =>
		setTouched((current) => ({ ...current, [field]: true }));

	const toggleNodeType = (type: RecipeDefinition['output']['nodeTypes'][number]) => {
		touch('nodeTypes');
		const nodeTypes = draft.output.nodeTypes.includes(type)
			? draft.output.nodeTypes.filter((existing) => existing !== type)
			: [...draft.output.nodeTypes, type];
		updateOutput({ nodeTypes });
	};

	const handleSave = async () => {
		setShowAllErrors(true);
		const parsed = recipeDefinitionSchema.safeParse(draft);
		if (!isValid || !parsed.success || isSaving || !canSaveRecipes) return;

		setIsSaving(true);
		try {
			const saved = recipeId
				? await updateRecipe(recipeId, { definition: parsed.data })
				: await createRecipe(parsed.data);
			setBaseline(saved.definition);
			setDraft(saved.definition);
			toast.success('Recipe saved', {
				description: 'It’s in the AI menu, the right-click menu and Ctrl/Cmd+K.',
			});
			onSaved(saved);
		} catch (error) {
			toast.error(
				error instanceof RecipeRequestError ? error.message : 'Could not save the recipe.'
			);
		} finally {
			setIsSaving(false);
		}
	};

	const needsNode = draft.scope !== 'map';
	const tryBlockedReason = !isValid
		? 'Fix the highlighted fields to try it.'
		: needsNode && !selectedNode
			? 'Select one node on the canvas to try it.'
			: isStreaming
				? 'Wait for the current AI run to finish.'
				: null;

	const handleTry = () => {
		setShowAllErrors(true);
		const parsed = recipeDefinitionSchema.safeParse(draft);
		if (tryBlockedReason || !parsed.success) return;

		const contribution = recipeToContribution(
			{ id: recipeId ?? 'draft', definition: parsed.data },
			'user'
		);
		runContribution(
			contribution,
			createContext(needsNode ? 'node' : 'map', needsNode ? (selectedNode?.id ?? null) : null)
		);
	};

	const selectedNodeText =
		(typeof selectedNode?.data?.content === 'string' && selectedNode.data.content.trim()) ||
		(typeof selectedNode?.data?.metadata?.title === 'string' && selectedNode.data.metadata.title) ||
		'Untitled node';
	const isAIBlocked = isAtLimit('aiSuggestions');
	const footerStatus = !canSaveRecipes
		? 'Create an account to save recipes'
		: isDirty
			? isValid
				? 'You have unsaved changes'
				: 'Fix the highlighted fields to save'
			: recipeId
				? 'All changes are saved'
				: 'New recipe';

	return (
		<div className='flex min-h-0 flex-1 flex-col'>
			<div className='min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6'>
				<Section
					delay={0}
					description='Name it so you can find it in the AI menu.'
					title='General'
				>
					<div className='space-y-2'>
						<div className='flex items-center justify-between gap-3'>
							<Label className='text-text-primary' htmlFor='recipe-title'>
								Name <span className='text-error-500'>*</span>
							</Label>

							<CharCount count={draft.title.length} max={RECIPE_LIMITS.title} />
						</div>

						<Input
							aria-describedby={visibleError('title') ? 'recipe-title-error' : undefined}
							aria-invalid={Boolean(visibleError('title'))}
							disabled={isSaving}
							error={Boolean(visibleError('title'))}
							id='recipe-title'
							onBlur={() => touch('title')}
							onChange={(event) => update({ title: event.target.value })}
							placeholder='Pre-mortem'
							value={draft.title}
						/>

						<FieldError id='recipe-title-error' message={visibleError('title')} />
					</div>

					<div className='space-y-2'>
						<Label className='text-text-primary' id='recipe-icon-label'>
							Icon
						</Label>

						<RecipeIconPicker
							disabled={isSaving}
							labelledBy='recipe-icon-label'
							onChange={(icon) => update({ icon })}
							value={draft.icon}
						/>
					</div>

					<div className='space-y-2'>
						<div className='flex items-center justify-between gap-3'>
							<Label className='text-text-primary' htmlFor='recipe-description'>
								Description
							</Label>

							<CharCount
								count={draft.description.length}
								max={RECIPE_LIMITS.description}
							/>
						</div>

						<Input
							aria-invalid={Boolean(visibleError('description'))}
							disabled={isSaving}
							error={Boolean(visibleError('description'))}
							id='recipe-description'
							onBlur={() => touch('description')}
							onChange={(event) => update({ description: event.target.value })}
							placeholder='Imagine this failed: list likely causes'
							value={draft.description}
						/>

						<p className='text-xs text-text-secondary'>Shown under the name in menus.</p>

						<FieldError
							id='recipe-description-error'
							message={visibleError('description')}
						/>
					</div>
				</Section>

				<Section
					delay={0.05}
					description='Tell the AI what to do. The nodes it runs on are sent along with it.'
					title='Instruction'
				>
					<div className='space-y-2'>
						<Label className='text-text-primary' id='recipe-scope-label'>
							Runs on
						</Label>

						<div
							aria-labelledby='recipe-scope-label'
							className='flex flex-wrap gap-1.5'
							role='radiogroup'
						>
							{RECIPE_SCOPES.map((scope) => (
								<RecipeChoiceChip
									disabled={isSaving}
									key={scope}
									mode='radio'
									onClick={() => update({ scope })}
									selected={draft.scope === scope}
								>
									{RECIPE_SCOPE_INFO[scope].label}
								</RecipeChoiceChip>
							))}
						</div>

						<p className='text-xs text-text-secondary'>
							{RECIPE_SCOPE_INFO[draft.scope].hint}
						</p>
					</div>

					<div className='space-y-2'>
						<div className='flex items-center justify-between gap-3'>
							<Label className='text-text-primary' htmlFor='recipe-instruction'>
								Instruction <span className='text-error-500'>*</span>
							</Label>

							<CharCount
								count={draft.instruction.length}
								max={RECIPE_LIMITS.instruction}
							/>
						</div>

						<Textarea
							aria-invalid={Boolean(visibleError('instruction'))}
							className='resize-y'
							disabled={isSaving}
							error={Boolean(visibleError('instruction'))}
							id='recipe-instruction'
							onBlur={() => touch('instruction')}
							onChange={(event) => update({ instruction: event.target.value })}
							placeholder='Imagine this idea failed a year from now. List the most likely causes, each as one specific risk.'
							rows={5}
							value={draft.instruction}
							aria-describedby={
								visibleError('instruction') ? 'recipe-instruction-error' : undefined
							}
						/>

						<p className='text-xs text-text-secondary'>
							Write it as a task, like “List the 4 most likely reasons this fails.”
						</p>

						<FieldError
							id='recipe-instruction-error'
							message={visibleError('instruction')}
						/>
					</div>
				</Section>

				<Section
					delay={0.1}
					description='Every result is a suggestion you accept or reject.'
					title='Results'
				>
					<div className='space-y-2'>
						<Label className='text-text-primary' id='recipe-count-label'>
							Up to
						</Label>

						<div
							aria-labelledby='recipe-count-label'
							className='flex flex-wrap gap-1.5'
							role='radiogroup'
						>
							{Array.from({ length: RECIPE_LIMITS.maxItems }, (_, index) => index + 1).map(
								(count) => (
									<RecipeChoiceChip
										aria-label={`${count} ${count === 1 ? 'suggestion' : 'suggestions'}`}
										className='w-9 justify-center px-0'
										disabled={isSaving}
										key={count}
										mode='radio'
										onClick={() => updateOutput({ maxItems: count })}
										selected={draft.output.maxItems === count}
									>
										{count}
									</RecipeChoiceChip>
								)
							)}
						</div>
					</div>

					<div className='space-y-2'>
						<Label className='text-text-primary' id='recipe-types-label'>
							Node types
						</Label>

						<div
							aria-labelledby='recipe-types-label'
							className='flex flex-wrap gap-1.5'
							role='group'
						>
							{RECIPE_NODE_TYPE_ORDER.map((type) => (
								<RecipeChoiceChip
									disabled={isSaving}
									icon={RECIPE_NODE_TYPE_INFO[type].icon}
									key={type}
									mode='toggle'
									onClick={() => toggleNodeType(type)}
									selected={draft.output.nodeTypes.includes(type)}
								>
									{RECIPE_NODE_TYPE_INFO[type].label}
								</RecipeChoiceChip>
							))}
						</div>

						<FieldError id='recipe-types-error' message={visibleError('nodeTypes')} />
					</div>

					<div className='space-y-2'>
						<Label className='text-text-primary' htmlFor='recipe-labels'>
							Connection labels
						</Label>

						<TagInput
							className={isSaving ? 'pointer-events-none opacity-60' : ''}
							error={Boolean(visibleError('labels'))}
							id='recipe-labels'
							maxTags={RECIPE_LIMITS.labels}
							placeholder='risk, mitigates…'
							value={draft.output.labels}
							onChange={(labels) => {
								touch('labels');
								updateOutput({ labels });
							}}
						/>

						<p className='text-xs text-text-secondary'>
							Press Enter or comma to add labels. Leave empty to let AI choose.
						</p>

						<FieldError id='recipe-labels-error' message={visibleError('labels')} />
					</div>
				</Section>

				<Section
					delay={0.15}
					description='Runs your unsaved recipe. Results appear on the canvas as suggestions.'
					title='Try it'
				>
					{needsNode && (
						<div
							className={cn(
								'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
								selectedNode
									? 'border-blue-400/30 bg-elevation-1 text-text-primary'
									: 'border-dashed border-border-default text-text-secondary'
							)}
						>
							<FileText aria-hidden className='size-3.5 shrink-0 text-text-secondary' />

							<span className='min-w-0 flex-1 truncate'>
								{selectedNode ? selectedNodeText : 'No node selected'}
							</span>

							{selectedNode && (
								<span className='text-xs text-text-secondary'>Selected</span>
							)}
						</div>
					)}

					{isAIBlocked ? (
						<div className='space-y-2'>
							<Button
								className='w-full'
								onClick={() => setPopoverOpen({ upgradeUser: true })}
								size='md'
								variant='outline'
							>
								<Lock className='mr-2 h-4 w-4' />
								Upgrade to Pro to run recipes
							</Button>

							<p className='text-xs text-text-secondary'>
								You can still save and share this recipe on the Free plan.
							</p>
						</div>
					) : (
						<div className='space-y-2'>
							<Button
								aria-describedby='recipe-try-hint'
								className='w-full'
								disabled={Boolean(tryBlockedReason)}
								onClick={handleTry}
								size='md'
								variant='outline'
							>
								{isStreaming ? (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								) : (
									<Play className='mr-2 h-4 w-4' />
								)}

								{needsNode ? 'Try on selected node' : 'Try on this map'}
							</Button>

							<p className='text-xs text-text-secondary' id='recipe-try-hint'>
								{tryBlockedReason ?? 'Uses 1 AI suggestion.'}
							</p>
						</div>
					)}
				</Section>
			</div>

			<div className='flex h-fit shrink-0 items-center justify-between gap-3 border-t border-zinc-800 bg-base p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
				<p className='text-sm text-text-secondary'>{footerStatus}</p>

				<div className='flex gap-2'>
					<Button disabled={isSaving} onClick={onClose} variant='ghost'>
						Close
					</Button>

					<Button
						className='min-w-25'
						disabled={!canSaveRecipes || isSaving || (Boolean(recipeId) && !isDirty)}
						onClick={handleSave}
					>
						{isSaving ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Saving...
							</>
						) : (
							<>
								<Save className='mr-2 h-4 w-4' />
								Save recipe
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
