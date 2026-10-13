import { isLiteralSafe, nodeLabel, nodeToOutlineText } from '../format/node-text';
import { makeNode } from '../__fixtures__/graph';

describe('nodeToOutlineText', () => {
	it('prints a plain note without a type and with universal tokens', () => {
		const node = makeNode('n', {
			content: 'Paul Atreides',
			metadata: { tags: ['character', 'has space'], priority: 'high', status: 'draft' },
		});
		expect(nodeToOutlineText(node)).toEqual({
			head: 'Paul Atreides #character !!! :draft',
			body: [],
			tasks: [],
		});
	});

	it('moves text that would parse as tokens into literal body lines', () => {
		const node = makeNode('n', { content: 'Fix issue #frontend today\nsecond line' });
		expect(nodeToOutlineText(node)).toEqual({
			head: '$note',
			body: ['Fix issue #frontend today', 'second line'],
			tasks: [],
		});
	});

	it('keeps code in the body and type tokens on the node line', () => {
		const node = makeNode('n', {
			node_type: 'codeNode',
			content: '#include <stdio.h>\nint main() {}',
			metadata: { language: 'c', fileName: 'main.c', showLineNumbers: true },
		});
		expect(nodeToOutlineText(node)).toEqual({
			head: '$code lang:c file:main.c lines:on',
			body: ['#include <stdio.h>', 'int main() {}'],
			tasks: [],
		});
	});

	it('prints task rows and a quoted title', () => {
		const node = makeNode('n', {
			node_type: 'taskNode',
			content: null,
			metadata: {
				title: 'Open "questions"',
				tasks: [
					{ id: '1', text: 'Why does the Baron wait?', isComplete: false },
					{ id: '2', text: 'Who is the traitor', isComplete: true },
				],
			},
		});
		expect(nodeToOutlineText(node)).toEqual({
			head: "$task title:\"Open 'questions'\"",
			body: [],
			tasks: [
				{ text: 'Why does the Baron wait?', done: false },
				{ text: 'Who is the traitor', done: true },
			],
		});
	});

	it('summarizes plugin nodes without their data', () => {
		const node = makeNode('n', {
			node_type: 'extensionNode',
			metadata: {
				extension: {
					pluginId: 'shiko.threads',
					kind: 'threads',
					kindLabel: 'Threads',
					version: '0.1.0',
					data: { secret: 'x' },
				},
			},
		});
		expect(nodeToOutlineText(node).head).toBe('$plugin shiko.threads "Threads"');
	});

	it('prints annotation and question tokens the parser understands', () => {
		const annotation = makeNode('a', {
			node_type: 'annotationNode',
			content: 'How does Paul know',
			metadata: { annotationType: 'warning' },
		});
		const question = makeNode('q', {
			node_type: 'questionNode',
			content: 'Pick one',
			metadata: {
				questionType: 'multiple',
				responseFormat: {
					allowMultiple: false,
					options: [
						{ id: '1', label: 'Red' },
						{ id: '2', label: 'Blue' },
					],
				},
			},
		});
		expect(nodeToOutlineText(annotation).head).toBe('$annotation How does Paul know type:warning');
		expect(nodeToOutlineText(question).head).toBe(
			'$question Pick one question:multiple options:[Red,Blue] multiple:false'
		);
	});
});

describe('isLiteralSafe', () => {
	it('rejects outline markers and token-like text', () => {
		expect(isLiteralSafe('Plain words, even 10:30 and C# here')).toBe(true);
		expect(isLiteralSafe('[ ] not a node')).toBe(false);
		expect(isLiteralSafe('$task not a type')).toBe(false);
		expect(isLiteralSafe('mail @paul')).toBe(false);
		expect(isLiteralSafe('due ^tomorrow')).toBe(false);
	});
});

describe('nodeLabel', () => {
	it('prefers the title, then the first line', () => {
		expect(nodeLabel(makeNode('n', { content: 'a\nb', metadata: { title: 'T' } }))).toBe('T');
		expect(nodeLabel(makeNode('n', { content: 'first\nsecond' }))).toBe('first');
	});
});
