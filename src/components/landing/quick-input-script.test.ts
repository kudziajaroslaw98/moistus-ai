import {
	QUICK_INPUT_LINES,
	TOTAL_CHARACTERS,
	buildTypingFrames,
	deriveQuickInputState,
} from './quick-input-script';

describe('quick-input-script', () => {
	it('builds monotonic typing frames that end with everything typed', () => {
		const frames = buildTypingFrames();

		expect(frames[0]).toBe(0);
		expect(frames[frames.length - 1]).toBe(TOTAL_CHARACTERS);

		for (let index = 1; index < frames.length; index += 1) {
			expect(frames[index] - frames[index - 1]).toBeLessThanOrEqual(1);
			expect(frames[index]).toBeGreaterThanOrEqual(frames[index - 1]);
		}
	});

	it('starts empty with the caret on the first line', () => {
		const state = deriveQuickInputState(0, 0);

		expect(state.lines.every((line) => line === '')).toBe(true);
		expect(state.caretLine).toBe(0);
		expect(state.rows).toEqual([]);
		expect(state.hasTag).toBe(false);
		expect(state.hasDate).toBe(false);
		expect(state.total).toBe(1);
	});

	it('mirrors a task title into the preview once its prefix is typed', () => {
		const prefixOnly = deriveQuickInputState(4, 0);
		expect(prefixOnly.rows).toEqual([]);

		const partial = deriveQuickInputState(9, 0);
		expect(partial.lines[0]).toBe('[ ] Short');
		expect(partial.rows).toEqual([{ text: 'Short', done: false }]);
		expect(partial.caretLine).toBe(0);
	});

	it('moves the caret to the next line after a line is complete', () => {
		const state = deriveQuickInputState(QUICK_INPUT_LINES[0].length + 2, 0);

		expect(state.lines[0]).toBe(QUICK_INPUT_LINES[0]);
		expect(state.lines[1]).toBe('[ ');
		expect(state.caretLine).toBe(1);
	});

	it('reveals tag and date chips as the meta line completes', () => {
		const taskChars = QUICK_INPUT_LINES.slice(0, 4).reduce(
			(sum, line) => sum + line.length,
			0
		);

		expect(deriveQuickInputState(taskChars + 3, 0).hasTag).toBe(false);
		expect(deriveQuickInputState(taskChars + 7, 0)).toMatchObject({
			hasTag: true,
			hasDate: false,
		});
		expect(deriveQuickInputState(TOTAL_CHARACTERS, 0).hasDate).toBe(true);
	});

	it('ticks completed tasks in both the editor and the preview', () => {
		const state = deriveQuickInputState(TOTAL_CHARACTERS, 2);

		expect(state.lines[0]).toBe('[x] Shortlist venues');
		expect(state.lines[1]).toBe('[x] Draft invite copy');
		expect(state.lines[2]).toBe('[ ] Confirm date with team');
		expect(state.rows.map((row) => row.done)).toEqual([true, true, false, false]);
		expect(state.done).toBe(2);
		expect(state.total).toBe(4);
		expect(state.caretLine).toBe(4);
	});

	it('does not tick a task that is still being typed', () => {
		const state = deriveQuickInputState(9, 1);

		expect(state.lines[0]).toBe('[ ] Short');
		expect(state.done).toBe(1);
	});
});
