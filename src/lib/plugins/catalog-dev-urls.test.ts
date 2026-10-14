import { draftIdOfPluginUrl, isLocalDevPluginUrl } from './catalog';

describe('developer plugin addresses', () => {
	const DRAFT = '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01';
	const origin = () => window.location.origin;

	it('accepts a manifest on localhost, as before', () => {
		expect(isLocalDevPluginUrl('http://localhost:5173/manifest.json')).toBe(
			true
		);
		expect(isLocalDevPluginUrl('http://127.0.0.1:3000/m.json')).toBe(true);
		expect(isLocalDevPluginUrl('https://evil.test/manifest.json')).toBe(false);
		expect(isLocalDevPluginUrl('http://localhost:5173/plugin.js')).toBe(false);
	});

	it('accepts a playground draft’s manifest served by this site', () => {
		const url = `${origin()}/api/plugins/drafts/${DRAFT}/files/manifest.json`;
		expect(draftIdOfPluginUrl(url)).toBe(DRAFT);
		expect(isLocalDevPluginUrl(url)).toBe(true);
	});

	it('refuses the same path on any other site', () => {
		const url = `https://evil.test/api/plugins/drafts/${DRAFT}/files/manifest.json`;
		expect(draftIdOfPluginUrl(url)).toBeNull();
		expect(isLocalDevPluginUrl(url)).toBe(false);
	});

	it('refuses other paths on this site, so only draft files can be loaded this way', () => {
		for (const path of [
			`/api/plugins/drafts/${DRAFT}/files/plugin.js`,
			`/api/plugins/drafts/not-a-draft/files/manifest.json`,
			`/api/plugins/drafts/${DRAFT}/manifest.json`,
			`/api/plugins/files/shiko.metric/0.1.0/manifest.json`,
			`/api/plugins/drafts/${DRAFT}/files/manifest.json/extra`,
		]) {
			// jsdom's own origin is localhost, so ask the draft rule itself.
			expect(draftIdOfPluginUrl(`${origin()}${path}`)).toBeNull();
		}
	});

	it('refuses text that is not an address', () => {
		expect(draftIdOfPluginUrl('not a url')).toBeNull();
		expect(isLocalDevPluginUrl('')).toBe(false);
	});
});
