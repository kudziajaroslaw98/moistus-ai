/**
 * Admin-editable template metadata options.
 * Categories and icon names mirror the template gallery
 * (`src/app/dashboard/templates/templates-content.tsx` ICON_MAP / TEMPLATE_CATEGORIES).
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

export const TEMPLATE_ICON_NAMES = [
	'Lightbulb',
	'Calendar',
	'BarChart',
	'Zap',
	'Briefcase',
	'GraduationCap',
	'User',
	'Code',
	'FileText',
	'BookOpen',
] as const;

export const TEMPLATE_PREVIEW_COLOR_COUNT = { min: 1, max: 6 } as const;

export const DEFAULT_TEMPLATE_PREVIEW_COLORS = [
	'#06b6d4',
	'#22d3ee',
	'#67e8f9',
];
