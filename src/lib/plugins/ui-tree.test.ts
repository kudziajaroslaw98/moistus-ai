import { validatePluginTree, type PluginUiNode } from './ui-tree';

const metricView: PluginUiNode = {
	type: 'stack',
	gap: 3,
	children: [
		{
			type: 'row',
			justify: 'between',
			children: [{ type: 'badge', label: 'On track', tone: 'success' }],
		},
		{ type: 'text', value: 'Weekly active users' },
		{ type: 'progress', value: 0.62, label: 'Progress', showValue: true },
		{
			type: 'row',
			gap: 2,
			children: [
				{ type: 'button', label: '100', icon: 'minus', action: 'dec' },
				{
					type: 'button',
					label: '100',
					icon: 'plus',
					action: 'inc',
					payload: { by: 100 },
				},
			],
		},
	],
};

function nest(depth: number): PluginUiNode {
	return depth === 1
		? { type: 'text', value: 'leaf' }
		: { type: 'stack', children: [nest(depth - 1)] };
}

describe('validatePluginTree', () => {
	it('accepts a view built from known primitives', () => {
		expect(validatePluginTree(metricView)).toEqual({
			ok: true,
			tree: metricView,
		});
	});

	it('accepts equal-width rows and icon-only buttons', () => {
		const board: PluginUiNode = {
			type: 'row',
			equal: true,
			children: [
				{
					type: 'button',
					label: 'Move to Doing',
					icon: 'arrow-right',
					iconOnly: true,
					action: 'move',
				},
			],
		};
		expect(validatePluginTree(board)).toEqual({ ok: true, tree: board });
	});

	it('rejects anything that could load a URL or inject markup', () => {
		expect(
			validatePluginTree({ type: 'image', src: 'https://evil.test/?d=secret' })
				.ok
		).toBe(false);
		expect(
			validatePluginTree({
				type: 'text',
				value: 'hi',
				href: 'https://evil.test',
			}).ok
		).toBe(false);
		expect(
			validatePluginTree({
				type: 'text',
				value: 'hi',
				style: { background: 'url(x)' },
			}).ok
		).toBe(false);
	});

	it('limits nesting, element count, text length and payload size', () => {
		expect(validatePluginTree(nest(8)).ok).toBe(true);
		expect(validatePluginTree(nest(9)).ok).toBe(false);
		const wide: PluginUiNode = {
			type: 'stack',
			children: Array.from({ length: 5 }, () => ({
				type: 'row' as const,
				children: Array.from({ length: 45 }, () => ({
					type: 'divider' as const,
				})),
			})),
		};
		expect(validatePluginTree(wide)).toMatchObject({
			ok: false,
			error: expect.stringContaining('200'),
		});
		expect(
			validatePluginTree({ type: 'text', value: 'x'.repeat(501) }).ok
		).toBe(false);
		expect(
			validatePluginTree({
				type: 'button',
				label: 'Go',
				action: 'go',
				payload: 'x'.repeat(2000),
			}).ok
		).toBe(false);
	});

	it('rejects action ids that are not plain names', () => {
		expect(
			validatePluginTree({
				type: 'button',
				label: 'Go',
				action: 'javascript:alert(1)',
			}).ok
		).toBe(false);
	});
});
