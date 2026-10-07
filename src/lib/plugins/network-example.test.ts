/**
 * @jest-environment node
 */
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { pluginManifestSchema } from './manifest-schema';
import {
	NETWORK_EXAMPLE_JS,
	NETWORK_EXAMPLE_MANIFEST,
} from './network-example';
import {
	editorKind,
	parsePluginFieldInput,
	validatePluginData,
	type PluginData,
} from './plugin-fields';
import { createPluginSandbox } from './runtime/sandbox';
import { nodeTestVariant } from './runtime/test-quickjs-variant';
import { validatePluginTree } from './ui-tree';

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const manifest = pluginManifestSchema.parse(NETWORK_EXAMPLE_MANIFEST);
const kind = manifest.nodeKinds[0];
const ctx = { canEdit: true, today: '2026-10-07' };

describe('the build guide’s GitHub issue example', () => {
	it('has a valid manifest and parses its own example', () => {
		const parsed = parsePluginFieldInput(kind.examples[0], editorKind(kind));

		expect(parsed.errors).toEqual([]);
		expect(parsed.data).toEqual({ repo: 'vercel/next.js', number: 1 });
	});

	it('names the address on the first pass and saves the answer on the second', () => {
		const sandbox = createPluginSandbox(QuickJS, NETWORK_EXAMPLE_JS);
		try {
			const data = { repo: 'vercel/next.js', number: 1 };
			const first = sandbox.refresh('issue', data, ctx, null);
			expect(first.requests).toEqual([
				'https://api.github.com/repos/vercel/next.js/issues/1',
			]);

			const second = sandbox.refresh('issue', data, ctx, {
				[first.requests[0]]: {
					status: 'ok',
					code: 200,
					json: { title: 'Docs: getting started', state: 'closed' },
				},
			});
			const saved = second.data as PluginData;
			expect(validatePluginData(kind, saved).ok).toBe(true);
			expect(saved).toEqual({
				...data,
				title: 'Docs: getting started',
				state: 'closed',
			});

			const view = sandbox.render('issue', saved, ctx);
			expect(validatePluginTree(view.tree).ok).toBe(true);
			expect(JSON.stringify(view.tree)).toContain('Docs: getting started');
		} finally {
			sandbox.dispose();
		}
	});

	it('keeps what was saved when the request fails', () => {
		const sandbox = createPluginSandbox(QuickJS, NETWORK_EXAMPLE_JS);
		try {
			const data = { repo: 'a/b', number: 2, title: 'Saved', state: 'open' };
			const url = sandbox.refresh('issue', data, ctx, null).requests[0];
			const failed = sandbox.refresh('issue', data, ctx, {
				[url]: { status: 'error', code: 404, message: 'api.github.com answered 404' },
			});
			expect(failed.data).toEqual(data);
		} finally {
			sandbox.dispose();
		}
	});
});
