/** @jest-environment node */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createUsageGate, readMcpPlan } from '../plan-gate';

function fakeSupabase(plan: Record<string, unknown> | null, writesUsed = 0) {
	const rpc = jest.fn((name: string) => {
		const data =
			name === 'get_mcp_plan_limits'
				? plan && { plan_name: 'free', limits: plan }
				: name === 'get_mcp_usage'
					? { reads: 0, writes: writesUsed }
					: null;
		return { maybeSingle: async () => ({ data, error: null }), then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
	});
	return { rpc } as unknown as SupabaseClient & { rpc: jest.Mock };
}

let userCounter = 0;
const nextUser = () => `user-${++userCounter}`;

describe('readMcpPlan', () => {
	it('never treats a missing key as unlimited', () => {
		expect(readMcpPlan(null)).toEqual({ name: 'free', access: 'full', writesPerMonth: 50, writesPerMinute: 10 });
		expect(readMcpPlan({ plan_name: 'pro', limits: { mcpWritesPerMonth: -1, mcpAccess: 'read' } })).toMatchObject({
			name: 'pro',
			access: 'read',
			writesPerMonth: -1,
		});
	});
});

describe('createUsageGate', () => {
	it('blocks every tool when MCP is off and writes when the plan is read-only', async () => {
		const off = createUsageGate(fakeSupabase({ mcpAccess: 'none' }), nextUser(), 'https://s.test');
		await expect(off.before('read')).rejects.toThrow(/aren't available on the Free plan/);

		const readOnly = createUsageGate(fakeSupabase({ mcpAccess: 'read' }), nextUser(), 'https://s.test');
		await expect(readOnly.before('read')).resolves.toBeUndefined();
		await expect(readOnly.before('write')).rejects.toThrow(/lets AI apps read maps only/);
	});

	it('stops writes at the monthly cap with the reset date and an upgrade link', async () => {
		const gate = createUsageGate(fakeSupabase({ mcpWritesPerMonth: 50 }, 50), nextUser(), 'https://s.test');
		await expect(gate.before('write')).rejects.toThrow(
			/all 50 agent edits for this month are used\. They reset on .+ Nothing was written\. Upgrade: https:\/\/s\.test\/dashboard\?settings=billing/
		);
	});

	it('limits writes per minute from the plan', async () => {
		const user = nextUser();
		const gate = createUsageGate(fakeSupabase({ mcpWritesPerMinute: 2, mcpWritesPerMonth: -1 }), user, 'https://s.test');
		await gate.before('write');
		await gate.before('write');
		await expect(gate.before('write')).rejects.toThrow(/allows 2 agent edits a minute/);
	});

	it('counts usage after success', async () => {
		const supabase = fakeSupabase({});
		await createUsageGate(supabase, nextUser(), 'https://s.test').after('write');
		expect(supabase.rpc).toHaveBeenCalledWith('increment_mcp_usage', { p_kind: 'write' });
	});
});
