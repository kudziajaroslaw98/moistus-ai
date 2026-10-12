/**
 * @jest-environment node
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	memoizePromiseFactory,
	newQuickJSWASMModuleFromVariant,
} from 'quickjs-emscripten-core';
import { withManifestId } from '../draft-manifest';
import { PluginHost, type PluginWorkerLike } from '../runtime/plugin-host';
import { nodeTestVariant } from '../runtime/test-quickjs-variant';
import {
	createPluginWorkerHandler,
	type PluginWorkerRequest,
	type PluginWorkerResponse,
} from '../runtime/worker-protocol';
import { PLAYGROUND_TEMPLATES, loadTemplateFiles } from './templates';

const getModule = memoizePromiseFactory(() =>
	newQuickJSWASMModuleFromVariant(nodeTestVariant())
);

function inProcessWorker(): PluginWorkerLike {
	const handle = createPluginWorkerHandler(getModule);
	const worker = {
		onmessage: null as PluginWorkerLike['onmessage'],
		onerror: null as PluginWorkerLike['onerror'],
		terminate: jest.fn(),
		postMessage(message: PluginWorkerRequest) {
			void handle(message).then((response) =>
				worker.onmessage?.({
					data: response,
				} as MessageEvent<PluginWorkerResponse>)
			);
		},
	};
	return worker;
}

/** Serves `public/` the way the app does, for the template that reads a first-party plugin. */
const fetchPublic = (async (input: RequestInfo | URL) => {
	const path = join(process.cwd(), 'public', String(input));
	try {
		const body = await readFile(path, 'utf8');
		return new Response(body, { status: 200 });
	} catch {
		return new Response('Not found', { status: 404 });
	}
}) as typeof fetch;

describe('playground templates', () => {
	it('offers the four templates the start dialog shows', () => {
		expect(PLAYGROUND_TEMPLATES.map((template) => template.id)).toEqual([
			'blank',
			'counter',
			'branch-progress',
			'github-issue',
		]);
	});

	it.each(
		PLAYGROUND_TEMPLATES.map((template) => [template.id, template] as const)
	)(
		'%s: its two files pass every check once Shiko gives it an id',
		async (_id, template) => {
			const files = await loadTemplateFiles(template.id, fetchPublic);
			const manifestText = withManifestId(
				files.manifestText,
				'dev.template-9b2c41a7'
			);
			expect(manifestText).not.toBeNull();

			const host = new PluginHost(inProcessWorker);
			const result = await host.check({
				manifest: JSON.parse(manifestText as string),
				code: files.code,
			});
			host.dispose();

			const failed = result.checks.filter((check) => !check.ok);
			expect(failed).toEqual([]);
			expect(result.ok).toBe(true);
			expect(result.previews.length).toBeGreaterThan(0);
		}
	);

	it('shows each template with the icon its manifest has and what powers it uses', async () => {
		const byId = Object.fromEntries(PLAYGROUND_TEMPLATES.map((t) => [t.id, t]));
		expect(byId['branch-progress'].permissions).toContain('branch:read');
		expect(byId['github-issue'].permissions).toContain(
			'network:api.github.com'
		);
		expect(byId.blank.permissions).toEqual(['node:own']);

		for (const template of PLAYGROUND_TEMPLATES) {
			const files = await loadTemplateFiles(template.id, fetchPublic);
			expect(JSON.parse(files.manifestText).icon).toBe(template.icon);
		}
	});

	it('says which file could not be read when a first-party plugin is missing', async () => {
		const missing = (async () =>
			new Response('', { status: 404 })) as typeof fetch;
		await expect(loadTemplateFiles('branch-progress', missing)).rejects.toThrow(
			/Couldn’t load the template/
		);
	});
});
