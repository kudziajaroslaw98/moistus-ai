import { diffLines, MAX_DIFF_LINES } from './line-diff';

describe('diffLines', () => {
	it('shows added and removed lines with context, in order', () => {
		const before = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].join('\n');
		const after = ['a', 'b', 'c', 'd', 'E', 'f', 'g', 'h', 'i', 'j'].join('\n');

		expect(diffLines(before, after, 1)).toEqual([
			{
				lines: [
					{ type: 'same', text: 'd' },
					{ type: 'remove', text: 'e' },
					{ type: 'add', text: 'E' },
					{ type: 'same', text: 'f' },
				],
			},
			{ lines: [{ type: 'same', text: 'i' }, { type: 'add', text: 'j' }] },
		]);
	});

	it('has no hunks when nothing changed, and gives up on huge files', () => {
		expect(diffLines('same\ntext', 'same\ntext')).toEqual([]);
		expect(diffLines('x\n'.repeat(MAX_DIFF_LINES + 1), 'y')).toBeNull();
	});
});
