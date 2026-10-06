import {
	shouldInterruptAfterDeadline,
	type QuickJSContext,
	type QuickJSHandle,
	type QuickJSRuntime,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { SANDBOX_LIMITS } from '../limits';

/**
 * Runs one plugin's code in its own QuickJS runtime. The plugin sees only the prelude
 * below (`definePlugin`, `ui`, a log-only `console`): no DOM, network, timers or host
 * objects. Values cross the boundary as JSON strings, and every call has a deadline and
 * a memory cap, so a broken or hostile plugin can't hang or exhaust the app.
 */

export type SandboxErrorCode = 'timeout' | 'memory' | 'error';

export class PluginSandboxError extends Error {
	constructor(
		message: string,
		readonly code: SandboxErrorCode
	) {
		super(message);
		this.name = 'PluginSandboxError';
	}
}

export interface PluginRenderOutput {
	/** Unvalidated: the host checks it against the UI tree schema. */
	tree: unknown;
	summary: unknown;
}

export interface PluginSandbox {
	readonly kinds: string[];
	render(kind: string, data: unknown, ctx: unknown): PluginRenderOutput;
	/** Returns the plugin's new data for the node, unvalidated. */
	action(
		kind: string,
		action: string,
		data: unknown,
		payload: unknown,
		ctx: unknown
	): unknown;
	/** False after a timeout or out-of-memory error; recreate the sandbox to continue. */
	readonly isUsable: boolean;
	dispose(): void;
}

export interface PluginSandboxOptions {
	limits?: Partial<typeof SANDBOX_LIMITS>;
	onLog?: (level: 'log' | 'warn' | 'error', message: string) => void;
}

const PRELUDE = `"use strict";
(() => {
	// No code from text: without eval and the Function constructors a plugin can't run
	// code it downloaded or built at runtime, so the reviewed code is the code that runs.
	// (The host evaluates the plugin through the engine API, which this doesn't affect.)
	const blocked = function () {
		throw new Error('Plugins cannot run code from text');
	};
	for (const ctor of [
		Function,
		Object.getPrototypeOf(function* () {}).constructor,
		Object.getPrototypeOf(async function () {}).constructor,
		Object.getPrototypeOf(async function* () {}).constructor,
	]) {
		Object.defineProperty(ctor.prototype, 'constructor', {
			value: blocked,
			writable: false,
			configurable: false,
		});
	}
	for (const name of ['Function', 'eval']) {
		Object.defineProperty(globalThis, name, {
			value: name === 'eval' ? undefined : blocked,
			writable: false,
			configurable: false,
		});
	}

	const kinds = Object.create(null);
	let defined = false;
	const withChildren = (type) => (props, children) =>
		Object.assign({}, props || {}, { type, children: children || [] });
	globalThis.ui = Object.freeze({
		stack: withChildren('stack'),
		row: withChildren('row'),
		text: (value, props) => Object.assign({}, props || {}, { type: 'text', value: String(value) }),
		badge: (label, props) => Object.assign({}, props || {}, { type: 'badge', label: String(label) }),
		progress: (value, props) => Object.assign({}, props || {}, { type: 'progress', value }),
		button: (label, action, props) =>
			Object.assign({}, props || {}, { type: 'button', label: String(label), action }),
		checkbox: (label, checked, action, props) =>
			Object.assign({}, props || {}, { type: 'checkbox', label: String(label), checked: !!checked, action }),
		divider: (props) => Object.assign({}, props || {}, { type: 'divider' }),
		icon: (name, props) => Object.assign({}, props || {}, { type: 'icon', name }),
	});
	globalThis.definePlugin = (definition) => {
		if (defined) throw new Error('definePlugin can only be called once');
		if (!definition || typeof definition !== 'object' || !definition.kinds) {
			throw new Error('definePlugin needs { kinds }');
		}
		for (const name of Object.keys(definition.kinds)) {
			const kind = definition.kinds[name];
			if (!kind || typeof kind.render !== 'function') {
				throw new Error('Kind "' + name + '" needs render(data, ctx)');
			}
			kinds[name] = kind;
		}
		defined = true;
	};
	globalThis.__shikoKinds = () => JSON.stringify(Object.keys(kinds));
	globalThis.__shikoCall = (op, kindName, argsJson) => {
		const kind = kinds[kindName];
		if (!kind) throw new Error('Unknown kind "' + kindName + '"');
		const args = JSON.parse(argsJson);
		if (op === 'render') {
			const tree = kind.render(args.data, args.ctx);
			const summary = typeof kind.summary === 'function' ? kind.summary(args.data) : null;
			return JSON.stringify({ tree, summary: summary === undefined ? null : summary });
		}
		if (op === 'action') {
			const handler = kind.actions && kind.actions[args.action];
			if (typeof handler !== 'function') throw new Error('Unknown action "' + args.action + '"');
			const next = handler(args.data, args.payload, args.ctx);
			return JSON.stringify(next === undefined ? null : next);
		}
		throw new Error('Unknown operation');
	};
})();`;

function classify(message: string): SandboxErrorCode {
	if (/interrupted/i.test(message)) return 'timeout';
	if (/out of memory|stack overflow/i.test(message)) return 'memory';
	return 'error';
}

function errorMessage(context: QuickJSContext, handle: QuickJSHandle): string {
	const dumped: unknown = context.dump(handle);
	if (dumped && typeof dumped === 'object' && 'message' in dumped) {
		const { name, message } = dumped as { name?: unknown; message?: unknown };
		return [name, message]
			.filter((part) => typeof part === 'string')
			.join(': ');
	}
	return String(dumped);
}

export function createPluginSandbox(
	QuickJS: QuickJSWASMModule,
	code: string,
	options: PluginSandboxOptions = {}
): PluginSandbox {
	const limits = { ...SANDBOX_LIMITS, ...options.limits };
	const runtime: QuickJSRuntime = QuickJS.newRuntime();
	runtime.setMemoryLimit(limits.memoryBytes);
	runtime.setMaxStackSize(limits.stackBytes);
	const context = runtime.newContext();
	let usable = true;
	let disposed = false;

	const fail = (message: string): never => {
		const code = classify(message);
		if (code !== 'error') usable = false;
		throw new PluginSandboxError(message, code);
	};

	const withDeadline = <T>(ms: number, run: () => T): T => {
		if (disposed || !usable) {
			throw new PluginSandboxError('The plugin sandbox was stopped', 'error');
		}
		runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + ms));
		try {
			return run();
		} finally {
			runtime.removeInterruptHandler();
		}
	};

	const evaluate = (source: string, filename: string, ms: number) =>
		withDeadline(ms, () => {
			const result = context.evalCode(source, filename);
			if (result.error) {
				const message = errorMessage(context, result.error);
				result.error.dispose();
				return fail(message);
			}
			result.value.dispose();
		});

	const callGlobal = (name: string, args: string[], ms: number): string =>
		withDeadline(ms, () => {
			const fn = context.getProp(context.global, name);
			const handles = args.map((arg) => context.newString(arg));
			try {
				const result = context.callFunction(fn, context.undefined, ...handles);
				if (result.error) {
					const message = errorMessage(context, result.error);
					result.error.dispose();
					return fail(message);
				}
				const value = context.getString(result.value);
				result.value.dispose();
				return value;
			} finally {
				handles.forEach((handle) => handle.dispose());
				fn.dispose();
			}
		});

	try {
		const consoleObject = context.newObject();
		for (const level of ['log', 'warn', 'error'] as const) {
			const logFn = context.newFunction(level, (...args) => {
				const message = args.map((arg) => String(context.dump(arg))).join(' ');
				options.onLog?.(level, message.slice(0, 1000));
			});
			context.setProp(consoleObject, level, logFn);
			logFn.dispose();
		}
		context.setProp(context.global, 'console', consoleObject);
		consoleObject.dispose();

		evaluate(PRELUDE, 'shiko-prelude.js', limits.loadMs);
		evaluate(code, 'plugin.js', limits.loadMs);
	} catch (error) {
		context.dispose();
		runtime.dispose();
		throw error;
	}

	const kinds = JSON.parse(
		callGlobal('__shikoKinds', [], limits.loadMs)
	) as string[];
	if (kinds.length === 0) {
		context.dispose();
		runtime.dispose();
		throw new PluginSandboxError(
			'The plugin did not call definePlugin()',
			'error'
		);
	}

	return {
		kinds,
		get isUsable() {
			return usable && !disposed;
		},
		render(kind, data, ctx) {
			const json = callGlobal(
				'__shikoCall',
				['render', kind, JSON.stringify({ data, ctx })],
				limits.renderMs
			);
			return JSON.parse(json) as PluginRenderOutput;
		},
		action(kind, action, data, payload, ctx) {
			const json = callGlobal(
				'__shikoCall',
				['action', kind, JSON.stringify({ action, data, payload, ctx })],
				limits.actionMs
			);
			return JSON.parse(json) as unknown;
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			context.dispose();
			runtime.dispose();
		},
	};
}
