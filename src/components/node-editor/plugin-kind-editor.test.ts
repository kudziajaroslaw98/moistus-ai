import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import type { ActivePluginKind } from '@/types/plugins';
import {
	buildPluginKindPatterns,
	buildPluginNodeSaveData,
} from './plugin-kind-editor';

const manifest = pluginManifestSchema.parse({
	id: 'dev.threads',
	name: 'Threads',
	version: '0.1.0',
	apiVersion: 1,
	author: 'Test',
	description: 'Open questions',
	icon: 'route',
	permissions: ['node:own', 'nodes:refs'],
	main: 'plugin.js',
	nodeKinds: [
		{
			kind: 'threads',
			label: 'Threads',
			description: 'Open questions',
			icon: 'route',
			labelField: 'title',
			fields: {
				title: { type: 'string', title: 'Title' },
				threads: {
					type: 'list',
					title: 'Threads',
					syntax: 'checklist',
					columns: [
						{ name: 'text', type: 'string', title: 'Thread' },
						{
							name: 'status',
							type: 'enum',
							title: 'Status',
							options: ['open', 'resolved', 'dropped'],
						},
					],
				},
				stops: {
					type: 'list',
					title: 'Stops',
					setBy: 'action',
					columns: [
						{ name: 'thread', type: 'string', title: 'Thread' },
						{ name: 'node', type: 'string', title: 'Node', ref: 'node' },
					],
				},
			},
		},
		{
			kind: 'plain',
			label: 'Plain',
			description: 'No links',
			icon: 'puzzle',
			labelField: 'title',
			fields: { title: { type: 'string', title: 'Title' } },
		},
	],
});

const active = (index: number) =>
	({
		manifest,
		kind: manifest.nodeKinds[index],
		source: 'catalog',
		generation: 1,
	}) as unknown as ActivePluginKind;

describe('buildPluginKindPatterns for a checklist', () => {
	it('lists the three markers, and no field for the checklist or for fields set by actions', () => {
		const patterns = buildPluginKindPatterns(manifest.nodeKinds[0]).map(
			(pattern) => pattern.pattern
		);

		expect(patterns).toEqual(['$threads', '[ ] ', '[x] ', '[-] ', 'text']);
	});
});

describe('buildPluginNodeSaveData', () => {
	const parsed = {
		label: 'Open threads',
		data: { title: 'Open threads' },
		errors: [],
		tokens: [],
	};

	it('marks nodes whose data links to other nodes, so they are not copied', () => {
		const saved = buildPluginNodeSaveData(active(0), parsed, null);

		expect(saved.metadata.extension.noCopy).toBe(true);
	});

	it('leaves other plugin nodes copyable', () => {
		const saved = buildPluginNodeSaveData(active(1), parsed, null);

		expect(saved.metadata.extension).not.toHaveProperty('noCopy');
	});
});
