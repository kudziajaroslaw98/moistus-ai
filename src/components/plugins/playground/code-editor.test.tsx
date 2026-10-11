import { EditorView } from '@codemirror/view';
import { act, render } from '@testing-library/react';
import { CodeEditor } from './code-editor';

const editorView = (container: HTMLElement) =>
	EditorView.findFromDOM(
		container.querySelector('.cm-editor') as HTMLElement
	) as EditorView;

describe('CodeEditor', () => {
	it('shows a file read-only: colored and numbered, with nothing to type into or fix', () => {
		const { container } = render(
			<CodeEditor
				readOnly
				label='plugin.js'
				language='javascript'
				value={'definePlugin({});\nconst x = 1;'}
			/>
		);

		expect(container.querySelector('.cm-content')?.textContent).toContain(
			'definePlugin({});'
		);
		expect(container.querySelector('.cm-lineNumbers')).not.toBeNull();
		expect(editorView(container).state.readOnly).toBe(true);
		expect(
			container.querySelector('.cm-content')?.getAttribute('aria-readonly')
		).toBe('true');
		// No error markers or completion in a file you can't change.
		expect(container.querySelector('.cm-gutter-lint')).toBeNull();
	});

	it('shows the value and reports typing', () => {
		const onChange = jest.fn();
		const { container } = render(
			<CodeEditor
				label='plugin.js'
				language='javascript'
				onChange={onChange}
				value='definePlugin({});'
			/>
		);
		expect(container.querySelector('.cm-content')?.textContent).toContain(
			'definePlugin({});'
		);

		act(() => {
			editorView(container).dispatch({
				changes: { from: 0, insert: '// hi\n' },
			});
		});
		expect(onChange).toHaveBeenCalledWith('// hi\ndefinePlugin({});');
	});

	it('replaces the document when the value changes from outside', () => {
		const onChange = jest.fn();
		const { container, rerender } = render(
			<CodeEditor
				label='plugin.js'
				language='javascript'
				onChange={onChange}
				value='one'
			/>
		);
		rerender(
			<CodeEditor
				label='plugin.js'
				language='javascript'
				onChange={onChange}
				value='two'
			/>
		);
		expect(editorView(container).state.doc.toString()).toBe('two');
	});

	it('names itself for screen readers', () => {
		const { container } = render(
			<CodeEditor
				label='manifest.json'
				language='json'
				onChange={jest.fn()}
				value='{}'
			/>
		);
		expect(
			container.querySelector('.cm-content')?.getAttribute('aria-label')
		).toBe('manifest.json');
	});

	it('keeps a locked line as it is', () => {
		const onChange = jest.fn();
		const doc = '{\n  "id": "dev.x-1",\n  "name": "X"\n}';
		const { container } = render(
			<CodeEditor
				label='manifest.json'
				language='json'
				lockedLine={/^\s*"id":/}
				onChange={onChange}
				value={doc}
			/>
		);
		const at = doc.indexOf('dev.x-1');
		act(() => {
			editorView(container).dispatch({
				changes: { from: at, to: at + 3, insert: 'zzz' },
			});
		});
		expect(editorView(container).state.doc.toString()).toBe(doc);
	});
});
