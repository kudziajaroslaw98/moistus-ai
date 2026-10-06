import type { PluginCallContext } from '@/lib/plugins/call-context';
import type { PluginNodeKind } from '@/lib/plugins/manifest-schema';
import {
	assignListRowIds,
	validatePluginData,
	type PluginData,
} from '@/lib/plugins/plugin-fields';
import type { PluginRenderOutput } from '@/lib/plugins/runtime/sandbox';
import type {
	PluginWorkerRequest,
	PluginWorkerResponse,
	PluginWorkerResult,
} from '@/lib/plugins/runtime/worker-protocol';
import { validatePluginTree, type PluginUiNode } from '@/lib/plugins/ui-tree';

/**
 * Main-thread client for the plugin worker. Every result is validated here before the
 * app uses it: views against the UI tree schema, action results against the kind's
 * fields. A call that doesn't answer in time restarts the worker.
 */

export const PLUGIN_HOST_TIMEOUT_MS = 1000;
/** The first load also starts QuickJS (WASM), so it gets longer. */
export const PLUGIN_LOAD_TIMEOUT_MS = 5000;
export const PLUGIN_SUMMARY_MAX = 280;

export type PluginHostErrorCode =
	'timeout' | 'memory' | 'error' | 'not-loaded' | 'invalid-output';

export class PluginHostError extends Error {
	constructor(
		message: string,
		readonly code: PluginHostErrorCode
	) {
		super(message);
		this.name = 'PluginHostError';
	}
}

export interface PluginWorkerLike {
	postMessage(message: PluginWorkerRequest): void;
	terminate(): void;
	onmessage: ((event: MessageEvent<PluginWorkerResponse>) => void) | null;
	onerror: ((event: Event) => void) | null;
}

export type { PluginCallContext } from '@/lib/plugins/call-context';

export interface PluginRenderResult {
	tree: PluginUiNode;
	/** Plain-text summary stored as the node's content (search, AI context, exports). */
	summary: string;
}

type RequestWithoutId = PluginWorkerRequest extends infer R
	? R extends { id: number }
		? Omit<R, 'id'>
		: never
	: never;

interface PendingRequest {
	resolve: (result: PluginWorkerResult) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export function fallbackSummary(
	kind: PluginNodeKind,
	data: PluginData
): string {
	const label = data[kind.labelField];
	return typeof label === 'string' && label.trim() ? label.trim() : kind.label;
}

export class PluginHost {
	private worker: PluginWorkerLike | null = null;

	private nextId = 1;

	private readonly pending = new Map<number, PendingRequest>();

	/** Code per plugin, kept across worker restarts so plugins reload on demand. */
	private readonly codes = new Map<string, string>();

	private readonly loaded = new Map<string, Promise<string[]>>();

	constructor(
		private readonly createWorker: () => PluginWorkerLike,
		private readonly timeoutMs = PLUGIN_HOST_TIMEOUT_MS
	) {}

	private ensureWorker(): PluginWorkerLike {
		if (this.worker) return this.worker;
		const worker = this.createWorker();
		worker.onmessage = (event) => this.settle(event.data);
		worker.onerror = () =>
			this.restart(
				new PluginHostError('The plugin runtime could not start', 'error')
			);
		this.worker = worker;
		return worker;
	}

	private settle(response: PluginWorkerResponse) {
		const request = this.pending.get(response.id);
		if (!request) return;
		clearTimeout(request.timer);
		this.pending.delete(response.id);
		if (response.ok) request.resolve(response.result);
		else request.reject(new PluginHostError(response.error, response.code));
	}

	private restart(reason: PluginHostError) {
		this.worker?.terminate();
		this.worker = null;
		this.loaded.clear();
		for (const [id, request] of this.pending) {
			clearTimeout(request.timer);
			request.reject(reason);
			this.pending.delete(id);
		}
	}

	private request(
		message: RequestWithoutId,
		timeoutMs = this.timeoutMs
	): Promise<PluginWorkerResult> {
		const worker = this.ensureWorker();
		const id = this.nextId++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(
					new PluginHostError(
						'The plugin took too long and was stopped',
						'timeout'
					)
				);
				this.restart(
					new PluginHostError('The plugin runtime was restarted', 'timeout')
				);
			}, timeoutMs);
			this.pending.set(id, { resolve, reject, timer });
			worker.postMessage({ ...message, id } as PluginWorkerRequest);
		});
	}

	/** Loads (or reloads, when the code changed) a plugin. Resolves to its kinds. */
	load(pluginId: string, code: string): Promise<string[]> {
		const existing = this.loaded.get(pluginId);
		if (existing && this.codes.get(pluginId) === code) return existing;

		this.codes.set(pluginId, code);
		const promise = this.request(
			{ type: 'load', pluginId, code },
			PLUGIN_LOAD_TIMEOUT_MS
		).then((result) => (result as { kinds: string[] }).kinds);
		this.loaded.set(pluginId, promise);
		promise.catch(() => {
			if (this.loaded.get(pluginId) === promise) this.loaded.delete(pluginId);
		});
		return promise;
	}

	private async ensureLoaded(pluginId: string) {
		const code = this.codes.get(pluginId);
		if (code === undefined)
			throw new PluginHostError('The plugin is not loaded', 'not-loaded');
		await this.load(pluginId, code);
	}

	async render(
		pluginId: string,
		kind: PluginNodeKind,
		data: PluginData,
		ctx: PluginCallContext
	): Promise<PluginRenderResult> {
		await this.ensureLoaded(pluginId);
		const output = (await this.request({
			type: 'render',
			pluginId,
			kind: kind.kind,
			data,
			ctx,
		})) as PluginRenderOutput;

		const checked = validatePluginTree(output.tree);
		if (!checked.ok) throw new PluginHostError(checked.error, 'invalid-output');
		const summary =
			typeof output.summary === 'string' && output.summary.trim()
				? output.summary.trim().slice(0, PLUGIN_SUMMARY_MAX)
				: fallbackSummary(kind, data);
		return { tree: checked.tree, summary };
	}

	async action(
		pluginId: string,
		kind: PluginNodeKind,
		action: string,
		data: PluginData,
		payload: unknown,
		ctx: PluginCallContext
	): Promise<PluginData> {
		await this.ensureLoaded(pluginId);
		const result = (await this.request({
			type: 'action',
			pluginId,
			kind: kind.kind,
			action,
			data,
			payload,
			ctx,
		})) as { data: unknown };

		const checked = validatePluginData(kind, result.data);
		if (!checked.ok) {
			throw new PluginHostError(
				`${kind.label} returned invalid data: ${checked.errors[0]?.message ?? 'unknown'}`,
				'invalid-output'
			);
		}
		// Rows the plugin added get ids from Shiko; existing rows keep theirs.
		return assignListRowIds(kind, checked.data, data);
	}

	unload(pluginId: string) {
		this.codes.delete(pluginId);
		this.loaded.delete(pluginId);
		if (this.worker)
			void this.request({ type: 'unload', pluginId }).catch(() => undefined);
	}
}
