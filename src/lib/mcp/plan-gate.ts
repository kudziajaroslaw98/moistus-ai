import type { SupabaseClient } from '@supabase/supabase-js';
import { InMemoryRateLimiter } from '@/helpers/api/rate-limiter';
import { BILLING_SETTINGS_URL } from '@/lib/billing-urls';
import { McpToolError } from './errors';
import type { McpToolKind } from './tool-types';

export interface McpPlan {
	name: string;
	access: 'full' | 'read' | 'none';
	writesPerMonth: number;
	writesPerMinute: number;
}

/** Checks plan limits before a tool runs and counts usage after it succeeds. */
export interface McpUsageGate {
	before(kind: McpToolKind): Promise<void>;
	after(kind: McpToolKind): Promise<void>;
}

// Used when a plan row has no MCP keys: a missing key must never mean unlimited.
const FALLBACK_PLAN: McpPlan = { name: 'free', access: 'full', writesPerMonth: 50, writesPerMinute: 10 };
const READS_PER_MINUTE = 120;

// In-memory, like the app's other limiters (known debt: not shared across instances).
const readLimiter = new InMemoryRateLimiter({ maxAttempts: READS_PER_MINUTE, windowMs: 60_000 });
const writeLimiters = new Map<number, InMemoryRateLimiter>();

function writeLimiterFor(perMinute: number): InMemoryRateLimiter {
	let limiter = writeLimiters.get(perMinute);
	if (!limiter) {
		limiter = new InMemoryRateLimiter({ maxAttempts: perMinute, windowMs: 60_000 });
		writeLimiters.set(perMinute, limiter);
	}
	return limiter;
}

const toNumber = (value: unknown, fallback: number) =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function readMcpPlan(row: { plan_name?: string | null; limits?: Record<string, unknown> | null } | null): McpPlan {
	const limits = row?.limits ?? {};
	const access = limits.mcpAccess;
	return {
		name: row?.plan_name ?? FALLBACK_PLAN.name,
		access: access === 'full' || access === 'read' || access === 'none' ? access : FALLBACK_PLAN.access,
		writesPerMonth: toNumber(limits.mcpWritesPerMonth, FALLBACK_PLAN.writesPerMonth),
		writesPerMinute: toNumber(limits.mcpWritesPerMinute, FALLBACK_PLAN.writesPerMinute),
	};
}

const planLabel = (plan: McpPlan) => `${plan.name.charAt(0).toUpperCase()}${plan.name.slice(1)} plan`;

function nextMonthStart(now = new Date()): string {
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function createUsageGate(
	supabase: SupabaseClient,
	userId: string,
	appOrigin: string
): McpUsageGate {
	const upgradeUrl = `${appOrigin}${BILLING_SETTINGS_URL}`;
	let planPromise: Promise<McpPlan> | null = null;

	const loadPlan = () => {
		planPromise ??= (async () => {
			const { data, error } = await supabase.rpc('get_mcp_plan_limits').maybeSingle();
			if (error) throw new McpToolError(`Could not check your plan: ${error.message}`);
			return readMcpPlan(data as { plan_name: string; limits: Record<string, unknown> } | null);
		})();
		return planPromise;
	};

	return {
		async before(kind) {
			if (kind === 'read') {
				const rate = readLimiter.check(userId);
				if (!rate.allowed) {
					const seconds = Math.ceil((rate.resetTime - Date.now()) / 1000);
					throw new McpToolError(`Too many reads: up to ${READS_PER_MINUTE} a minute. Try again in ${seconds}s.`);
				}
			}

			const plan = await loadPlan();
			if (plan.access === 'none') {
				throw new McpToolError(`Connected AI apps aren't available on the ${planLabel(plan)}. Upgrade: ${upgradeUrl}`);
			}
			if (kind === 'read') return;

			if (plan.access === 'read') {
				throw new McpToolError(`The ${planLabel(plan)} lets AI apps read maps only. Upgrade to let them edit: ${upgradeUrl}`);
			}

			if (plan.writesPerMinute > 0) {
				const rate = writeLimiterFor(plan.writesPerMinute).check(userId);
				if (!rate.allowed) {
					const seconds = Math.ceil((rate.resetTime - Date.now()) / 1000);
					throw new McpToolError(
						`Too many edits: the ${planLabel(plan)} allows ${plan.writesPerMinute} agent edits a minute. Try again in ${seconds}s, or batch more ops into one edit_map call.`
					);
				}
			}

			if (plan.writesPerMonth !== -1) {
				const { data, error } = await supabase.rpc('get_mcp_usage').maybeSingle();
				if (error) throw new McpToolError(`Could not check your usage: ${error.message}`);
				const used = (data as { writes: number } | null)?.writes ?? 0;
				if (used >= plan.writesPerMonth) {
					throw new McpToolError(
						`${planLabel(plan)}: all ${plan.writesPerMonth} agent edits for this month are used. They reset on ${nextMonthStart()}. Nothing was written. Upgrade: ${upgradeUrl}`
					);
				}
			}
		},

		async after(kind) {
			const { error } = await supabase.rpc('increment_mcp_usage', { p_kind: kind });
			if (error) console.warn('[mcp] failed to record usage', error.message);
		},
	};
}
