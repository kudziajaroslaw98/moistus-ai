/**
 * @jest-environment node
 */
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { pluginManifestSchema } from './manifest-schema';
import { parsePluginFieldInput, validatePluginData } from './plugin-fields';
import { createPluginSandbox } from './runtime/sandbox';
import { nodeTestVariant } from './runtime/test-quickjs-variant';
import {
	STARTER_MANIFEST,
	STARTER_MANIFEST_JSON,
	STARTER_PLUGIN_JS,
} from './starter-plugin';
import { validatePluginTree } from './ui-tree';

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const manifest = pluginManifestSchema.parse(JSON.parse(STARTER_MANIFEST_JSON));
const kind = manifest.nodeKinds[0];

describe('the build guide starter plugin', () => {
	it('has a valid manifest, as downloaded', () => {
		expect(manifest.id).toBe(STARTER_MANIFEST.id);
		expect(kind.kind).toBe('counter');
	});

	it('parses its own example', () => {
		const parsed = parsePluginFieldInput(kind.examples[0], kind);

		expect(parsed.errors).toEqual([]);
		expect(parsed.data).toEqual({ label: 'Coffees today', count: 2 });
	});

	it('runs in the sandbox and draws a valid view with buttons for editors', () => {
		const sandbox = createPluginSandbox(QuickJS, STARTER_PLUGIN_JS);
		try {
			expect(sandbox.kinds).toEqual(['counter']);
			const output = sandbox.render('counter', { label: 'Coffees', count: 2 }, { canEdit: true });

			expect(validatePluginTree(output.tree).ok).toBe(true);
			expect(JSON.stringify(output.tree)).toContain('"action":"increment"');
			expect(output.summary).toBe('Coffees: 2');

			const viewOnly = sandbox.render('counter', { label: 'Coffees', count: 2 }, { canEdit: false });
			expect(JSON.stringify(viewOnly.tree)).not.toContain('"type":"button"');
		} finally {
			sandbox.dispose();
		}
	});

	it('returns valid data from its actions', () => {
		const sandbox = createPluginSandbox(QuickJS, STARTER_PLUGIN_JS);
		try {
			const next = sandbox.action('counter', 'increment', { label: 'Coffees', count: 2 }, null, {
				canEdit: true,
			});

			expect(validatePluginData(kind, next)).toEqual({
				ok: true,
				data: { label: 'Coffees', count: 3 },
			});
		} finally {
			sandbox.dispose();
		}
	});
});
