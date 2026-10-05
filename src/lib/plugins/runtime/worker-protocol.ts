import {
	createPluginSandbox,
	PluginSandboxError,
	type PluginRenderOutput,
	type PluginSandbox,
	type SandboxErrorCode,
} from '@/lib/plugins/runtime/sandbox';
import type { QuickJSWASMModule } from 'quickjs-emscripten-core';

/** Messages between the main thread (plugin-host) and the plugin worker. */
export type PluginWorkerRequest =
	| { id: number; type: 'load'; pluginId: string; code: string }
	| {
			id: number;
			type: 'render';
			pluginId: string;
			kind: string;
			data: unknown;
			ctx: unknown;
	  }
	| {
			id: number;
			type: 'action';
			pluginId: string;
			kind: string;
			action: string;
			data: unknown;
			payload: unknown;
			ctx: unknown;
	  }
	| { id: number; type: 'unload'; pluginId: string };

export type PluginWorkerResult =
	| { kinds: string[] }
	| PluginRenderOutput
	| { data: unknown }
	| { unloaded: true };

export type PluginWorkerResponse =
	| { id: number; ok: true; result: PluginWorkerResult }
	| {
			id: number;
			ok: false;
			error: string;
			code: SandboxErrorCode | 'not-loaded';
	  };

/**
 * Handles worker requests against one QuickJS module. Shared by the real worker and by
 * tests, which run it in-process. A sandbox that timed out or ran out of memory is
 * rebuilt from its code before the next call (plugin state lives in node data).
 */
export function createPluginWorkerHandler(
	getModule: () => Promise<QuickJSWASMModule>
) {
	const plugins = new Map<string, { code: string; sandbox: PluginSandbox }>();

	const sandboxFor = async (
		pluginId: string
	): Promise<PluginSandbox | null> => {
		const entry = plugins.get(pluginId);
		if (!entry) return null;
		if (!entry.sandbox.isUsable) {
			entry.sandbox.dispose();
			entry.sandbox = createPluginSandbox(await getModule(), entry.code);
		}
		return entry.sandbox;
	};

	return async (
		request: PluginWorkerRequest
	): Promise<PluginWorkerResponse> => {
		const { id } = request;
		try {
			if (request.type === 'load') {
				plugins.get(request.pluginId)?.sandbox.dispose();
				plugins.delete(request.pluginId);
				const sandbox = createPluginSandbox(await getModule(), request.code);
				plugins.set(request.pluginId, { code: request.code, sandbox });
				return { id, ok: true, result: { kinds: sandbox.kinds } };
			}
			if (request.type === 'unload') {
				plugins.get(request.pluginId)?.sandbox.dispose();
				plugins.delete(request.pluginId);
				return { id, ok: true, result: { unloaded: true } };
			}

			const sandbox = await sandboxFor(request.pluginId);
			if (!sandbox) {
				return {
					id,
					ok: false,
					error: 'The plugin is not loaded',
					code: 'not-loaded',
				};
			}
			if (request.type === 'render') {
				return {
					id,
					ok: true,
					result: sandbox.render(request.kind, request.data, request.ctx),
				};
			}
			return {
				id,
				ok: true,
				result: {
					data: sandbox.action(
						request.kind,
						request.action,
						request.data,
						request.payload,
						request.ctx
					),
				},
			};
		} catch (error) {
			return {
				id,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
				code: error instanceof PluginSandboxError ? error.code : 'error',
			};
		}
	};
}
