'use client';

import {
	autocompletion,
	closeBrackets,
	closeBracketsKeymap,
	completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import {
	bracketMatching,
	indentOnInput,
	indentUnit,
} from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import { EditorState, type Extension } from '@codemirror/state';
import {
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';
import {
	javascriptSyntaxLinter,
	jsonSyntaxLinter,
	lockedLines,
	pluginCompletions,
	pluginEditorTheme,
	pluginHighlight,
} from './editor-extensions';

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	language: 'javascript' | 'json';
	/** Read out by screen readers when the editor is focused. */
	label: string;
	/** Lines matching this can't be edited (the manifest's id line). */
	lockedLine?: RegExp;
	className?: string;
}

function extensionsFor(
	language: CodeEditorProps['language'],
	label: string,
	lockedLine: RegExp | undefined,
	onDocChange: (doc: string) => void
): Extension[] {
	return [
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightActiveLine(),
		drawSelection(),
		history(),
		indentOnInput(),
		bracketMatching(),
		closeBrackets(),
		indentUnit.of('  '),
		EditorState.tabSize.of(2),
		keymap.of([
			...closeBracketsKeymap,
			...defaultKeymap,
			...historyKeymap,
			...completionKeymap,
		]),
		...(language === 'javascript'
			? [
					javascript(),
					autocompletion({ override: [pluginCompletions()] }),
					javascriptSyntaxLinter,
				]
			: [json(), jsonSyntaxLinter]),
		lintGutter(),
		pluginEditorTheme,
		pluginHighlight,
		...(lockedLine ? [lockedLines(lockedLine)] : []),
		EditorView.contentAttributes.of({
			'aria-label': label,
			'aria-multiline': 'true',
		}),
		EditorView.updateListener.of((update) => {
			if (update.docChanged) onDocChange(update.state.doc.toString());
		}),
	];
}

/**
 * A CodeMirror editor for one of the plugin's files. `value` is the source of truth:
 * typing calls `onChange`, and a different `value` from outside (loading a newer draft)
 * replaces the document.
 */
export function CodeEditor({
	value,
	onChange,
	language,
	label,
	lockedLine,
	className,
}: CodeEditorProps) {
	const container = useRef<HTMLDivElement>(null);
	const view = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const initialValue = useRef(value);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!container.current) return;
		const editor = new EditorView({
			parent: container.current,
			state: EditorState.create({
				doc: initialValue.current,
				extensions: extensionsFor(language, label, lockedLine, (doc) =>
					onChangeRef.current(doc)
				),
			}),
		});
		view.current = editor;
		return () => {
			editor.destroy();
			view.current = null;
		};
	}, [language, label, lockedLine]);

	useEffect(() => {
		const editor = view.current;
		if (!editor || editor.state.doc.toString() === value) return;
		editor.dispatch({
			changes: { from: 0, to: editor.state.doc.length, insert: value },
		});
	}, [value]);

	return <div className={className} ref={container} />;
}
