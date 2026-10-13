import {
	QUICK_INPUT_SCENARIOS,
	buildTypingFrames,
	deriveQuickInputState,
	getScenario,
	totalCharacters,
} from './quick-input-script';

const tasks = getScenario('tasks');
const question = getScenario('question');
const note = getScenario('note');

/** Cursor value that has typed the first `lineCount` lines completely. */
function cursorAfterLines(
	scenario: ReturnType<typeof getScenario>,
	lineCount: number
): number {
	return scenario.lines
		.slice(0, lineCount)
		.reduce((sum, line) => sum + line.length, 0);
}

describe('quick-input-script scenarios', () => {
	it('defines tasks, question and note in tab order', () => {
		expect(QUICK_INPUT_SCENARIOS.map((scenario) => scenario.id)).toEqual([
			'tasks',
			'question',
			'note',
		]);
	});

	it.each(QUICK_INPUT_SCENARIOS)(
		'builds monotonic typing frames for $id that end fully typed',
		(scenario) => {
			const frames = buildTypingFrames(scenario);

			expect(frames[0]).toBe(0);
			expect(frames[frames.length - 1]).toBe(totalCharacters(scenario));

			for (let index = 1; index < frames.length; index += 1) {
				expect(frames[index] - frames[index - 1]).toBeLessThanOrEqual(1);
				expect(frames[index]).toBeGreaterThanOrEqual(frames[index - 1]);
			}
		}
	);

	it.each(QUICK_INPUT_SCENARIOS)(
		'starts $id empty with the caret on the first line',
		(scenario) => {
			const state = deriveQuickInputState(scenario, 0, 0);

			expect(state.lines.every((line) => line === '')).toBe(true);
			expect(state.caretLine).toBe(0);
			expect(state.kind).toBe(scenario.previewKind);
		}
	);
});

describe('tasks scenario', () => {
	function tasksState(cursor: number, doneCount: number) {
		const state = deriveQuickInputState(tasks, cursor, doneCount);

		if (state.kind !== 'tasks') {
			throw new Error('expected a tasks state');
		}

		return state;
	}

	it('mirrors a task title into the preview once its prefix is typed', () => {
		expect(tasksState(4, 0).rows).toEqual([]);

		const partial = tasksState(9, 0);
		expect(partial.lines[0]).toBe('[ ] Short');
		expect(partial.rows).toEqual([{ text: 'Short', done: false }]);
		expect(partial.caretLine).toBe(0);
	});

	it('moves the caret to the next line after a line is complete', () => {
		const state = tasksState(tasks.lines[0].length + 2, 0);

		expect(state.lines[0]).toBe(tasks.lines[0]);
		expect(state.lines[1]).toBe('[ ');
		expect(state.caretLine).toBe(1);
	});

	it('reveals the tag and the relative date as the meta line completes', () => {
		const taskChars = cursorAfterLines(tasks, 4);

		expect(tasksState(taskChars + 3, 0).hasTag).toBe(false);
		expect(tasksState(taskChars + 7, 0)).toMatchObject({
			hasTag: true,
			hasDate: false,
		});
		expect(tasksState(totalCharacters(tasks), 0).hasDate).toBe(true);
	});

	it('uses a relative date so the preview chip never ages into Overdue', () => {
		expect(tasks.lines[4]).toContain('^tomorrow');
		expect(tasks.lines.join(' ')).not.toMatch(/\^\d{4}-/);
	});

	it('ticks completed tasks in both the editor and the preview', () => {
		const state = tasksState(totalCharacters(tasks), 2);

		expect(state.lines[0]).toBe('[x] Shortlist venues');
		expect(state.lines[1]).toBe('[x] Draft invite copy');
		expect(state.lines[2]).toBe('[ ] Confirm date with team');
		expect(state.rows.map((row) => row.done)).toEqual([
			true,
			true,
			false,
			false,
		]);
		expect(state.done).toBe(2);
		expect(state.total).toBe(4);
		expect(state.caretLine).toBe(4);
	});

	it('does not tick a task that is still being typed', () => {
		const state = tasksState(9, 1);

		expect(state.lines[0]).toBe('[ ] Short');
		expect(state.done).toBe(1);
	});
});

describe('question scenario', () => {
	function questionState(cursor: number) {
		const state = deriveQuickInputState(question, cursor, 0);

		if (state.kind !== 'question') {
			throw new Error('expected a question state');
		}

		return state;
	}

	it('mirrors the question text while it is typed', () => {
		expect(questionState(10).question).toBe(question.lines[0].slice(0, 10));
	});

	it('keeps options hidden until the closing bracket is typed', () => {
		const optionsLine = question.lines[1];
		const beforeClose = cursorAfterLines(question, 1) + optionsLine.indexOf(']');

		expect(questionState(beforeClose).options).toEqual([]);

		const afterClose = beforeClose + 1;
		expect(questionState(afterClose).options).toEqual([
			'Core friction',
			'Product decision',
			'Next action',
		]);
	});

	it('only uses option characters the real parser accepts', () => {
		const match = /options:\[([^\]]*)\]/.exec(question.lines[1]);

		expect(match?.[1]).toMatch(/^[A-Za-z0-9, ]+$/);
	});

	it('shows the tag chip once #research is complete', () => {
		const beforeTag = cursorAfterLines(question, 2);

		expect(questionState(beforeTag + 3).hasTag).toBe(false);
		expect(questionState(totalCharacters(question)).hasTag).toBe(true);
	});
});

describe('note scenario', () => {
	function noteState(cursor: number) {
		const state = deriveQuickInputState(note, cursor, 0);

		if (state.kind !== 'note') {
			throw new Error('expected a note state');
		}

		return state;
	}

	it('joins the wrapped lines into one paragraph for the preview', () => {
		const cursor = cursorAfterLines(note, note.lines.length - 1);

		expect(noteState(cursor).text).toBe(note.lines.slice(0, -1).join(' '));
	});

	it('reveals the tag and then the priority as the last line completes', () => {
		const beforeMeta = cursorAfterLines(note, note.lines.length - 1);

		expect(noteState(beforeMeta + 4)).toMatchObject({
			hasTag: false,
			hasPriority: false,
		});
		expect(noteState(beforeMeta + '#research'.length)).toMatchObject({
			hasTag: true,
			hasPriority: false,
		});
		expect(noteState(totalCharacters(note))).toMatchObject({
			hasTag: true,
			hasPriority: true,
		});
	});
});
