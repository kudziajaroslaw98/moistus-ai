import type { AppNode } from '@/types/app-node';
import { act, renderHook } from '@testing-library/react';
import { usePluginRefs } from './use-plugin-refs';

jest.mock('@/store/mind-map-store', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { create } = require('zustand');
	return { __esModule: true, default: create(() => ({ nodes: [] })) };
});

import useAppStore from '@/store/mind-map-store';

const node = (
	id: string,
	content = id,
	position = { x: 0, y: 0 }
): AppNode =>
	({
		id,
		type: 'defaultNode',
		position,
		data: { id, node_type: 'defaultNode', content, metadata: {} },
	}) as unknown as AppNode;

const setNodes = (nodes: AppNode[]) =>
	act(() => {
		(useAppStore as unknown as { setState: (state: object) => void }).setState({
			nodes,
		});
	});

const wait = (ms: number) =>
	act(async () => {
		await jest.advanceTimersByTimeAsync(ms);
	});

beforeEach(() => {
	jest.useFakeTimers();
	setNodes([node('a', 'Chapter 3'), node('b', 'The letter'), node('c', 'Elsewhere')]);
});

afterEach(() => {
	jest.useRealTimers();
});

describe('usePluginRefs', () => {
	it('is null when the plugin does not read linked nodes', () => {
		const { result } = renderHook(() => usePluginRefs(['a'], false));
		expect(result.current).toBeNull();
	});

	it('describes the linked nodes', () => {
		const { result } = renderHook(() => usePluginRefs(['a', 'b'], true));
		expect(Object.keys(result.current ?? {})).toEqual(['a', 'b']);
		expect(result.current?.a.text).toBe('Chapter 3');
	});

	it('shows a node that was just linked at once, never as deleted for a moment', () => {
		const { result, rerender } = renderHook(
			({ ids }) => usePluginRefs(ids, true),
			{ initialProps: { ids: ['a'] } }
		);
		expect(result.current?.b).toBeUndefined();

		rerender({ ids: ['a', 'b'] });

		// No timers advanced: a debounce here would leave `b` missing, which a plugin
		// reads as "this node was deleted".
		expect(result.current?.b?.text).toBe('The letter');
	});

	it('waits for content changes in a linked node', async () => {
		const { result } = renderHook(() => usePluginRefs(['a'], true));

		setNodes([node('a', 'Chapter 4'), node('b'), node('c')]);
		await wait(299);
		expect(result.current?.a.text).toBe('Chapter 3');

		await wait(1);
		expect(result.current?.a.text).toBe('Chapter 4');
	});

	it('keeps a deleted node for the debounce, then drops its entry', async () => {
		const { result } = renderHook(() => usePluginRefs(['a', 'b'], true));

		setNodes([node('a', 'Chapter 3'), node('c')]);
		expect(result.current?.b).toBeDefined();

		await wait(300);
		expect(result.current?.b).toBeUndefined();
		expect(result.current?.a).toBeDefined();
	});

	it('does not redo anything when other nodes change or a linked node only moves', async () => {
		const { result } = renderHook(() => usePluginRefs(['a'], true));
		const first = result.current;

		setNodes([node('a', 'Chapter 3'), node('b'), node('c', 'Changed', { x: 5, y: 5 })]);
		await wait(500);
		expect(result.current).toBe(first);

		setNodes([node('a', 'Chapter 3', { x: 40, y: 40 }), node('b'), node('c')]);
		await wait(500);
		expect(result.current).toBe(first);
	});

	it('turns on and off at once', () => {
		const { result, rerender } = renderHook(
			({ enabled }) => usePluginRefs(['a'], enabled),
			{ initialProps: { enabled: false } }
		);
		expect(result.current).toBeNull();

		rerender({ enabled: true });
		expect(result.current?.a.text).toBe('Chapter 3');

		rerender({ enabled: false });
		expect(result.current).toBeNull();
	});
});
