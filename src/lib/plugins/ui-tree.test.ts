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

describe('status colors, menus and picking', () => {
	const NODE_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
	const ok = (tree: unknown) => validatePluginTree(tree).ok;

	it('accepts tones on text, panels and progress, and struck-through text', () => {
		expect(ok({ type: 'text', value: 'No stops yet', tone: 'warning' })).toBe(true);
		expect(ok({ type: 'text', value: 'Dropped', tone: 'muted', strike: true })).toBe(true);
		expect(ok({ type: 'stack', tone: 'info', children: [] })).toBe(true);
		expect(ok({ type: 'row', tone: 'warning', children: [] })).toBe(true);
		expect(ok({ type: 'progress', value: 1, tone: 'success' })).toBe(true);
		expect(ok({ type: 'text', value: 'x', tone: 'purple' })).toBe(false);
		expect(ok({ type: 'progress', value: 1, tone: 'danger' })).toBe(false);
	});

	it('accepts a menu of actions with separators, icons and a danger item', () => {
		expect(
			ok({
				type: 'menu',
				label: 'Thread actions',
				items: [
					{ label: 'Show stops', action: 'show', payload: { id: 'a1' }, icon: 'list' },
					{ separator: true },
					{ label: 'Delete thread', action: 'remove', icon: 'trash', danger: true },
				],
			})
		).toBe(true);
	});

	it('limits menu items and keeps their actions plain names', () => {
		const many = Array.from({ length: 11 }, (_, index) => ({
			label: `Item ${index}`,
			action: 'go',
		}));
		expect(ok({ type: 'menu', label: 'Actions', items: many })).toBe(false);
		expect(ok({ type: 'menu', label: 'Actions', items: [] })).toBe(false);
		expect(
			ok({ type: 'menu', label: 'Actions', items: [{ label: 'Go', action: 'not a name' }] })
		).toBe(false);
		expect(
			ok({ type: 'menu', label: 'Actions', items: [{ label: 'Go', action: 'go', href: 'https://x.dev' }] })
		).toBe(false);
	});

	it('accepts a button that opens the node editor', () => {
		expect(ok({ type: 'button', label: 'Add thread', action: 'add', edit: true })).toBe(true);
		expect(ok({ type: 'button', label: 'Add thread', action: 'add', edit: 'yes' })).toBe(false);
	});

	it('accepts asking for a node to be picked, with the nodes to number', () => {
		const pick = { title: 'Adding stops', hint: 'Click a node', marked: [NODE_A] };
		expect(ok({ type: 'button', label: 'Add a stop', action: 'add', pick })).toBe(true);
		expect(
			ok({ type: 'menu', label: 'Actions', items: [{ label: 'Add a stop', action: 'add', pick }] })
		).toBe(true);
		expect(ok({ type: 'button', label: 'Add', action: 'add', pick: { title: '' } })).toBe(false);
		expect(
			ok({ type: 'button', label: 'Add', action: 'add', pick: { title: 'x', marked: ['not-an-id'] } })
		).toBe(false);
	});
});
