import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pluginManifestSchema } from './manifest-schema';
import { countNodesNotFitting } from './version-fit';

const manifest = (version: string) =>
	pluginManifestSchema.parse(
		JSON.parse(
			readFileSync(
				join(process.cwd(), `public/plugins/shiko.metric/${version}/manifest.json`),
				'utf8'
			)
		)
	);
const metric = (data: Record<string, unknown>, kind = 'metric') => ({
	pluginId: 'shiko.metric',
	kind,
	version: '0.2.0',
	data,
});

describe('countNodesNotFitting', () => {
	it('counts nodes whose data a version rejects or whose kind it lacks', () => {
		const nodes = [
			metric({ label: 'Users', target: 100 }),
			metric({ label: 'Users', target: 100, trend: 'up' }),
			metric({ label: 'Gone' }, 'gauge'),
			{ ...metric({}), pluginId: 'other.plugin' },
		];

		expect(countNodesNotFitting(nodes, manifest('0.2.0'))).toBe(1);
		// 0.1.0 has no trend field.
		expect(countNodesNotFitting(nodes, manifest('0.1.0'))).toBe(2);
	});
});
