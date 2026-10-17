import type { TemplateCategoryValue } from '@/constants/template-options';
import {
	BarChart,
	Briefcase,
	Calendar,
	Code,
	GraduationCap,
	Lightbulb,
	User,
	Zap,
	type LucideIcon,
} from 'lucide-react';

// One accent hue per category, shared by every template in it.
export const CATEGORY_HUES: Record<TemplateCategoryValue, number> = {
	creative: 270,
	productivity: 152,
	planning: 214,
	analysis: 38,
	business: 244,
	education: 188,
	personal: 330,
	technical: 14,
};

// Covers are icon-per-category: the `icon` stored on each template row is
// not used here.
export const CATEGORY_ICONS: Record<TemplateCategoryValue, LucideIcon> = {
	creative: Lightbulb,
	productivity: Zap,
	planning: Calendar,
	analysis: BarChart,
	business: Briefcase,
	education: GraduationCap,
	personal: User,
	technical: Code,
};
