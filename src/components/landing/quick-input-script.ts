/**
 * Pre-baked scripts for the landing "Capture" demo.
 *
 * Every scenario is a few lines of real quick-input syntax. All animation state is
 * derived from a single typing cursor (characters typed so far) plus, for tasks, a
 * count of ticked rows, so the UI animates continuously instead of swapping states.
 * Nothing here parses user input, which keeps the real quick-input parser and
 * CodeMirror out of the landing bundle.
 *
 * Syntax notes (from the real parser): newlines collapse into spaces, so line
 * breaks are cosmetic; question options may only contain letters, digits, commas
 * and spaces; dates are relative (`^tomorrow`) so the preview chip never ages into
 * "Overdue".
 */

export type PreviewKind = 'tasks' | 'question' | 'note';

export interface QuickInputScenario {
	id: PreviewKind;
	tabLabel: string;
	/** Label the editor header shows for this node type. */
	headerLabel: string;
	previewKind: PreviewKind;
	lines: readonly string[];
}

export const QUICK_INPUT_SCENARIOS: readonly QuickInputScenario[] = [
	{
		id: 'tasks',
		tabLabel: 'Tasks',
		headerLabel: 'Task List',
		previewKind: 'tasks',
		lines: [
			'[ ] Shortlist venues',
			'[ ] Draft invite copy',
			'[ ] Confirm date with team',
			'[ ] Book a photographer',
			'#launch ^tomorrow',
		],
	},
	{
		id: 'question',
		tabLabel: 'Question',
		headerLabel: 'Question',
		previewKind: 'question',
		lines: [
			'What should we lock first?',
			'question:multiple options:[Core friction, Product decision, Next action]',
			'#research',
		],
	},
	{
		id: 'note',
		tabLabel: 'Note',
		headerLabel: 'Note',
		previewKind: 'note',
		lines: [
			'In the interview, the user hesitated',
			'during setup and never felt sure what',
			'to do next.',
			'#research !high',
		],
	},
];

export const TYPE_STEP_MS = 24;
/** Frames the cursor rests at the end of a line (about 215ms). */
const LINE_PAUSE_FRAMES = 9;
/** "[ ] " prefix that precedes each task title. */
const TASK_PREFIX_LENGTH = 4;
const TAG_COMPLETE_LENGTH = '#launch'.length;

export function getScenario(id: PreviewKind): QuickInputScenario {
	const scenario = QUICK_INPUT_SCENARIOS.find((item) => item.id === id);

	if (!scenario) {
		throw new Error(`Unknown quick-input scenario: ${id}`);
	}

	return scenario;
}

export function totalCharacters(scenario: QuickInputScenario): number {
	return scenario.lines.reduce((sum, line) => sum + line.length, 0);
}

/** One entry per animation frame: how many characters are typed. */
export function buildTypingFrames(scenario: QuickInputScenario): number[] {
	const frames: number[] = [0];
	let cursor = 0;

	for (const line of scenario.lines) {
		for (let index = 0; index < line.length; index += 1) {
			cursor += 1;
			frames.push(cursor);
		}

		for (let pause = 0; pause < LINE_PAUSE_FRAMES; pause += 1) {
			frames.push(cursor);
		}
	}

	return frames;
}

export interface QuickInputRow {
	text: string;
	done: boolean;
}

interface BaseState {
	lines: string[];
	caretLine: number;
}

export interface TasksState extends BaseState {
	kind: 'tasks';
	rows: QuickInputRow[];
	hasTag: boolean;
	hasDate: boolean;
	done: number;
	total: number;
}

export interface QuestionState extends BaseState {
	kind: 'question';
	question: string;
	options: string[];
	hasTag: boolean;
}

export interface NoteState extends BaseState {
	kind: 'note';
	text: string;
	hasPriority: boolean;
	hasTag: boolean;
}

export type QuickInputState = TasksState | QuestionState | NoteState;

function typeLines(scenario: QuickInputScenario, cursor: number): string[] {
	let remaining = Math.max(0, Math.min(cursor, totalCharacters(scenario)));

	return scenario.lines.map((full) => {
		const typed = full.slice(0, Math.min(remaining, full.length));
		remaining -= typed.length;

		return typed;
	});
}

function findCaretLine(scenario: QuickInputScenario, typed: string[]): number {
	const firstIncomplete = scenario.lines.findIndex(
		(full, index) => typed[index].length < full.length
	);

	return firstIncomplete === -1 ? scenario.lines.length - 1 : firstIncomplete;
}

function deriveTasks(
	scenario: QuickInputScenario,
	typed: string[],
	doneCount: number
): TasksState {
	const taskLineCount = scenario.lines.length - 1;
	const lines = typed.map((line, index) => {
		const isComplete = line.length === scenario.lines[index].length;

		return index < taskLineCount && isComplete && index < doneCount
			? `[x]${line.slice(3)}`
			: line;
	});

	const rows: QuickInputRow[] = [];

	for (let index = 0; index < taskLineCount; index += 1) {
		if (lines[index].length > TASK_PREFIX_LENGTH) {
			rows.push({
				text: lines[index].slice(TASK_PREFIX_LENGTH),
				done: index < doneCount,
			});
		}
	}

	const metaLine = lines[taskLineCount];

	return {
		kind: 'tasks',
		lines,
		caretLine: findCaretLine(scenario, typed),
		rows,
		hasTag: metaLine.length >= TAG_COMPLETE_LENGTH,
		hasDate: metaLine.length === scenario.lines[taskLineCount].length,
		done: Math.min(doneCount, rows.length),
		total: Math.max(rows.length, 1),
	};
}

function deriveQuestion(
	scenario: QuickInputScenario,
	typed: string[]
): QuestionState {
	const optionsMatch = /options:\[([^\]]*)\]/.exec(typed[1]);
	const options = optionsMatch
		? optionsMatch[1]
				.split(',')
				.map((option) => option.trim())
				.filter((option) => option.length > 0)
		: [];

	return {
		kind: 'question',
		lines: typed,
		caretLine: findCaretLine(scenario, typed),
		question: typed[0],
		options,
		hasTag: typed[2].length === scenario.lines[2].length,
	};
}

function deriveNote(scenario: QuickInputScenario, typed: string[]): NoteState {
	const tagToken = '#research';
	// The last line holds the tokens; every line before it is the wrapped paragraph.
	const metaIndex = scenario.lines.length - 1;

	return {
		kind: 'note',
		lines: typed,
		caretLine: findCaretLine(scenario, typed),
		text: typed
			.slice(0, metaIndex)
			.filter((line) => line.length > 0)
			.join(' '),
		hasTag: typed[metaIndex].length >= tagToken.length,
		hasPriority: typed[metaIndex].length === scenario.lines[metaIndex].length,
	};
}

export function deriveQuickInputState(
	scenario: QuickInputScenario,
	cursor: number,
	doneCount: number
): QuickInputState {
	const typed = typeLines(scenario, cursor);

	switch (scenario.previewKind) {
		case 'tasks':
			return deriveTasks(scenario, typed, doneCount);
		case 'question':
			return deriveQuestion(scenario, typed);
		case 'note':
			return deriveNote(scenario, typed);
	}
}
