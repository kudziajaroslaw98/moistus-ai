/**
 * @jest-environment node
 */
import {
	draftManifestSummary,
	draftPluginId,
	manifestIdProblem,
	nextPatchVersion,
	withManifestId,
} from './draft-manifest';
import { pluginManifestSchema } from './manifest-schema';
import { STARTER_MANIFEST_JSON } from './starter-plugin';

const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const DRAFT_UUID = '9b2c41a7-3f10-4d2e-8a55-0c1d2e3f4a5b';

describe('draftPluginId', () => {
	it('builds a stable id from the name and the draft id', () => {
		expect(draftPluginId('Counter', DRAFT_UUID)).toBe('dev.counter-9b2c41a7');
		expect(draftPluginId('Counter', DRAFT_UUID)).toBe(
			draftPluginId('Counter', DRAFT_UUID)
		);
	});

	it('always matches the manifest id pattern and stays within 80 characters', () => {
		const names = [
			'Counter',
			'  Weird   NAME!! ',
			'Ünïcödé Plugin',
			'日本語',
			'',
			'---',
			'a'.repeat(200),
			'1 2 3',
		];
		for (const name of names) {
			const id = draftPluginId(name, DRAFT_UUID);
			expect(id).toMatch(ID_PATTERN);
			expect(id.length).toBeLessThanOrEqual(80);
		}
	});

	it('falls back to "plugin" when the name has no usable characters', () => {
		expect(draftPluginId('日本語', DRAFT_UUID)).toBe('dev.plugin-9b2c41a7');
		expect(draftPluginId('', DRAFT_UUID)).toBe('dev.plugin-9b2c41a7');
	});

	it('never starts with the reserved shiko prefix', () => {
		expect(draftPluginId('shiko', DRAFT_UUID).startsWith('shiko.')).toBe(false);
	});

	it('gives two drafts with the same name different ids', () => {
		expect(draftPluginId('Counter', DRAFT_UUID)).not.toBe(
			draftPluginId('Counter', 'ffffffff-3f10-4d2e-8a55-0c1d2e3f4a5b')
		);
	});
});

describe('withManifestId', () => {
	it('puts the id first and keeps every other field', () => {
		const text = withManifestId(STARTER_MANIFEST_JSON, 'dev.counter-9b2c41a7');
		expect(text).not.toBeNull();
		const parsed = JSON.parse(text as string);
		expect(Object.keys(parsed)[0]).toBe('id');
		expect(parsed.id).toBe('dev.counter-9b2c41a7');
		expect(parsed.name).toBe(JSON.parse(STARTER_MANIFEST_JSON).name);
		expect(pluginManifestSchema.safeParse(parsed).success).toBe(true);
	});

	it('adds an id when the manifest has none', () => {
		const text = withManifestId('{"name":"X"}', 'dev.x-12345678');
		expect(JSON.parse(text as string)).toEqual({
			id: 'dev.x-12345678',
			name: 'X',
		});
	});

	it('returns null for text that is not a JSON object', () => {
		expect(withManifestId('{ nope', 'dev.x-12345678')).toBeNull();
		expect(withManifestId('[1, 2]', 'dev.x-12345678')).toBeNull();
		expect(withManifestId('"text"', 'dev.x-12345678')).toBeNull();
	});
});

describe('manifestIdProblem', () => {
	const id = 'dev.counter-9b2c41a7';

	it('accepts the draft id', () => {
		expect(manifestIdProblem(`{"id":"${id}"}`, id)).toBeNull();
	});

	it('rejects a different id', () => {
		expect(manifestIdProblem('{"id":"dev.other-1"}', id)).toMatch(
			/Shiko sets the id/
		);
	});

	it('rejects a missing id once the JSON is valid', () => {
		expect(manifestIdProblem('{"name":"X"}', id)).toMatch(/Shiko sets the id/);
	});

	it('lets half-typed JSON through (a draft can be saved mid-edit)', () => {
		expect(manifestIdProblem('{"id": "dev.cou', id)).toBeNull();
		expect(manifestIdProblem('', id)).toBeNull();
	});
});

describe('draftManifestSummary', () => {
	it('reads name, icon and description from valid JSON', () => {
		expect(
			draftManifestSummary(
				'{"name":"Counter","icon":"timer","description":"Counts things."}'
			)
		).toEqual({
			name: 'Counter',
			icon: 'timer',
			description: 'Counts things.',
		});
	});

	it('keeps only icons Shiko knows and trims long values', () => {
		const summary = draftManifestSummary(
			JSON.stringify({
				name: 'n'.repeat(100),
				icon: 'not-an-icon',
				description: 'd'.repeat(500),
			})
		);
		expect(summary?.icon).toBe('puzzle');
		expect(summary?.name).toHaveLength(40);
		expect(summary?.description).toHaveLength(140);
	});

	it('returns null when the JSON cannot be read', () => {
		expect(draftManifestSummary('{ half')).toBeNull();
		expect(draftManifestSummary('[]')).toBeNull();
	});

	it('uses safe defaults for missing fields', () => {
		expect(draftManifestSummary('{}')).toEqual({
			name: '',
			icon: 'puzzle',
			description: '',
		});
	});
});

describe('nextPatchVersion', () => {
	it('raises the last number', () => {
		expect(nextPatchVersion('0.1.0')).toBe('0.1.1');
		expect(nextPatchVersion('1.2.9')).toBe('1.2.10');
	});

	it('leaves anything that is not x.y.z alone', () => {
		expect(nextPatchVersion('next')).toBe('next');
	});
});
