'use client';

import {
	CATEGORY_HUES,
	CATEGORY_ICONS,
} from '@/components/dashboard/template-category-style';
import { TemplateCover } from '@/components/dashboard/template-cover';
import { PanelBadge, PanelRow, PanelSection } from '@/components/ui/panel';
import {
	TEMPLATE_CATEGORY_OPTIONS,
	type TemplateCategoryValue,
} from '@/constants/template-options';
import { cn } from '@/utils/cn';
import { Check, FileText, Loader2 } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import useSWR from 'swr';

// The parts of a `/api/templates` entry the picker reads. Icon and colors on the
// row are dead data: the look comes from the category.
interface TemplateFromAPI {
	templateId: string;
	name: string;
	description: string;
	category: TemplateCategoryValue;
}

export interface PickedTemplate {
	templateId: string;
	name: string;
}

const CATEGORY_LABELS = Object.fromEntries(
	TEMPLATE_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
) as Record<TemplateCategoryValue, string>;

// Every row, blank map included, leads with the same swatch.
const SWATCH_CLASS = 'h-10 w-14 shrink-0 rounded-lg border border-white/8';

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
};

/** Radio-style mark at the end of a row. */
function SelectMark({ selected }: { selected: boolean }) {
	return (
		<span
			aria-hidden
			className={cn(
				'grid size-5 place-items-center rounded-full border transition-colors duration-200 ease',
				selected
					? 'border-primary-400 bg-primary-500 text-white'
					: 'border-white/20'
			)}
		>
			{selected && <Check className='size-3' strokeWidth={3} />}
		</span>
	);
}

interface TemplateOptionProps {
	template: TemplateFromAPI;
	isSelected: boolean;
	onSelect: (template: PickedTemplate) => void;
}

const TemplateOption = memo(function TemplateOption({
	template,
	isSelected,
	onSelect,
}: TemplateOptionProps) {
	return (
		<PanelRow
			singleLine
			aria-pressed={isSelected}
			badge={<PanelBadge>{CATEGORY_LABELS[template.category]}</PanelBadge>}
			current={isSelected}
			description={template.description}
			title={template.name}
			trailing={<SelectMark selected={isSelected} />}
			onClick={() =>
				onSelect({ templateId: template.templateId, name: template.name })
			}
			leading={
				<TemplateCover
					compact
					className={SWATCH_CLASS}
					hue={CATEGORY_HUES[template.category] ?? 214}
					icon={CATEGORY_ICONS[template.category] ?? FileText}
				/>
			}
		/>
	);
});

interface CategoryChipsProps {
	value: TemplateCategoryValue | 'all';
	counts: Partial<Record<TemplateCategoryValue, number>>;
	total: number;
	onChange: (category: TemplateCategoryValue | 'all') => void;
}

/** Same chips as the History filter bar. */
function CategoryChips({ value, counts, total, onChange }: CategoryChipsProps) {
	const chips: Array<{
		value: TemplateCategoryValue | 'all';
		label: string;
		count: number;
	}> = [
		{ value: 'all', label: 'All', count: total },
		...TEMPLATE_CATEGORY_OPTIONS.filter((option) => counts[option.value]).map(
			(option) => ({
				value: option.value,
				label: option.label,
				count: counts[option.value] ?? 0,
			})
		),
	];

	return (
		<div
			aria-label='Filter templates'
			className='mb-2 flex flex-wrap gap-1.5'
			role='toolbar'
		>
			{chips.map((chip) => {
				const isActive = chip.value === value;

				return (
					<button
						aria-pressed={isActive}
						key={chip.value}
						onClick={() => onChange(chip.value)}
						type='button'
						className={cn(
							'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
							isActive
								? 'border-white/22 bg-white/[0.09] text-text-primary'
								: 'border-white/14 text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
						)}
					>
						{chip.label}

						<span className='tabular-nums text-[12px] text-text-tertiary'>
							{chip.count}
						</span>
					</button>
				);
			})}
		</div>
	);
}

interface TemplatePickerProps {
	selectedTemplateId: string | null;
	/** `null` = blank map. */
	onSelectTemplate: (template: PickedTemplate | null) => void;
}

/**
 * "Start from" section of the new-map panel: a blank map first, then every
 * template as a selectable row, filtered by category chips.
 */
export function TemplatePicker({
	selectedTemplateId,
	onSelectTemplate,
}: TemplatePickerProps) {
	const [category, setCategory] = useState<TemplateCategoryValue | 'all'>(
		'all'
	);

	const { data, error, isLoading } = useSWR<{
		data: { templates: TemplateFromAPI[] };
	}>('/api/templates', fetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60000,
	});

	const templates = useMemo(() => data?.data?.templates ?? [], [data]);

	const counts = useMemo(() => {
		const next: Partial<Record<TemplateCategoryValue, number>> = {};

		for (const template of templates) {
			next[template.category] = (next[template.category] ?? 0) + 1;
		}

		return next;
	}, [templates]);

	const visibleTemplates = useMemo(
		() =>
			category === 'all'
				? templates
				: templates.filter((template) => template.category === category),
		[category, templates]
	);

	return (
		<PanelSection
			description='Pick a ready-made structure, or begin with an empty canvas.'
			label='Start from'
			meta={isLoading || error ? undefined : templates.length}
		>
			{!isLoading && !error && templates.length > 0 && (
				<CategoryChips
					counts={counts}
					onChange={setCategory}
					total={templates.length}
					value={category}
				/>
			)}

			<div aria-label='Start from' role='group'>
				<PanelRow
					singleLine
					aria-pressed={selectedTemplateId === null}
					current={selectedTemplateId === null}
					description='Start from scratch with an empty canvas'
					onClick={() => onSelectTemplate(null)}
					title='Blank map'
					trailing={<SelectMark selected={selectedTemplateId === null} />}
					leading={
						<TemplateCover
							compact
							className={SWATCH_CLASS}
							hue={null}
							icon={FileText}
						/>
					}
				/>

				{visibleTemplates.map((template) => (
					<TemplateOption
						isSelected={selectedTemplateId === template.templateId}
						key={template.templateId}
						onSelect={onSelectTemplate}
						template={template}
					/>
				))}
			</div>

			{isLoading && (
				<div className='flex h-20 items-center justify-center'>
					<Loader2
						aria-label='Loading templates'
						className='size-5 animate-spin text-text-tertiary'
						role='status'
					/>
				</div>
			)}

			{error && (
				<p className='mt-2 text-[12.5px] text-text-tertiary' role='alert'>
					Templates could not be loaded. You can still start from a blank map.
				</p>
			)}
		</PanelSection>
	);
}

export default TemplatePicker;
