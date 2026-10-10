'use client';

import {
	DraftRequestError,
	fetchDraft,
	saveDraft,
} from '@/lib/plugins/drafts-client';
import type {
	PluginDraft,
	PluginDraftCheckSummary,
	PluginDraftSample,
} from '@/types/plugin-drafts';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long typing has to pause before the draft is saved. */
export const AUTOSAVE_MS = 1500;
/** After a failed save, when to try again. */
const RETRY_MS = 5000;

export type DraftSaveState = 'saved' | 'unsaved' | 'saving' | 'error';

/** The parts of a draft the editor changes. */
interface Editable {
	manifestText: string;
	code: string;
	sample: PluginDraftSample;
	checkSummary: PluginDraftCheckSummary | null;
}

const editableOf = (draft: PluginDraft): Editable => ({
	manifestText: draft.manifestText,
	code: draft.code,
	sample: draft.sample,
	checkSummary: draft.checkSummary,
});

/** What differs between `now` and what the server has, or null when nothing does. */
function changesSince(now: Editable, saved: Editable) {
	const patch: Partial<Editable> = {};
	if (now.manifestText !== saved.manifestText)
		patch.manifestText = now.manifestText;
	if (now.code !== saved.code) patch.code = now.code;
	if (JSON.stringify(now.sample) !== JSON.stringify(saved.sample)) {
		patch.sample = now.sample;
	}
	if (JSON.stringify(now.checkSummary) !== JSON.stringify(saved.checkSummary)) {
		patch.checkSummary = now.checkSummary;
	}
	return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * One draft in the playground: loads it, keeps the text the editor is changing, and saves
 * the changed parts shortly after typing pauses. Every save names the revision it started
 * from; if the draft moved on (another tab), saving stops and `conflict` holds the newer
 * draft until the person picks theirs or the newer one. Mount it with `key={draftId}`: it
 * loads once per mount.
 */
export function useDraft(draftId: string) {
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
		'loading'
	);
	const [error, setError] = useState<DraftRequestError | null>(null);
	const [draft, setDraft] = useState<PluginDraft | null>(null);
	const [local, setLocal] = useState<Editable | null>(null);
	const [saveState, setSaveState] = useState<DraftSaveState>('saved');
	const [conflict, setConflict] = useState<PluginDraft | null>(null);
	// Bumped when a save ends so the autosave effect looks again for unsaved changes.
	const [tick, setTick] = useState(0);

	const savedRef = useRef<Editable | null>(null);
	const revisionRef = useRef(1);
	const savingRef = useRef<Promise<void> | null>(null);
	const localRef = useRef<Editable | null>(null);
	useEffect(() => {
		localRef.current = local;
	}, [local]);

	useEffect(() => {
		let cancelled = false;
		fetchDraft(draftId)
			.then((loaded) => {
				if (cancelled) return;
				savedRef.current = editableOf(loaded);
				revisionRef.current = loaded.revision;
				setDraft(loaded);
				setLocal(editableOf(loaded));
				setSaveState('saved');
				setStatus('ready');
			})
			.catch((reason: unknown) => {
				if (cancelled) return;
				setError(
					reason instanceof DraftRequestError
						? reason
						: new DraftRequestError('Could not load the draft.', 0)
				);
				setStatus('error');
			});
		return () => {
			cancelled = true;
		};
	}, [draftId]);

	const save = useCallback((): Promise<void> => {
		if (savingRef.current) return savingRef.current;
		const now = localRef.current;
		const saved = savedRef.current;
		if (!now || !saved) return Promise.resolve();
		const patch = changesSince(now, saved);
		if (!patch) return Promise.resolve();

		setSaveState('saving');
		const running = saveDraft(draftId, revisionRef.current, patch)
			.then((next) => {
				// Merge what was sent, not the current text: typing may have moved on.
				savedRef.current = { ...(savedRef.current as Editable), ...patch };
				revisionRef.current = next.revision;
				setDraft(next);
				setSaveState('saved');
			})
			.catch((reason: unknown) => {
				if (
					reason instanceof DraftRequestError &&
					reason.isConflict &&
					reason.draft
				) {
					setConflict(reason.draft);
					setSaveState('unsaved');
					return;
				}
				setSaveState('error');
				setTimeout(() => setTick((value) => value + 1), RETRY_MS);
			})
			.finally(() => {
				savingRef.current = null;
				setTick((value) => value + 1);
			});
		savingRef.current = running;
		return running;
	}, [draftId]);

	useEffect(() => {
		if (status !== 'ready' || conflict || !local || !savedRef.current) return;
		if (savingRef.current) return;
		if (!changesSince(local, savedRef.current)) {
			setSaveState((current) => (current === 'error' ? current : 'saved'));
			return;
		}
		setSaveState((current) => (current === 'error' ? current : 'unsaved'));
		const timer = setTimeout(() => void save(), AUTOSAVE_MS);
		return () => clearTimeout(timer);
	}, [local, status, conflict, tick, save]);

	// Tell the browser before it throws away text that isn't saved yet.
	useEffect(() => {
		if (saveState === 'saved') return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [saveState]);

	const update = useCallback(
		<K extends keyof Editable>(key: K, value: Editable[K]) =>
			setLocal((current) => (current ? { ...current, [key]: value } : current)),
		[]
	);

	const loadNewer = useCallback(() => {
		if (!conflict) return;
		savedRef.current = editableOf(conflict);
		revisionRef.current = conflict.revision;
		setDraft(conflict);
		setLocal(editableOf(conflict));
		setConflict(null);
		setSaveState('saved');
	}, [conflict]);

	const keepMine = useCallback(() => {
		if (!conflict) return;
		// Compare against what the server has now, so every difference is saved over it.
		savedRef.current = editableOf(conflict);
		revisionRef.current = conflict.revision;
		setConflict(null);
	}, [conflict]);

	return {
		status,
		error,
		draft,
		manifestText: local?.manifestText ?? '',
		code: local?.code ?? '',
		sample: local?.sample ?? {},
		checkSummary: local?.checkSummary ?? null,
		setManifestText: useCallback(
			(text: string) => update('manifestText', text),
			[update]
		),
		setCode: useCallback((text: string) => update('code', text), [update]),
		setSample: useCallback(
			(sample: PluginDraftSample) => update('sample', sample),
			[update]
		),
		setCheckSummary: useCallback(
			(summary: PluginDraftCheckSummary | null) =>
				update('checkSummary', summary),
			[update]
		),
		saveState,
		conflict,
		loadNewer,
		keepMine,
		/** Saves now; resolves when the save ended (for submit and "Try on a map"). */
		flush: save,
	};
}
