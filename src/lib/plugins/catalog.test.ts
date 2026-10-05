/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIRST_PARTY_PLUGINS } from './catalog';
import { pluginManifestSchema } from './manifest-schema';

const publicFile = (baseUrl: string, name: string) =>
	readFileSync(join(process.cwd(), 'public', baseUrl, name), 'utf8');

describe('first-party plugin catalog', () => {
	it.each(FIRST_PARTY_PLUGINS.map((entry) => [entry.id, entry]))(
		'%s: the manifest matches and the code fingerprint is current',
		(_id, entry) => {
			const manifest = pluginManifestSchema.parse(
				JSON.parse(publicFile(entry.baseUrl, 'manifest.json'))
			);
			const code = publicFile(entry.baseUrl, manifest.main);

			expect(manifest.id).toBe(entry.id);
			expect(manifest.version).toBe(entry.version);
			// If this fails after editing plugin.js, put the new hash in catalog.ts.
			expect(createHash('sha256').update(code).digest('hex')).toBe(entry.sha256);
		}
	);
});
