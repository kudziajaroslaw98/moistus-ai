/**
 * Template categories and the look each one locks in.
 * A template's gallery icon and preview colors come from its category only; admins
 * pick the category, never the icon or colors. Category names mirror
 * `src/app/dashboard/templates/templates-content.tsx` (TEMPLATE_CATEGORIES).
 */
export const TEMPLATE_CATEGORY_OPTIONS = [
	{ value: 'creative', label: 'Creative' },
	{ value: 'productivity', label: 'Productivity' },
	{ value: 'planning', label: 'Planning' },
	{ value: 'analysis', label: 'Analysis' },
	{ value: 'business', label: 'Business' },
	{ value: 'education', label: 'Education' },
	{ value: 'personal', label: 'Personal' },
	{ value: 'technical', label: 'Technical' },
] as const;

export type TemplateCategoryValue =
	(typeof TEMPLATE_CATEGORY_OPTIONS)[number]['value'];

export const TEMPLATE_CATEGORY_VALUES = TEMPLATE_CATEGORY_OPTIONS.map(
	(option) => option.value
) as [TemplateCategoryValue, ...TemplateCategoryValue[]];

export interface TemplateCategoryStyle {
	/** Lucide icon component name. */
	icon: string;
	/** Three hex stops for the gradient (Tailwind 500 / 400 / 300 of the category hue). */
	previewColors: string[];
}

export const TEMPLATE_CATEGORY_STYLES: Record<
	TemplateCategoryValue,
	TemplateCategoryStyle
> = {
	creative: { icon: 'Lightbulb', previewColors: ['#a855f7', '#c084fc', '#d8b4fe'] },
	productivity: { icon: 'Zap', previewColors: ['#10b981', '#34d399', '#6ee7b7'] },
	planning: { icon: 'Calendar', previewColors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
	analysis: { icon: 'BarChart', previewColors: ['#f59e0b', '#fbbf24', '#fcd34d'] },
	business: { icon: 'Briefcase', previewColors: ['#6366f1', '#818cf8', '#a5b4fc'] },
	education: { icon: 'GraduationCap', previewColors: ['#06b6d4', '#22d3ee', '#67e8f9'] },
	personal: { icon: 'User', previewColors: ['#ec4899', '#f472b6', '#f9a8d4'] },
	technical: { icon: 'Code', previewColors: ['#64748b', '#94a3b8', '#cbd5e1'] },
};

/** Used when a template has no (or an unknown) category. */
export const FALLBACK_TEMPLATE_STYLE: TemplateCategoryStyle = {
	icon: 'FileText',
	previewColors: ['#6366f1', '#8b5cf6', '#a855f7'],
};

export function getTemplateCategoryStyle(
	category: string | null | undefined
): TemplateCategoryStyle {
	return (
		TEMPLATE_CATEGORY_STYLES[category as TemplateCategoryValue] ??
		FALLBACK_TEMPLATE_STYLE
	);
}
