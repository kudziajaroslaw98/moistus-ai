import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { pluginManifestSchema } from '@/lib/plugins/manifest-schema';
import type { PluginData } from '@/lib/plugins/plugin-fields';
import type { PluginHost } from '@/lib/plugins/runtime/plugin-host';
import {
	STARTER_MANIFEST,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';
import { act, renderHook } from '@testing-library/react';
import {
	CHECKS_DEBOUNCE_MS,
	PROGRAM_DEBOUNCE_MS,
	RENDER_DEBOUNCE_MS,
	useDraftChecks,
	useDraftProgram,
	usePlaygroundNode,
} from './use-playground';

const manifest: PluginManifest = pluginManifestSchema.parse({
	...STARTER_MANIFEST,
	id: 'dev.counter-9b2c41a7',
});
const manifestText = JSON.stringify(manifest);
const kind = manifest.nodeKinds[0];
const tree = { type: 'text', value: 'Coffees' } as const;

function fakeHost(overrides: Record<string, unknown> = {}) {
	const host = {
		load: jest.fn().mockResolvedValue(['counter']),
		render: jest.fn().mockResolvedValue({ tree, summary: 'Coffees: 2' }),
		action: jest.fn().mockResolvedValue({ label: 'Coffees', count: 3 }),
		refresh: jest.fn().mockResolvedValue({
			data: { label: 'Coffees', count: 9 },
			responses: {},
		}),
		canRefresh: jest.fn().mockReturnValue(false),
		check: jest.fn().mockResolvedValue({
			checks: [],
			ok: true,
			manifest: null,
			previews: [],
		}),
		...overrides,
	};
	return host as typeof host & PluginHost;
}

const wait = (ms: number) =>
	act(async () => {
		await jest.advanceTimersByTimeAsync(ms);
	});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDraftProgram', () => {
	it('does nothing until a host exists', async () => {
		const { result } = renderHook(() =>
			useDraftProgram(null, manifestText, STARTER_PLUGIN_JS)
		);
		await wait(PROGRAM_DEBOUNCE_MS * 2);
		expect(result.current.program).toBeNull();
	});

	it('loads the draft into the host once typing pauses', async () => {
		const host = fakeHost();
		const { result } = renderHook(() =>
			useDraftProgram(host, manifestText, STARTER_PLUGIN_JS)
		);
		await wait(PROGRAM_DEBOUNCE_MS);
		expect(host.load).toHaveBeenCalledWith(
			'dev.counter-9b2c41a7',
			STARTER_PLUGIN_JS
		);
		expect(result.current.program).toMatchObject({ ok: true });
	});

	it('reloads when the code changes and ignores an answer that arrives late', async () => {
		let release: (kinds: string[]) => void = () => undefined;
		const host = fakeHost({
			load: jest
				.fn()
				.mockImplementationOnce(
					() => new Promise((resolve) => (release = resolve))
				)
				.mockResolvedValue(['counter']),
		});
		const { result, rerender } = renderHook(
			({ code }) => useDraftProgram(host, manifestText, code),
			{ initialProps: { code: 'one' } }
		);
		await wait(PROGRAM_DEBOUNCE_MS); // first load starts and hangs
		rerender({ code: 'two' });
		await wait(PROGRAM_DEBOUNCE_MS); // second load answers
		expect(result.current.program).toMatchObject({ ok: true });

		await act(async () => release(['nothing-useful']));
		// The first load's late answer ('counter' missing) does not replace the newer one.
		expect(result.current.program).toMatchObject({ ok: true });
	});

	it('says why a manifest cannot load, without asking the host', async () => {
		const host = fakeHost();
		const { result } = renderHook(() =>
			useDraftProgram(host, '{ nope', STARTER_PLUGIN_JS)
		);
		await wait(PROGRAM_DEBOUNCE_MS);
		expect(result.current.program).toMatchObject({ ok: false });
		expect(host.load).not.toHaveBeenCalled();
	});
});

describe('useDraftChecks', () => {
	it('runs the checks on the parsed manifest and the code', async () => {
		const host = fakeHost({
			check: jest.fn().mockResolvedValue({
				checks: [
					{ label: 'Manifest is valid', ok: true },
					{ label: 'Code loads', ok: false, detail: 'boom' },
				],
				ok: false,
				manifest: null,
				previews: [],
			}),
		});
		const { result } = renderHook(() =>
			useDraftChecks(host, manifestText, STARTER_PLUGIN_JS, undefined)
		);
		await wait(CHECKS_DEBOUNCE_MS);
		expect(host.check).toHaveBeenCalledWith({
			manifest: JSON.parse(manifestText),
			code: STARTER_PLUGIN_JS,
			previousManifest: undefined,
		});
		expect(result.current.summary).toEqual({ passed: 1, total: 2 });
		expect(result.current.checks).toHaveLength(2);
	});

	it('reports unreadable JSON as a failed first check', async () => {
		const host = fakeHost();
		const { result } = renderHook(() =>
			useDraftChecks(host, '{ nope', STARTER_PLUGIN_JS, undefined)
		);
		await wait(CHECKS_DEBOUNCE_MS);
		expect(host.check).not.toHaveBeenCalled();
		expect(result.current.checks[0]).toMatchObject({
			label: 'Manifest is valid',
			ok: false,
		});
		expect(result.current.summary).toEqual({ passed: 0, total: 1 });
	});

	it('shows a failed check run instead of throwing', async () => {
		const host = fakeHost({
			check: jest.fn().mockRejectedValue(new Error('runtime down')),
		});
		const { result } = renderHook(() =>
			useDraftChecks(host, manifestText, STARTER_PLUGIN_JS, undefined)
		);
		await wait(CHECKS_DEBOUNCE_MS);
		expect(result.current.checks[0]).toMatchObject({
			ok: false,
			detail: 'runtime down',
		});
	});
});

describe('usePlaygroundNode', () => {
	const baseProps = (host: ReturnType<typeof fakeHost>, data: PluginData) => ({
		host,
		manifest,
		kind,
		data,
		canEdit: true,
		onData: jest.fn(),
		fetchAll: jest.fn().mockResolvedValue({}),
	});

	it('draws the node from the sample data', async () => {
		const host = fakeHost();
		const { result } = renderHook(() =>
			usePlaygroundNode(baseProps(host, { label: 'Coffees', count: 2 }))
		);
		await wait(RENDER_DEBOUNCE_MS);
		expect(host.render).toHaveBeenCalledWith(
			'dev.counter-9b2c41a7',
			kind,
			{ label: 'Coffees', count: 2 },
			expect.objectContaining({ canEdit: true })
		);
		expect(result.current.view?.tree).toEqual(tree);
		expect(result.current.fieldErrors).toEqual({});
	});

	it('asks for missing required fields instead of drawing', async () => {
		const host = fakeHost();
		const { result } = renderHook(() =>
			usePlaygroundNode(baseProps(host, { count: 2 }))
		);
		await wait(RENDER_DEBOUNCE_MS);
		expect(host.render).not.toHaveBeenCalled();
		expect(result.current.fieldErrors.label).toMatch(/required/);
	});

	it('shows what went wrong when the plugin cannot draw', async () => {
		const host = fakeHost({
			render: jest
				.fn()
				.mockRejectedValue(new Error('TypeError: ui.label is not a function')),
		});
		const { result } = renderHook(() =>
			usePlaygroundNode(baseProps(host, { label: 'x', count: 1 }))
		);
		await wait(RENDER_DEBOUNCE_MS);
		expect(result.current.error).toMatch(/ui\.label is not a function/);
	});

	it('runs a button’s action and hands the new data up', async () => {
		const host = fakeHost();
		const props = baseProps(host, { label: 'Coffees', count: 2 });
		const { result } = renderHook(() => usePlaygroundNode(props));
		await wait(RENDER_DEBOUNCE_MS);

		await act(async () => {
			await result.current.runAction('increment', undefined);
		});
		expect(host.action).toHaveBeenCalledWith(
			'dev.counter-9b2c41a7',
			kind,
			'increment',
			{ label: 'Coffees', count: 2 },
			undefined,
			expect.any(Object)
		);
		expect(props.onData).toHaveBeenCalledWith({ label: 'Coffees', count: 3 });
		expect(result.current.last).toMatchObject({ ok: true });
		expect(result.current.last?.text).toContain('increment');
	});

	it('says an edit button has nothing to run in the preview', async () => {
		const host = fakeHost();
		const props = baseProps(host, { label: 'Coffees', count: 2 });
		const { result } = renderHook(() => usePlaygroundNode(props));
		await wait(RENDER_DEBOUNCE_MS);

		act(() => result.current.noteEdit());

		expect(host.action).not.toHaveBeenCalled();
		expect(result.current.last).toMatchObject({ ok: true });
		expect(result.current.last?.text).toMatch(/opens the node editor/);
	});

	it('reports an action the host refuses', async () => {
		const host = fakeHost({
			action: jest
				.fn()
				.mockRejectedValue(new Error('count must be an integer')),
		});
		const props = baseProps(host, { label: 'Coffees', count: 2 });
		const { result } = renderHook(() => usePlaygroundNode(props));
		await wait(RENDER_DEBOUNCE_MS);
		await act(async () => {
			await result.current.runAction('increment', undefined);
		});
		expect(props.onData).not.toHaveBeenCalled();
		expect(result.current.last).toMatchObject({ ok: false });
		expect(result.current.last?.text).toContain('count must be an integer');
	});

	it('refreshes through the given fetch and hands the data up', async () => {
		const host = fakeHost({ canRefresh: jest.fn().mockReturnValue(true) });
		const props = baseProps(host, { label: 'Coffees', count: 2 });
		const { result } = renderHook(() => usePlaygroundNode(props));
		await wait(RENDER_DEBOUNCE_MS);
		expect(result.current.canRefresh).toBe(true);

		await act(async () => {
			await result.current.refresh();
		});
		expect(host.refresh).toHaveBeenCalledWith(
			'dev.counter-9b2c41a7',
			kind,
			{ label: 'Coffees', count: 2 },
			expect.any(Object),
			props.fetchAll
		);
		expect(props.onData).toHaveBeenCalledWith({ label: 'Coffees', count: 9 });
	});
});
