/**
 * Pre-baked script for the landing "Capture" demo.
 *
 * Everything is derived from a single typing cursor (characters typed so far)
 * plus a count of ticked tasks, so the UI can animate continuously instead of
 * swapping between whole states. Nothing here parses user input, which keeps the
 * real quick-input parser and CodeMirror out of the landing bundle.
 */

export const QUICK_INPUT_LINES = [
	'[ ] Shortlist venues',
	'[ ] Draft invite copy',
	'[ ] Confirm date with team',
	'[ ] Book a photographer',
	'#launch ^2026-03-12',
] as const;

export const TASK_LINE_COUNT = 4;
/** Length of the "[ ] " prefix that precedes each task title. */
export const TASK_PREFIX_LENGTH = 4;
export const TYPE_STEP_MS = 24;
/** Frames the cursor rests at the end of a line (about 215ms). */
const LINE_PAUSE_FRAMES = 9;

const TAG_COMPLETE_LENGTH = '#launch'.length;

export const TOTAL_CHARACTERS = QUICK_INPUT_LINES.reduce(
	(sum, line) => sum + line.length,
	0
);

/** One entry per animation frame: how many characters are typed. */
export function buildTypingFrames(): number[] {
	const frames: number[] = [0];
	let cursor = 0;

	for (const line of QUICK_INPUT_LINES) {
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

export interface QuickInputState {
	lines: string[];
	caretLine: number;
	rows: QuickInputRow[];
	hasTag: boolean;
	hasDate: boolean;
	done: number;
	total: number;
}

export function deriveQuickInputState(
	cursor: number,
	doneCount: number
): QuickInputState {
	let remaining = Math.max(0, Math.min(cursor, TOTAL_CHARACTERS));

	const lines = QUICK_INPUT_LINES.map((full, index) => {
		const typed = full.slice(0, Math.min(remaining, full.length));
		remaining -= typed.length;

		const isTaskLine = index < TASK_LINE_COUNT;
		const isComplete = typed.length === full.length;

		return isTaskLine && isComplete && index < doneCount
			? `[x]${typed.slice(3)}`
			: typed;
	});

	const rows: QuickInputRow[] = [];

	for (let index = 0; index < TASK_LINE_COUNT; index += 1) {
		const typed = lines[index];

		if (typed.length > TASK_PREFIX_LENGTH) {
			rows.push({
				text: typed.slice(TASK_PREFIX_LENGTH),
				done: index < doneCount,
			});
		}
	}

	const firstIncomplete = QUICK_INPUT_LINES.findIndex(
		(full, index) => lines[index].length < full.length
	);
	const metaLine = lines[TASK_LINE_COUNT];

	return {
		lines,
		caretLine: firstIncomplete === -1 ? QUICK_INPUT_LINES.length - 1 : firstIncomplete,
		rows,
		hasTag: metaLine.length >= TAG_COMPLETE_LENGTH,
		hasDate: metaLine.length === QUICK_INPUT_LINES[TASK_LINE_COUNT].length,
		done: Math.min(doneCount, rows.length),
		total: Math.max(rows.length, 1),
	};
}
