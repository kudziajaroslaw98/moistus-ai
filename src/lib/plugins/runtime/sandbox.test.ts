/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { validatePluginTree } from '../ui-tree';
import { createPluginSandbox, PluginSandboxError } from './sandbox';
import { nodeTestVariant } from './test-quickjs-variant';
import { issueCode } from './test-network-plugin';

const metricCode = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/plugin.js'),
	'utf8'
);

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const plugin = (render: string, extra = '') =>
	`${extra}\ndefinePlugin({ kinds: { probe: { render(data, ctx) { ${render} } } } });`;

function expectSandboxError(
	run: () => unknown,
	code: PluginSandboxError['code']
) {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(PluginSandboxError);
		expect((error as PluginSandboxError).code).toBe(code);
		return;
	}
	throw new Error('Expected a sandbox error');
}

describe('plugin sandbox', () => {
	it('runs the Metric plugin: kinds, a valid view, a summary and actions', () => {
		const sandbox = createPluginSandbox(QuickJS, metricCode);
		const data = {
			label: 'Weekly active users',
			value: 1240,
			target: 2000,
			unit: 'users',
			step: 100,
		};

		expect(sandbox.kinds).toEqual(['metric']);
		const output = sandbox.render('metric', data, { canEdit: true });
		expect(validatePluginTree(output.tree).ok).toBe(true);
		expect(output.summary).toBe('Weekly active users: 1,240 / 2,000 users');
		expect(JSON.stringify(output.tree)).toContain('"On track"');
		expect(
			sandbox.action('metric', 'increment', data, undefined, { canEdit: true })
		).toEqual({
			...data,
			value: 1340,
		});
		sandbox.dispose();
	});

	it('hides the buttons for people who can only view', () => {
		const sandbox = createPluginSandbox(QuickJS, metricCode);
		const output = sandbox.render(
			'metric',
			{ label: 'A', value: 1, target: 2, step: 1 },
			{ canEdit: false }
		);

		expect(JSON.stringify(output.tree)).not.toContain('"button"');
		sandbox.dispose();
	});

	it('gives plugins no network, DOM, timers or host objects', () => {
		const sandbox = createPluginSandbox(
			QuickJS,
			plugin(
				'return ui.text([typeof fetch, typeof window, typeof document, typeof setTimeout, typeof require, typeof process, typeof XMLHttpRequest, typeof WebSocket].join(","));'
			)
		);

		expect(sandbox.render('probe', {}, {}).tree).toEqual({
			type: 'text',
			value:
				'undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined',
		});
		sandbox.dispose();
	});

	it('cannot turn text into code, so what was reviewed is what runs', () => {
		const attempts = [
			'typeof eval === "function" ? eval("1") : "no eval"',
			'new Function("return 1")()',
			'(function () {}).constructor("return 1")()',
			'(() => {}).constructor("return 1")()',
			'Object.getPrototypeOf(function* () {}).constructor("yield 1")',
			'Object.getPrototypeOf(async function () {}).constructor("return 1")',
			'Object.getPrototypeOf(async function* () {}).constructor("yield 1")',
			'Reflect.construct(Function, ["return 1"])()',
		];
		const sandbox = createPluginSandbox(
			QuickJS,
			plugin(
				`const results = ${JSON.stringify(attempts)}.map((source) => {
					try { return String((0, globalThis.__probe)(source)); } catch (error) { return 'blocked'; }
				});
				return ui.text(results.join(","));`,
				// Each attempt runs inside the plugin, exactly as written.
				`globalThis.__probe = (source) => { switch (source) { ${attempts
					.map((source, index) => `case ${JSON.stringify(source)}: return (() => ${source})();`)
					.join(' ')} } };`
			)
		);

		const output = sandbox.render('probe', {}, {}).tree as { value: string };
		expect(output.value.split(',')).toEqual([
			'no eval',
			...attempts.slice(1).map(() => 'blocked'),
		]);
		sandbox.dispose();
	});

	it('still runs ordinary functions, classes and closures after the lockdown', () => {
		const sandbox = createPluginSandbox(
			QuickJS,
			plugin(
				'class A { get x() { return 2; } } const add = (a) => (b) => a + b; return ui.text(String(add(1)(new A().x) + [1, 2].map((n) => n * 2).length));'
			)
		);

		expect(sandbox.render('probe', {}, {}).tree).toEqual({ type: 'text', value: '5' });
		sandbox.dispose();
	});

	it('stops a render that never finishes and marks the sandbox unusable', () => {
		const sandbox = createPluginSandbox(QuickJS, plugin('while (true) {}'));

		expectSandboxError(() => sandbox.render('probe', {}, {}), 'timeout');
		expect(sandbox.isUsable).toBe(false);
		sandbox.dispose();
	});

	it('stops plugin code that loops while loading', () => {
		expectSandboxError(
			() => createPluginSandbox(QuickJS, 'while (true) {}'),
			'timeout'
		);
	});

	it('stops a plugin that tries to use too much memory', () => {
		const sandbox = createPluginSandbox(
			QuickJS,
			plugin(
				'const big = new Uint8Array(64 * 1024 * 1024); return ui.text(String(big.length));'
			)
		);

		expectSandboxError(() => sandbox.render('probe', {}, {}), 'memory');
		sandbox.dispose();
	});

	it('reports plugin errors without breaking the sandbox', () => {
		const sandbox = createPluginSandbox(
			QuickJS,
			plugin('throw new Error("boom");')
		);

		expectSandboxError(() => sandbox.render('probe', {}, {}), 'error');
		expect(sandbox.isUsable).toBe(true);
		sandbox.dispose();
	});

	it('requires definePlugin and known kinds and actions', () => {
		expectSandboxError(
			() => createPluginSandbox(QuickJS, 'const x = 1;'),
			'error'
		);
		const sandbox = createPluginSandbox(QuickJS, metricCode);
		expectSandboxError(() => sandbox.render('kanban', {}, {}), 'error');
		expectSandboxError(
			() => sandbox.action('metric', 'explode', {}, null, {}),
			'error'
		);
		sandbox.dispose();
	});

	it('keeps plugins isolated from each other', () => {
		const first = createPluginSandbox(
			QuickJS,
			plugin('return ui.text("a");', 'globalThis.secret = "token";')
		);
		const second = createPluginSandbox(
			QuickJS,
			plugin('return ui.text(String(typeof secret));')
		);

		expect(second.render('probe', {}, {}).tree).toEqual({
			type: 'text',
			value: 'undefined',
		});
		first.dispose();
		second.dispose();
	});
});

describe('refresh', () => {
	const ctx = { canEdit: true, today: '2026-10-06' };
	const data = { repo: 'shiko/app', number: 482 };

	it('records the requests on the first pass and reads the answers on the second', () => {
		const sandbox = createPluginSandbox(QuickJS, issueCode);
		try {
			expect(sandbox.refreshKinds).toEqual(['issue']);
			const first = sandbox.refresh('issue', data, ctx, null);
			expect(first).toEqual({
				data,
				requests: ['https://api.github.com/repos/shiko/app/issues/482'],
			});

			const second = sandbox.refresh('issue', data, ctx, {
				'https://api.github.com/repos/shiko/app/issues/482': {
					status: 'ok',
					code: 200,
					json: { title: 'Fix login loop', state: 'open' },
				},
			});
			expect(second).toEqual({
				data: { ...data, title: 'Fix login loop', state: 'open', error: '' },
				requests: [],
			});
		} finally {
			sandbox.dispose();
		}
	});

	it('answers addresses the first pass did not ask for with an error', () => {
		const sandbox = createPluginSandbox(QuickJS, issueCode);
		try {
			const second = sandbox.refresh('issue', data, ctx, {});
			expect(second.data).toMatchObject({
				error: 'This address wasn’t requested on the first pass',
			});
		} finally {
			sandbox.dispose();
		}
	});

	it('caps the requests one refresh can make', () => {
		const sandbox = createPluginSandbox(
			QuickJS,
			`definePlugin({ kinds: { probe: {
				render: () => ui.text('x'),
				actions: { refresh(data, payload, ctx) {
					const answers = [];
					for (let i = 0; i < 6; i++) answers.push(ctx.request('https://api.github.com/' + i).status);
					return { label: answers.join(',') };
				} },
			} } });`
		);
		try {
			const first = sandbox.refresh('probe', {}, ctx, null);
			expect(first.requests).toHaveLength(4);
			expect(first.data).toEqual({ label: 'loading,loading,loading,loading,error,error' });
		} finally {
			sandbox.dispose();
		}
	});

	it('gives render no way to make requests, and keeps buttons from running refresh', () => {
		const sandbox = createPluginSandbox(
			QuickJS,
			`definePlugin({ kinds: { issue: {
				render: (data, ctx) => ui.text(typeof ctx.request),
				actions: { refresh: (data) => data },
			} } });`
		);
		try {
			expect(sandbox.render('issue', {}, ctx).tree).toEqual({ type: 'text', value: 'undefined' });
			expectSandboxError(() => sandbox.action('issue', 'refresh', {}, null, ctx), 'error');
		} finally {
			sandbox.dispose();
		}
	});
});
