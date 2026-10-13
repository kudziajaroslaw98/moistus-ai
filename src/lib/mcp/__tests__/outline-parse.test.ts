import { McpToolError } from '../errors';
import { parseOutline } from '../format/outline-parse';

describe('parseOutline', () => {
	it('reads nesting, types, refs, literal lines and links', () => {
		const parsed = parseOutline(
			[
				'Dune',
				'  Paul Atreides &paul #character',
				'    $annotation type:warning How does Paul know?',
				'    | He has visions.',
				'  R&D notes',
				'---',
				'&paul -> [a1b2c3] : son of',
				'a1b2c3 -> &paul',
			].join('\n')
		);

		expect(parsed.nodes.map(({ line, parent, ref, trigger, text, body }) => ({ line, parent, ref, trigger, text, body }))).toEqual([
			{ line: 1, parent: null, ref: undefined, trigger: undefined, text: 'Dune', body: [] },
			{ line: 2, parent: 0, ref: 'paul', trigger: undefined, text: 'Paul Atreides #character', body: [] },
			{
				line: 3,
				parent: 1,
				ref: undefined,
				trigger: 'annotation',
				text: 'type:warning How does Paul know?',
				body: ['He has visions.'],
			},
			{ line: 5, parent: 0, ref: undefined, trigger: undefined, text: 'R&D notes', body: [] },
		]);
		expect(parsed.links).toEqual([
			{ line: 7, from: '&paul', to: 'a1b2c3', label: 'son of' },
			{ line: 8, from: 'a1b2c3', to: '&paul', label: undefined },
		]);
	});

	it('takes task rows and | lines both indented and at the same indent', () => {
		const parsed = parseOutline(
			['$task title:"Open questions"', '  [ ] Why does the Baron wait?', '[x] Who is the traitor', 'Note', '| literal #notatag'].join('\n')
		);
		expect(parsed.nodes[0].tasks).toEqual([
			{ text: 'Why does the Baron wait?', done: false },
			{ text: 'Who is the traitor', done: true },
		]);
		expect(parsed.nodes[1].body).toEqual(['literal #notatag']);
	});

	it('treats [id] lines as anchors and skips "… more below" lines from read output', () => {
		const parsed = parseOutline(['[a1b2c3] Paul Atreides', '  New child', '  … 4 more below (read_map root:a1b2c3)'].join('\n'));
		expect(parsed.nodes[0]).toMatchObject({ existingId: 'a1b2c3', text: '' });
		expect(parsed.nodes[1]).toMatchObject({ parent: 0, text: 'New child' });
		expect(parsed.nodes).toHaveLength(2);
	});

	it('reports every error with its line number', () => {
		const run = () =>
			parseOutline(['| orphan text', 'Note &a &b', '[ ] not under a task', '---', 'not a link'].join('\n'));
		expect(run).toThrow(McpToolError);
		expect(run).toThrow(/line 1: "\|" continues the node above it/);
		expect(run).toThrow(/line 2: one &ref per line/);
		expect(run).toThrow(/line 3: "\[ \]" rows belong under a \$task node/);
		expect(run).toThrow(/line 5: links look like/);
	});
});
