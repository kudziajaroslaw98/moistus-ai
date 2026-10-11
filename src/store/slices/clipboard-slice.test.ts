import { toast } from 'sonner';
import { create } from 'zustand';
import type { AppState } from '../app-state';
import { createClipboardSlice } from './clipboard-slice';

jest.mock('sonner', () => ({
	toast: {
		loading: jest.fn(() => 'toast-1'),
		success: jest.fn(),
		warning: jest.fn(),
	},
}));

const note = (id: string) => ({
	id,
	position: { x: 0, y: 0 },
	data: { id, node_type: 'defaultNode', content: id, metadata: {} },
});
const threads = (id: string) => ({
	id,
	position: { x: 0, y: 0 },
	data: {
		id,
		node_type: 'extensionNode',
		content: 'Open threads',
		metadata: { extension: { pluginId: 'shiko.threads', kind: 'threads', kindLabel: 'Threads', noCopy: true, version: '0.1.0', data: {} } },
	},
});

function makeStore(selectedNodes: unknown[], nodes: unknown[] = selectedNodes) {
	return create<AppState>()(
		(...args) =>
			({
				selectedNodes,
				nodes,
				edges: [],
				...createClipboardSlice(...args),
			}) as unknown as AppState
	);
}

describe('copySelectedNodes', () => {
	beforeEach(() => jest.clearAllMocks());

	it('copies ordinary nodes', () => {
		const store = makeStore([note('a'), note('b')]);

		store.getState().copySelectedNodes();

		expect(store.getState().copiedNodes.map((node) => node.id)).toEqual(['a', 'b']);
		expect(toast.success).toHaveBeenCalledWith('Nodes copied!', { id: 'toast-1' });
	});

	it('leaves a Threads node alone and says why, when it is all that is selected', () => {
		const store = makeStore([threads('t')]);

		store.getState().copySelectedNodes();

		expect(store.getState().copiedNodes).toEqual([]);
		expect(toast.warning).toHaveBeenCalledWith(
			'The Threads node can’t be copied. What it links to is in this map.'
		);
		expect(toast.loading).not.toHaveBeenCalled();
	});

	it('copies the rest of a mixed selection and says what stayed behind', () => {
		const store = makeStore([note('a'), threads('t'), note('b')]);

		store.getState().copySelectedNodes();

		expect(store.getState().copiedNodes.map((node) => node.id)).toEqual(['a', 'b']);
		expect(toast.warning).toHaveBeenCalledWith(
			'Copied 2 nodes. The Threads node stayed behind, because what it links to is in this map.',
			{ id: 'toast-1' }
		);
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('never duplicates a Threads node either', async () => {
		const nodes = [note('a'), threads('t')];
		const store = makeStore([], nodes);

		const result = await store.getState().duplicateNodes(['a', 't']);

		expect(result.nodes).toHaveLength(1);
		expect(result.nodes[0].data.content).toBe('a');
	});
});
