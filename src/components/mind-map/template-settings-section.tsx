'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	TEMPLATE_CATEGORY_OPTIONS,
	TEMPLATE_ICON_NAMES,
	TEMPLATE_PREVIEW_COLOR_COUNT,
	type TemplateCategoryValue,
} from '@/constants/template-options';
import {
	BarChart,
	BookOpen,
	Briefcase,
	Calendar,
	Code,
	FileText,
	GraduationCap,
	Lightbulb,
	Plus,
	User,
	X,
	Zap,
	type LucideIcon,
} from 'lucide-react';

const ICON_COMPONENTS: Record<string, LucideIcon> = {
	Lightbulb,
	Calendar,
	BarChart,
	Zap,
	Briefcase,
	GraduationCap,
	User,
	Code,
	FileText,
	BookOpen,
};

export interface TemplateSettingsValue {
	category: TemplateCategoryValue | null;
	icon: string;
	previewColors: string[];
}

interface TemplateSettingsSectionProps {
	value: TemplateSettingsValue | null;
	onChange: (value: TemplateSettingsValue) => void;
	disabled?: boolean;
}

/**
 * Admin-only template metadata editor (category, gallery icon, preview colors).
 * Rendered inside Map Settings when an admin edits a system template.
 */
export function TemplateSettingsSection({
	value,
	onChange,
	disabled,
}: TemplateSettingsSectionProps) {
	if (!value) {
		return (
			<p className='text-xs text-text-secondary'>Loading template details…</p>
		);
	}

	// Keep unknown legacy icon names selectable so saving doesn't silently change them.
	const iconOptions: string[] = TEMPLATE_ICON_NAMES.includes(
		value.icon as (typeof TEMPLATE_ICON_NAMES)[number]
	)
		? [...TEMPLATE_ICON_NAMES]
		: [value.icon, ...TEMPLATE_ICON_NAMES];

	const updateColor = (index: number, color: string) => {
		const previewColors = value.previewColors.map((c, i) =>
			i === index ? color : c
		);
		onChange({ ...value, previewColors });
	};

	const removeColor = (index: number) => {
		onChange({
			...value,
			previewColors: value.previewColors.filter((_, i) => i !== index),
		});
	};

	const addColor = () => {
		const last = value.previewColors[value.previewColors.length - 1];
		onChange({
			...value,
			previewColors: [...value.previewColors, last ?? '#6366f1'],
		});
	};

	const canRemoveColor =
		value.previewColors.length > TEMPLATE_PREVIEW_COLOR_COUNT.min;
	const canAddColor =
		value.previewColors.length < TEMPLATE_PREVIEW_COLOR_COUNT.max;
	const gradient =
		value.previewColors.length > 1
			? `linear-gradient(90deg, ${value.previewColors.join(', ')})`
			: value.previewColors[0];

	return (
		<div className='space-y-4'>
			<div className='space-y-2'>
				<Label className='text-text-primary' htmlFor='template-category'>
					Category
				</Label>

				<Select
					disabled={disabled}
					items={TEMPLATE_CATEGORY_OPTIONS}
					value={value.category ?? undefined}
					onValueChange={(category) =>
						onChange({ ...value, category: category as TemplateCategoryValue })
					}
				>
					<SelectTrigger className='w-full' id='template-category'>
						<SelectValue placeholder='Select a category' />
					</SelectTrigger>

					<SelectContent>
						{TEMPLATE_CATEGORY_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				<Label className='text-text-primary' id='template-icon-label'>
					Gallery icon
				</Label>

				<div
					aria-labelledby='template-icon-label'
					className='flex flex-wrap gap-2'
					role='radiogroup'
				>
					{iconOptions.map((name) => {
						const Icon = ICON_COMPONENTS[name] ?? FileText;
						const isSelected = value.icon === name;

						return (
							<button
								aria-checked={isSelected}
								aria-label={name}
								disabled={disabled}
								key={name}
								onClick={() => onChange({ ...value, icon: name })}
								role='radio'
								title={name}
								type='button'
								className={`flex size-9 items-center justify-center rounded-md border transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
									isSelected
										? 'border-primary bg-primary/15 text-primary'
										: 'border-border-subtle text-text-secondary hover:text-text-primary'
								}`}
							>
								<Icon className='size-4' />
							</button>
						);
					})}
				</div>
			</div>

			<div className='space-y-2'>
				<Label className='text-text-primary'>Preview colors</Label>

				<div
					aria-hidden
					className='h-2 rounded-full'
					style={{ background: gradient }}
				/>

				<div className='flex flex-wrap items-center gap-2'>
					{value.previewColors.map((color, index) => (
						<div
							className='flex items-center gap-1 rounded-md border border-border-subtle p-1'
							key={index}
						>
							<input
								aria-label={`Preview color ${index + 1}`}
								className='size-7 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed'
								disabled={disabled}
								type='color'
								value={color}
								onChange={(e) => updateColor(index, e.target.value)}
							/>

							{canRemoveColor && (
								<button
									aria-label={`Remove preview color ${index + 1}`}
									className='rounded p-0.5 text-text-secondary transition-colors duration-200 ease hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
									disabled={disabled}
									onClick={() => removeColor(index)}
									type='button'
								>
									<X className='size-3.5' />
								</button>
							)}
						</div>
					))}

					{canAddColor && (
						<Button
							disabled={disabled}
							onClick={addColor}
							size='sm'
							type='button'
							variant='ghost'
						>
							<Plus className='mr-1 size-3.5' />
							Add color
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
