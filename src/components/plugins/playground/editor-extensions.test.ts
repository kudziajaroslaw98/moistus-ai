/**
 * @jest-environment node
 */
import { CompletionContext } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { lockedLines, pluginCompletions } from './editor-extensions';

const manifest = [
	'{',
	'  "id": "dev.counter-9b2c41a7",',
	'  "name": "Counter",',
	'  "version": "0.1.0"',
	'}',
].join('\n');

const ID_LINE = /^\s*"id":/;

function stateWith(doc: string) {
	return EditorState.create({ doc, extensions: [lockedLines(ID_LINE)] });
}

describe('lockedLines', () => {
	it('keeps the id line as it is when someone edits inside it', () => {
		const state = stateWith(manifest);
		const from = manifest.indexOf('dev.counter');
		const next = state.update({
			changes: { from, to: from + 11, insert: 'other' },
		}).state;
		expect(next.doc.toString()).toBe(manifest);
	});

	it('keeps it when a selection covering several lines is deleted or replaced', () => {
		const state = stateWith(manifest);
		const next = state.update({
			changes: { from: 0, to: manifest.length, insert: '{}' },
		}).state;
		// The id line survives: the change that touches it is dropped.
		expect(next.doc.toString()).toContain('"id": "dev.counter-9b2c41a7"');
	});

	it('lets a change that skips the filters replace everything, like loading a newer draft', () => {
		const state = stateWith(manifest);
		const newer = manifest.replace('Counter', 'Tally');
		const next = state.update({
			changes: { from: 0, to: manifest.length, insert: newer },
			filter: false,
		}).state;
		expect(next.doc.toString()).toBe(newer);
	});

	it('lets every other line be edited', () => {
		const state = stateWith(manifest);
		const from = manifest.indexOf('Counter"');
		const next = state.update({
			changes: { from, to: from + 7, insert: 'Tally' },
		}).state;
		expect(next.doc.toString()).toContain('"name": "Tally"');
		expect(next.doc.toString()).toContain('"id": "dev.counter-9b2c41a7"');
	});

	it('lets a new line be started below the id line', () => {
		const state = stateWith(manifest);
		const at = manifest.indexOf('  "name"');
		const next = state.update({
			changes: { from: at, insert: '  "icon": "timer",\n' },
		}).state;
		expect(next.doc.toString()).toContain('"icon": "timer"');
	});

	it('does nothing to documents without a matching line', () => {
		const state = EditorState.create({
			doc: 'hello',
			extensions: [lockedLines(ID_LINE)],
		});
		expect(
			state
				.update({ changes: { from: 0, to: 5, insert: 'bye' } })
				.state.doc.toString()
		).toBe('bye');
	});
});

describe('pluginCompletions', () => {
	async function labelsAt(doc: string, explicit = false) {
		const state = EditorState.create({ doc, extensions: [javascript()] });
		const context = new CompletionContext(state, doc.length, explicit);
		const result = await pluginCompletions()(context);
		return result?.options.map((option) => option.label) ?? null;
	}

	it('suggests the ui calls after "ui."', async () => {
		const labels = await labelsAt('const x = ui.');
		expect(labels).toEqual(
			expect.arrayContaining([
				'ui.stack',
				'ui.row',
				'ui.text',
				'ui.button',
				'ui.progress',
			])
		);
	});

	it('suggests ctx members after "ctx."', async () => {
		const labels = await labelsAt('if (ctx.');
		expect(labels).toEqual(
			expect.arrayContaining([
				'ctx.canEdit',
				'ctx.today',
				'ctx.branch',
				'ctx.request',
			])
		);
	});

	it('suggests the plugin entry points while typing a word', async () => {
		const labels = await labelsAt('defi');
		expect(labels).toContain('definePlugin');
	});

	it('stays quiet where nothing applies', async () => {
		expect(await labelsAt('const total = 1 + ')).toBeNull();
	});
});
