import metricManifest from '../../../public/plugins/shiko.metric/0.1.0/manifest.json';
import { describeManifestError, pluginManifestSchema } from './manifest-schema';

const clone = () => JSON.parse(JSON.stringify(metricManifest));

describe('pluginManifestSchema', () => {
	it('accepts the first-party Metric manifest', () => {
		const parsed = pluginManifestSchema.safeParse(metricManifest);

		expect(parsed.success).toBe(true);
		expect(parsed.data?.nodeKinds[0].kind).toBe('metric');
	});

	it('rejects ids that are not reverse-DNS', () => {
		const manifest = { ...clone(), id: 'Metric Plugin' };

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});

	it('refuses kinds that would take over built-in triggers', () => {
		const manifest = clone();
		manifest.nodeKinds[0].kind = 'task';

		const parsed = pluginManifestSchema.safeParse(manifest);
		expect(parsed.success).toBe(false);
		expect(describeManifestError(parsed.error!)).toBe(
			'nodeKinds.0.kind: This kind is reserved'
		);
	});

	it('needs the label field to be a string field', () => {
		const manifest = clone();
		manifest.nodeKinds[0].labelField = 'value';

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});

	it('only allows the node:own permission', () => {
		const manifest = { ...clone(), permissions: ['map:read'] };

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});

	it('rejects unknown keys and main paths outside the plugin', () => {
		expect(
			pluginManifestSchema.safeParse({ ...clone(), homepage: 'x' }).success
		).toBe(false);
		expect(
			pluginManifestSchema.safeParse({ ...clone(), main: '../evil.js' }).success
		).toBe(false);
		expect(
			pluginManifestSchema.safeParse({
				...clone(),
				main: 'https://evil.test/a.js',
			}).success
		).toBe(false);
	});

	it('rejects duplicate kinds', () => {
		const manifest = clone();
		manifest.nodeKinds.push(manifest.nodeKinds[0]);

		expect(pluginManifestSchema.safeParse(manifest).success).toBe(false);
	});
});
