/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { FIRST_PARTY_PLUGINS } from './catalog';
import { runPluginChecks } from './plugin-checks';
import { issueCode, issueManifest } from './runtime/test-network-plugin';
import { nodeTestVariant } from './runtime/test-quickjs-variant';

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const file = (id: string, version: string, name: string) =>
	readFileSync(join(process.cwd(), 'public/plugins', id, version, name), 'utf8');
const metricManifest = () => JSON.parse(file('shiko.metric', '0.2.0', 'manifest.json'));
const metricCode = file('shiko.metric', '0.2.0', 'plugin.js');

describe('runPluginChecks', () => {
	it.each(FIRST_PARTY_PLUGINS.map((entry) => [entry.id, entry]))(
		'%s passes every check',
		(_id, entry) => {
			const { version } = entry.versions[entry.versions.length - 1];
			const result = runPluginChecks(QuickJS, {
				manifest: JSON.parse(file(entry.id, version, 'manifest.json')),
				code: file(entry.id, version, 'plugin.js'),
			});
			expect(result.checks.filter((check) => !check.ok)).toEqual([]);
			expect(result.ok).toBe(true);
		}
	);

	it('lists what it checked, including the previous version’s data', () => {
		const result = runPluginChecks(QuickJS, {
			manifest: metricManifest(),
			code: metricCode,
			previousManifest: JSON.parse(file('shiko.metric', '0.1.0', 'manifest.json')),
		});
		expect(result.checks.map((check) => check.label)).toEqual([
			'Manifest is valid',
			expect.stringMatching(/^Code loads in the sandbox \(\d+(\.\d)? KB of 256 KB\)$/),
			expect.stringMatching(/examples? draws? valid views?/),
			'Its buttons return valid data',
			'Reads 0.1.0 data',
			'Doesn’t use eval or Function',
		]);
	});

	it('stops at an invalid manifest and says why', () => {
		const result = runPluginChecks(QuickJS, {
			manifest: { ...metricManifest(), id: 'Not An Id' },
			code: metricCode,
		});
		expect(result.ok).toBe(false);
		expect(result.checks).toEqual([
			{ label: 'Manifest is valid', ok: false, detail: expect.stringContaining('id') },
		]);
	});

	it('fails code that doesn’t load or doesn’t define its kinds', () => {
		expect(
			runPluginChecks(QuickJS, { manifest: metricManifest(), code: 'syntax error here(' }).checks[1]
		).toMatchObject({ label: 'Code loads in the sandbox', ok: false });
		expect(
			runPluginChecks(QuickJS, {
				manifest: metricManifest(),
				code: "definePlugin({ kinds: { other: { render: () => ui.text('x') } } });",
			}).checks[1]
		).toMatchObject({ ok: false, detail: 'The code doesn\'t define "metric"' });
	});

	it('fails views and buttons that break the rules', () => {
		const result = runPluginChecks(QuickJS, {
			manifest: metricManifest(),
			code: `definePlugin({ kinds: { metric: {
				render: () => ui.stack({}, [ui.button('Go', 'grab')]),
				actions: { grab: (data) => Object.assign({}, data, { stolen: true }) },
			} } });`,
		});
		expect(result.ok).toBe(false);
		expect(result.checks.find((check) => check.label === 'Its button returns valid data')).toBeUndefined();
		expect(result.checks.find((check) => check.label === 'Its buttons return valid data')).toMatchObject({
			ok: false,
		});
	});

	it('fails a refresh that asks for a site the plugin didn’t declare', () => {
		const result = runPluginChecks(QuickJS, {
			manifest: issueManifest,
			code: issueCode.replace('https://api.github.com/repos/', 'https://evil.test/repos/'),
		});
		expect(result.checks.find((check) => check.label === 'Refresh asks only for its own sites')).toMatchObject({
			ok: false,
			detail: expect.stringContaining('evil.test'),
		});
	});

	it('flags code that calls eval or Function', () => {
		const result = runPluginChecks(QuickJS, {
			manifest: metricManifest(),
			code: `${metricCode}\nconst later = () => eval('1');`,
		});
		expect(result.checks[result.checks.length - 1]).toMatchObject({
			label: 'Doesn’t use eval or Function',
			ok: false,
		});
	});
});
