import type { LayoutConfig } from '@/types/layout-types';
import {
	LAYOUT_PRESETS,
	buildLayoutOptions,
	getLayoutPresetDirection,
	getRecommendedCurveType,
	usesElkEdgeLabels,
	usesRadialLayout,
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

	it('builds explicit directional roomy layered presets with high-degree treatment', () => {
		const rightConfig: LayoutConfig = {
			...DEFAULT_CONFIG,
			direction: 'TOP_BOTTOM',
			presetId: 'roomy-right',
		};
		const downConfig: LayoutConfig = {
			...DEFAULT_CONFIG,
			presetId: 'roomy-down',
		};
		const rightOptions = buildLayoutOptions(rightConfig);
		const downOptions = buildLayoutOptions(downConfig);

		expect(rightOptions).toMatchObject({
			'elk.algorithm': 'org.eclipse.elk.layered',
			'elk.direction': 'RIGHT',
			'elk.spacing.nodeNode': '96',
			'elk.layered.spacing.nodeNodeBetweenLayers': '160',
			'elk.layered.highDegreeNodes.treatment': 'true',
			'elk.layered.highDegreeNodes.threshold': '6',
		});
		expect(downOptions['elk.direction']).toBe('DOWN');
		expect(usesElkEdgeLabels(rightConfig)).toBe(true);
		expect(getRecommendedCurveType(rightConfig)).toBe('smoothstep');
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

	it('resolves explicit directions for directional presets only', () => {
		expect(getLayoutPresetDirection('roomy-right')).toBe('LEFT_RIGHT');
		expect(getLayoutPresetDirection('roomy-down')).toBe('TOP_BOTTOM');
		expect(getLayoutPresetDirection('tree-right')).toBe('LEFT_RIGHT');
		expect(getLayoutPresetDirection('tree-down')).toBe('TOP_BOTTOM');
		expect(getLayoutPresetDirection('radial-tree')).toBeNull();
	});

	it('falls back to the standard layered layout for a stale session-only preset id', () => {
		const config: LayoutConfig = {
			...DEFAULT_CONFIG,
			presetId: 'roomy-branches' as unknown as LayoutConfig['presetId'],
		};

		expect(buildLayoutOptions(config)).toMatchObject({
			'elk.algorithm': 'org.eclipse.elk.layered',
			'elk.direction': 'RIGHT',
			'elk.spacing.nodeNode': '50',
		});
	});

	it('exposes all toolbar presets in display order', () => {
		expect(LAYOUT_PRESETS.map((preset) => preset.id)).toEqual([
			'roomy-right',
			'roomy-down',
			'tree-right',
			'tree-down',
			'radial-tree',
		]);
	});
});
