/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import {
	catalogManifestUrl,
	compareVersions,
	FIRST_PARTY_PLUGINS,
	newerCatalogVersions,
	permissionChanges,
	type PluginCatalogEntry,
} from './catalog';
import { pluginManifestSchema, type PluginManifest } from './manifest-schema';
import { parsePluginFieldInput, validatePluginData } from './plugin-fields';
import { createPluginSandbox } from './runtime/sandbox';
import { nodeTestVariant } from './runtime/test-quickjs-variant';
import { validatePluginTree, type PluginUiNode } from './ui-tree';

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const publicFile = (pluginId: string, version: string, name: string) =>
	readFileSync(
		join(
			process.cwd(),
			'public',
			catalogManifestUrl(pluginId, version).replace('manifest.json', name)
		),
		'utf8'
	);

const readManifest = (pluginId: string, version: string): PluginManifest =>
	pluginManifestSchema.parse(
		JSON.parse(publicFile(pluginId, version, 'manifest.json'))
	);

const allVersions = FIRST_PARTY_PLUGINS.flatMap((entry) =>
	entry.versions.map((version, index) => ({
		label: `${entry.id}@${version.version}`,
		entry,
		version,
		previous: index > 0 ? entry.versions[index - 1] : undefined,
	}))
);

function actionsIn(node: PluginUiNode): string[] {
	if (node.type === 'button' || node.type === 'checkbox') return [node.action];
	if (node.type === 'stack' || node.type === 'row')
		return node.children.flatMap(actionsIn);
	return [];
}

describe('first-party plugin catalog', () => {
	it.each(FIRST_PARTY_PLUGINS.map((entry): [string, PluginCatalogEntry] => [entry.id, entry]))(
		'%s lists its versions oldest first, each with notes',
		(_id, entry) => {
			entry.versions.forEach((version, index) => {
				expect(version.notes.trim()).not.toBe('');
				if (index > 0) {
					expect(
						compareVersions(version.version, entry.versions[index - 1].version)
					).toBeGreaterThan(0);
				}
			});
		}
	);

	it.each(allVersions.map((item) => [item.label, item]))(
		'%s: the manifest matches and the code fingerprint is current',
		(_label, { entry, version }) => {
			const manifest = readManifest(entry.id, version.version);
			const code = publicFile(entry.id, version.version, manifest.main);

			expect(manifest.id).toBe(entry.id);
			expect(manifest.version).toBe(version.version);
			expect([...manifest.permissions].sort()).toEqual(
				[...version.permissions].sort()
			);
			// If this fails after editing plugin.js, put the new hash in catalog.ts.
			expect(createHash('sha256').update(code).digest('hex')).toBe(
				version.sha256
			);
		}
	);

	it.each(allVersions.map((item) => [item.label, item]))(
		'%s: every example parses, renders a valid view, and its buttons return valid data',
		(_label, { entry, version }) => {
			const manifest = readManifest(entry.id, version.version);
			const sandbox = createPluginSandbox(
				QuickJS,
				publicFile(entry.id, version.version, manifest.main)
			);
			try {
				for (const kind of manifest.nodeKinds) {
					expect(kind.examples.length).toBeGreaterThan(0);
					for (const example of kind.examples) {
						const parsed = parsePluginFieldInput(example, kind);
						expect(parsed.errors).toEqual([]);

						const output = sandbox.render(kind.kind, parsed.data, { canEdit: true });
						const tree = validatePluginTree(output.tree);
						expect(tree.ok).toBe(true);
						if (!tree.ok) continue;

						for (const action of actionsIn(tree.tree)) {
							const next = sandbox.action(kind.kind, action, parsed.data, null, {
								canEdit: true,
							});
							expect(validatePluginData(kind, next).ok).toBe(true);
						}
					}
				}
			} finally {
				sandbox.dispose();
			}
		}
	);

	it.each(
		allVersions
			.filter((item) => item.previous)
			.map((item) => [item.label, item])
	)('%s reads the data its previous version saved', (_label, { entry, version, previous }) => {
		const before = readManifest(entry.id, previous!.version);
		const after = readManifest(entry.id, version.version);
		for (const oldKind of before.nodeKinds) {
			const newKind = after.nodeKinds.find((kind) => kind.kind === oldKind.kind);
			expect(newKind).toBeDefined();
			for (const example of oldKind.examples) {
				const saved = parsePluginFieldInput(example, oldKind).data;
				expect(validatePluginData(newKind!, saved).ok).toBe(true);
			}
		}
	});
});

describe('catalog version helpers', () => {
	it('compares x.y.z versions numerically', () => {
		expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
		expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
		expect(compareVersions('0.1.0', '0.2.0')).toBeLessThan(0);
	});

	it('lists newer versions newest first', () => {
		const entry: PluginCatalogEntry = {
			id: 'test.plugin',
			versions: ['0.1.0', '0.2.0', '0.3.0'].map((version) => ({
				version,
				sha256: '',
				permissions: ['node:own'],
				notes: version,
			})),
		};

		expect(newerCatalogVersions(entry, '0.1.0').map((v) => v.version)).toEqual([
			'0.3.0',
			'0.2.0',
		]);
		expect(newerCatalogVersions(entry, '0.3.0')).toEqual([]);
	});

	it('reports added and dropped powers', () => {
		expect(permissionChanges(['node:own'], ['node:own'])).toEqual({
			added: [],
			removed: [],
		});
	});
});
