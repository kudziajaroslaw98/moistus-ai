import { DraftRequestError } from '@/lib/plugins/drafts-client';
import type { PluginDraft } from '@/types/plugin-drafts';
import { act, renderHook } from '@testing-library/react';
import { AUTOSAVE_MS, useDraft } from './use-draft';

const mockFetchDraft = jest.fn();
const mockSaveDraft = jest.fn();
jest.mock('@/lib/plugins/drafts-client', () => {
	const actual = jest.requireActual('@/lib/plugins/drafts-client');
	return {
		...actual,
		fetchDraft: (...args: unknown[]) => mockFetchDraft(...args),
		saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
	};
});

const draft = (overrides: Partial<PluginDraft> = {}): PluginDraft => ({
	id: 'draft-1',
	pluginId: 'dev.counter-aaaaaaaa',
	name: 'Counter',
	icon: 'puzzle',
	description: '',
	checkSummary: null,
	baseVersion: null,
	updatedAt: '2026-10-10T12:00:00.000Z',
	manifestText: '{"id":"dev.counter-aaaaaaaa"}',
	code: 'definePlugin({});',
	sample: {},
	revision: 1,
	createdAt: '2026-10-10T11:00:00.000Z',
	...overrides,
});

async function loaded() {
	mockFetchDraft.mockResolvedValue(draft());
	const hook = renderHook(() => useDraft('draft-1'));
	await act(async () => {
		await Promise.resolve();
	});
	return hook;
}

const wait = (ms: number) =>
	act(async () => {
		await jest.advanceTimersByTimeAsync(ms);
	});

beforeEach(() => {
	jest.useFakeTimers();
	mockFetchDraft.mockReset();
	mockSaveDraft.mockReset();
});

afterEach(() => {
	jest.useRealTimers();
});

describe('useDraft', () => {
	it('loads the draft and starts as saved', async () => {
		const { result } = await loaded();
		expect(result.current.status).toBe('ready');
		expect(result.current.code).toBe('definePlugin({});');
		expect(result.current.saveState).toBe('saved');
		expect(mockFetchDraft).toHaveBeenCalledWith('draft-1');
	});

	it('exposes a failed load', async () => {
		mockFetchDraft.mockRejectedValue(
			new DraftRequestError('Draft not found.', 404)
		);
		const { result } = renderHook(() => useDraft('draft-1'));
		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.status).toBe('error');
		expect(result.current.error?.status).toBe(404);
	});

	it('saves only what changed, after the autosave delay, naming the revision', async () => {
		mockSaveDraft.mockResolvedValue(draft({ revision: 2, code: 'new code' }));
		const { result } = await loaded();

		act(() => result.current.setCode('new code'));
		expect(result.current.saveState).toBe('unsaved');
		expect(mockSaveDraft).not.toHaveBeenCalled();

		await wait(AUTOSAVE_MS);
		expect(mockSaveDraft).toHaveBeenCalledTimes(1);
		expect(mockSaveDraft).toHaveBeenCalledWith('draft-1', 1, {
			code: 'new code',
		});
		expect(result.current.saveState).toBe('saved');

		// The next save starts from the revision the server answered with.
		act(() =>
			result.current.setManifestText('{"id":"dev.counter-aaaaaaaa","name":"X"}')
		);
		mockSaveDraft.mockResolvedValue(draft({ revision: 3 }));
		await wait(AUTOSAVE_MS);
		expect(mockSaveDraft).toHaveBeenLastCalledWith('draft-1', 2, {
			manifestText: '{"id":"dev.counter-aaaaaaaa","name":"X"}',
		});
	});

	it('waits for typing to pause: several edits make one save', async () => {
		mockSaveDraft.mockResolvedValue(draft({ revision: 2 }));
		const { result } = await loaded();

		act(() => result.current.setCode('a'));
		await wait(AUTOSAVE_MS - 100);
		act(() => result.current.setCode('ab'));
		await wait(AUTOSAVE_MS - 100);
		expect(mockSaveDraft).not.toHaveBeenCalled();
		await wait(200);
		expect(mockSaveDraft).toHaveBeenCalledTimes(1);
		expect(mockSaveDraft).toHaveBeenCalledWith('draft-1', 1, { code: 'ab' });
	});

	it('does not save when an edit puts the text back', async () => {
		const { result } = await loaded();
		act(() => result.current.setCode('changed'));
		act(() => result.current.setCode('definePlugin({});'));
		await wait(AUTOSAVE_MS * 2);
		expect(mockSaveDraft).not.toHaveBeenCalled();
		expect(result.current.saveState).toBe('saved');
	});

	it('saves the check summary and sample data too', async () => {
		mockSaveDraft.mockResolvedValue(draft({ revision: 2 }));
		const { result } = await loaded();
		act(() => {
			result.current.setCheckSummary({ passed: 4, total: 5 });
			result.current.setSample({ kind: 'counter', data: { count: 3 } });
		});
		await wait(AUTOSAVE_MS);
		expect(mockSaveDraft).toHaveBeenCalledWith('draft-1', 1, {
			checkSummary: { passed: 4, total: 5 },
			sample: { kind: 'counter', data: { count: 3 } },
		});
	});

	describe('when the draft changed somewhere else', () => {
		const newer = draft({ revision: 5, code: 'from the other tab' });
		const conflictError = () =>
			new DraftRequestError('changed', 409, 'DRAFT_REVISION_CONFLICT', newer);

		it('stops saving and offers the newer draft', async () => {
			mockSaveDraft.mockRejectedValue(conflictError());
			const { result } = await loaded();
			act(() => result.current.setCode('mine'));
			await wait(AUTOSAVE_MS);

			expect(result.current.conflict?.revision).toBe(5);
			await wait(AUTOSAVE_MS * 3);
			expect(mockSaveDraft).toHaveBeenCalledTimes(1);
			// Nothing of mine is thrown away while the choice is open.
			expect(result.current.code).toBe('mine');
		});

		it('"load newer" replaces my text with theirs and carries on from their revision', async () => {
			mockSaveDraft.mockRejectedValueOnce(conflictError());
			const { result } = await loaded();
			act(() => result.current.setCode('mine'));
			await wait(AUTOSAVE_MS);

			act(() => result.current.loadNewer());
			expect(result.current.code).toBe('from the other tab');
			expect(result.current.conflict).toBeNull();
			expect(result.current.saveState).toBe('saved');

			mockSaveDraft.mockResolvedValue(draft({ revision: 6 }));
			act(() => result.current.setCode('next'));
			await wait(AUTOSAVE_MS);
			expect(mockSaveDraft).toHaveBeenLastCalledWith('draft-1', 5, {
				code: 'next',
			});
		});

		it('"keep mine" saves my text over theirs on top of their revision', async () => {
			mockSaveDraft.mockRejectedValueOnce(conflictError());
			const { result } = await loaded();
			act(() => result.current.setCode('mine'));
			await wait(AUTOSAVE_MS);

			mockSaveDraft.mockResolvedValue(draft({ revision: 6, code: 'mine' }));
			act(() => result.current.keepMine());
			await wait(AUTOSAVE_MS);
			expect(mockSaveDraft).toHaveBeenLastCalledWith('draft-1', 5, {
				code: 'mine',
			});
			expect(result.current.conflict).toBeNull();
		});
	});

	it('shows a failed save and tries again later', async () => {
		mockSaveDraft.mockRejectedValueOnce(new DraftRequestError('boom', 500));
		const { result } = await loaded();
		act(() => result.current.setCode('x'));
		await wait(AUTOSAVE_MS);
		expect(result.current.saveState).toBe('error');

		mockSaveDraft.mockResolvedValue(draft({ revision: 2 }));
		await wait(6000);
		expect(result.current.saveState).toBe('saved');
		expect(mockSaveDraft).toHaveBeenCalledTimes(2);
	});

	describe('flush', () => {
		it('saves right away and says it worked', async () => {
			mockSaveDraft.mockResolvedValue(draft({ revision: 2 }));
			const { result } = await loaded();
			act(() => result.current.setCode('now'));
			let saved: boolean | undefined;
			await act(async () => {
				saved = await result.current.flush();
			});
			expect(saved).toBe(true);
			expect(mockSaveDraft).toHaveBeenCalledWith('draft-1', 1, { code: 'now' });
		});

		it('says it worked when there is nothing to save', async () => {
			const { result } = await loaded();
			let saved: boolean | undefined;
			await act(async () => {
				saved = await result.current.flush();
			});
			expect(saved).toBe(true);
			expect(mockSaveDraft).not.toHaveBeenCalled();
		});

		it('says it did not work when the save failed or the draft changed elsewhere', async () => {
			mockSaveDraft.mockRejectedValueOnce(new DraftRequestError('boom', 500));
			const { result } = await loaded();
			act(() => result.current.setCode('x'));
			let saved: boolean | undefined;
			await act(async () => {
				saved = await result.current.flush();
			});
			expect(saved).toBe(false);

			mockSaveDraft.mockRejectedValueOnce(
				new DraftRequestError(
					'changed',
					409,
					'DRAFT_REVISION_CONFLICT',
					draft({ revision: 5 })
				)
			);
			await act(async () => {
				saved = await result.current.flush();
			});
			expect(saved).toBe(false);
			expect(result.current.conflict?.revision).toBe(5);
		});

		it('waits for a save already running, then saves what was typed meanwhile', async () => {
			let release: (value: PluginDraft) => void = () => undefined;
			mockSaveDraft
				.mockImplementationOnce(
					() => new Promise<PluginDraft>((resolve) => (release = resolve))
				)
				.mockResolvedValue(draft({ revision: 3 }));
			const { result } = await loaded();
			act(() => result.current.setCode('first'));
			await wait(AUTOSAVE_MS); // the first save starts and hangs

			act(() => result.current.setCode('second'));
			let saved: boolean | undefined;
			const flushing = act(async () => {
				saved = await result.current.flush();
			});
			await act(async () => release(draft({ revision: 2 })));
			await flushing;

			expect(saved).toBe(true);
			expect(mockSaveDraft).toHaveBeenLastCalledWith('draft-1', 2, {
				code: 'second',
			});
		});
	});
});
