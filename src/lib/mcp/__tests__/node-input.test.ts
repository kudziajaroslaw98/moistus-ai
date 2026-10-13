import { McpToolError } from '../errors';
import { buildNodeFields, mergeMetadataForUpdate, resolveCreatableType } from '../format/node-input';

describe('resolveCreatableType', () => {
	it('maps triggers and refuses types agents may not create', () => {
		expect(resolveCreatableType('task')).toBe('taskNode');
		expect(resolveCreatableType('$link')).toBe('resourceNode');
		expect(() => resolveCreatableType('plugin')).toThrow(/can't be created by AI apps/);
		expect(() => resolveCreatableType('ghost')).toThrow(/Unknown node type/);
	});
});

describe('buildNodeFields', () => {
	it('parses tokens like the app does', () => {
		const fields = buildNodeFields('defaultNode', 'Paul Atreides #character !!! :draft', [], []);
		expect(fields.content).toBe('Paul Atreides');
		expect(fields.metadata).toMatchObject({ tags: ['character'], priority: 'high', status: 'draft' });
		expect(fields.controlledKeys).toEqual(expect.arrayContaining(['tags', 'priority', 'status', 'dueDate']));
	});

	it('keeps | lines literal and puts task rows in metadata', () => {
		expect(buildNodeFields('defaultNode', 'Title', ['#not-a-tag', '@nobody'], []).content).toBe('Title\n#not-a-tag\n@nobody');

		const task = buildNodeFields('taskNode', 'title:"Open"', [], [
			{ text: 'First', done: false },
			{ text: 'Second', done: true },
		]);
		expect(task.metadata.title).toBe('Open');
		expect(task.metadata.tasks).toEqual([
			{ id: expect.stringMatching(/^task-/), text: 'First', isComplete: false },
			{ id: expect.stringMatching(/^task-/), text: 'Second', isComplete: true },
		]);
	});

	it('keeps code in the body and reads lang/file tokens from the line', () => {
		const code = buildNodeFields('codeNode', 'lang:ts file:a.ts', ['const a = 1; // #1', 'export {}'], []);
		expect(code.content).toBe('const a = 1; // #1\nexport {}');
		expect(code.metadata).toMatchObject({ language: 'ts', fileName: 'a.ts' });
	});

	it('requires URLs for images and links', () => {
		expect(() => buildNodeFields('imageNode', 'a picture', [], [])).toThrow(McpToolError);
		expect(buildNodeFields('imageNode', 'https://x.test/a.png', [], []).metadata.imageUrl).toBe('https://x.test/a.png');
		expect(() => buildNodeFields('resourceNode', 'no url here', [], [])).toThrow(/url:https/);
	});

	it('refuses node text over the limit', () => {
		expect(() => buildNodeFields('defaultNode', 'x', ['y'.repeat(10_001)], [])).toThrow(/limit is 10000/);
	});
});

describe('mergeMetadataForUpdate', () => {
	it('replaces and clears text-controlled keys but keeps what people set in the app', () => {
		const previous = {
			tags: ['old'],
			priority: 'high',
			answer: 'Yes, in chapter 3',
			isCollapsed: true,
			anchorNodeId: 'host',
			custom: 'kept',
		};
		const fields = buildNodeFields('questionNode', 'Is it him? #new', [], []);
		expect(mergeMetadataForUpdate(previous, fields)).toEqual({
			tags: ['new'],
			answer: 'Yes, in chapter 3',
			isCollapsed: true,
			anchorNodeId: 'host',
			custom: 'kept',
			questionType: undefined,
			responseFormat: { options: [], allowMultiple: undefined },
			responses: [],
		});
	});
});
