'use client';

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
	getTemplateCategoryStyle,
	type TemplateCategoryValue,
} from '@/constants/template-options';
import {
	BarChart,
	Briefcase,
	Calendar,
	Code,
	FileText,
	GraduationCap,
	Lightbulb,
	User,
	Zap,
	type LucideIcon,
} from 'lucide-react';

// One entry per icon name in TEMPLATE_CATEGORY_STYLES.
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
};

interface TemplateSettingsSectionProps {
	category: TemplateCategoryValue | null;
	onChange: (category: TemplateCategoryValue) => void;
	disabled?: boolean;
}

/**
 * Admin-only template category picker, used in Map Settings (editing a system
 * template) and in the Publish dialog. The gallery icon and colors are locked to the
 * category, so they are shown here as a read-only preview, not as controls.
 */
export function TemplateSettingsSection({
	category,
	onChange,
	disabled,
}: TemplateSettingsSectionProps) {
	const style = getTemplateCategoryStyle(category);
	const Icon = ICON_COMPONENTS[style.icon] ?? FileText;

	return (
		<div className='space-y-3'>
			<div className='space-y-2'>
				<Label className='text-text-primary' htmlFor='template-category'>
					Category
				</Label>

				<Select
					disabled={disabled}
					items={TEMPLATE_CATEGORY_OPTIONS}
					value={category ?? undefined}
					onValueChange={(value) => onChange(value as TemplateCategoryValue)}
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

			<div className='flex items-center gap-3'>
				<div
					aria-hidden
					className='flex size-9 shrink-0 items-center justify-center rounded-md text-white/90'
					data-testid='template-category-preview'
					style={{
						background: `linear-gradient(135deg, ${style.previewColors.join(', ')})`,
					}}
				>
					<Icon className='size-4' />
				</div>

				<p className='text-xs text-text-secondary'>
					The gallery icon and colors are set by the category.
				</p>
			</div>
		</div>
	);
}
