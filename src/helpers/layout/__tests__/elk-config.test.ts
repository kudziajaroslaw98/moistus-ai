import type { LayoutConfig } from '@/types/layout-types';
import {
	LAYOUT_PRESETS,
	buildLayoutOptions,
	getRecommendedCurveType,
	usesRadialLayout,
	usesElkEdgeLabels,
} from '../elk-config';

const DEFAULT_CONFIG: LayoutConfig = {
	direction: 'LEFT_RIGHT',
	nodeSpacing: 50,
	layerSpacing: 100,
	animateTransition: true,
};

describe('elk-config layout presets', () => {
	it('keeps the standard layout on layered with persisted direction spacing', () => {
		const options = buildLayoutOptions(DEFAULT_CONFIG);

		expect(options).toMatchObject({
			'elk.algorithm': 'org.eclipse.elk.layered',
			'elk.direction': 'RIGHT',
			'elk.spacing.nodeNode': '50',
			'elk.layered.spacing.nodeNodeBetweenLayers': '100',
			'elk.edgeRouting': 'ORTHOGONAL',
		});
		expect(usesElkEdgeLabels(DEFAULT_CONFIG)).toBe(true);
		expect(getRecommendedCurveType(DEFAULT_CONFIG)).toBe('smoothstep');
	});

	it('builds a roomier layered branch preset with high-degree treatment', () => {
		const config: LayoutConfig = {
			...DEFAULT_CONFIG,
			presetId: 'roomy-branches',
		};
		const options = buildLayoutOptions(config);

		expect(options).toMatchObject({
			'elk.algorithm': 'org.eclipse.elk.layered',
			'elk.direction': 'RIGHT',
			'elk.spacing.nodeNode': '96',
			'elk.layered.spacing.nodeNodeBetweenLayers': '160',
			'elk.layered.highDegreeNodes.treatment': 'true',
			'elk.layered.highDegreeNodes.threshold': '6',
		});
		expect(usesElkEdgeLabels(config)).toBe(true);
		expect(getRecommendedCurveType(config)).toBe('smoothstep');
	});

	it('builds non-layered presets with path labels and linear edge paths', () => {
		const cases = [
			['tree-right', 'org.eclipse.elk.mrtree', 'RIGHT'],
			['tree-down', 'org.eclipse.elk.mrtree', 'DOWN'],
			['radial-tree', 'org.eclipse.elk.radial', undefined],
		] as const;

		for (const [presetId, algorithm, direction] of cases) {
			const config: LayoutConfig = {
				...DEFAULT_CONFIG,
				presetId,
			};
			const options = buildLayoutOptions(config);

			expect(options['elk.algorithm']).toBe(algorithm);
			if (direction) {
				expect(options['elk.direction']).toBe(direction);
			}
			expect(usesElkEdgeLabels(config)).toBe(false);
			expect(getRecommendedCurveType(config)).toBe('linear');
			expect(usesRadialLayout(config)).toBe(presetId === 'radial-tree');
		}
	});

	it('exposes all toolbar presets in display order', () => {
		expect(LAYOUT_PRESETS.map((preset) => preset.id)).toEqual([
			'roomy-branches',
			'tree-right',
			'tree-down',
			'radial-tree',
		]);
	});
});
