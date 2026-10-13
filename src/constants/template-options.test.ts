import {
	FALLBACK_TEMPLATE_STYLE,
	TEMPLATE_CATEGORY_STYLES,
	TEMPLATE_CATEGORY_VALUES,
	getTemplateCategoryStyle,
} from './template-options';

describe('getTemplateCategoryStyle', () => {
	it('defines an icon and three hex colors for every category', () => {
		for (const category of TEMPLATE_CATEGORY_VALUES) {
			const style = TEMPLATE_CATEGORY_STYLES[category];

			expect(style.icon).toMatch(/^[A-Za-z0-9]+$/);
			expect(style.previewColors).toHaveLength(3);
			for (const color of style.previewColors) {
				expect(color).toMatch(/^#[0-9a-f]{6}$/);
			}
		}
	});

	it('gives each category its own icon and colors', () => {
		const icons = TEMPLATE_CATEGORY_VALUES.map(
			(category) => TEMPLATE_CATEGORY_STYLES[category].icon
		);
		const firstColors = TEMPLATE_CATEGORY_VALUES.map(
			(category) => TEMPLATE_CATEGORY_STYLES[category].previewColors[0]
		);

		expect(new Set(icons).size).toBe(icons.length);
		expect(new Set(firstColors).size).toBe(firstColors.length);
	});

	it('returns the category style for a known category', () => {
		expect(getTemplateCategoryStyle('business')).toBe(
			TEMPLATE_CATEGORY_STYLES.business
		);
	});

	it.each([null, undefined, '', 'not-a-category'])(
		'falls back for %p',
		(category) => {
			expect(getTemplateCategoryStyle(category)).toBe(FALLBACK_TEMPLATE_STYLE);
		}
	);
});
