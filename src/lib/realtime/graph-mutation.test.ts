jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({
		auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
	}),
}));

import * as Y from 'yjs';
import {
	applyGraphMutationToDoc,
	mergeGraphRecord,
	parseGraphMutationPayload,
} from '../../../partykit/graph-mutation';
import { mergeGraphRecordForUpdate } from './yjs-provider';

const payload = {
	mapId: 'map-1',
	actorId: 'agent:client-1',
	upsertNodes: [{ id: 'n1', content: 'New text', user_id: 'agent-user', created_at: '2026-10-13' }],
	upsertEdges: [{ id: 'e2', source: 'n1', target: 'n2' }],
	deleteNodeIds: ['n3'],
	deleteEdgeIds: ['e1'],
};

describe('partykit graph mutation', () => {
	it('merges records exactly like the browser (parity with yjs-provider)', () => {
		const cases: Array<[Record<string, unknown> | null, Record<string, unknown>]> = [
			[null, { id: 'a', content: 'x' }],
			[{ id: 'a', user_id: 'owner', created_at: 't0', content: 'old' }, { id: 'a', user_id: 'other', created_at: 't1', content: 'new' }],
			[{ id: 'a', user_id: '', content: 'old' }, { id: 'a', user_id: 'u2', content: 'new' }],
		];
		for (const [current, next] of cases) {
			expect(mergeGraphRecord(current, next)).toEqual(mergeGraphRecordForUpdate(current, next));
		}
	});

	it('applies upserts and deletes in one transaction, marked as an agent write without history', () => {
		const doc = new Y.Doc();
		const nodes = doc.getMap<Record<string, unknown>>('nodesById');
		const edges = doc.getMap<Record<string, unknown>>('edgesById');
		nodes.set('n1', { id: 'n1', content: 'Old', user_id: 'owner', created_at: '2026-01-01' });
		nodes.set('n3', { id: 'n3' });
		edges.set('e1', { id: 'e1' });

		let transactions = 0;
		doc.on('afterTransaction', () => transactions++);
		applyGraphMutationToDoc(doc, parseGraphMutationPayload(payload)!);

		expect(transactions).toBe(1);
		expect(nodes.get('n1')).toEqual({ id: 'n1', content: 'New text', user_id: 'owner', created_at: '2026-01-01' });
		expect(nodes.has('n3')).toBe(false);
		expect(edges.has('e1')).toBe(false);
		expect(edges.get('e2')).toEqual({ id: 'e2', source: 'n1', target: 'n2' });

		const meta = doc.getMap<unknown>('meta');
		expect(meta.get('lastMutationBy')).toBe('agent:client-1');
		expect(meta.get('skipHistoryOnce')).toBe(true);
	});

	it('rejects malformed payloads', () => {
		expect(parseGraphMutationPayload({ ...payload, actorId: ' ' })).toBeNull();
		expect(parseGraphMutationPayload({ ...payload, upsertNodes: [{ content: 'no id' }] })).toBeNull();
		expect(parseGraphMutationPayload({ ...payload, deleteNodeIds: [1] })).toBeNull();
		expect(parseGraphMutationPayload(null)).toBeNull();
	});
});
