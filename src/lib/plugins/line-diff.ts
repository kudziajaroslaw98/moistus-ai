/** One line of a unified diff: unchanged, added or removed. */
export interface DiffLine {
	type: 'same' | 'add' | 'remove';
	text: string;
}

/** A run of changes with a little context, as review tools show them. */
export interface DiffHunk {
	lines: DiffLine[];
}

/** Bigger files aren't diffed line by line (the table would be too large). */
export const MAX_DIFF_LINES = 2000;

/**
 * Line diff for the reviewer's "Code changes since <version>": longest common
 * subsequence over lines, then hunks with `context` unchanged lines around each change.
 * Returns null when either side is over MAX_DIFF_LINES.
 */
export function diffLines(before: string, after: string, context = 3): DiffHunk[] | null {
	const a = before.split('\n');
	const b = after.split('\n');
	if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) return null;

	// lengths[i][j]: LCS length of a[i..] and b[j..], in one flat array.
	const width = b.length + 1;
	const lengths = new Uint16Array((a.length + 1) * width);
	for (let i = a.length - 1; i >= 0; i -= 1) {
		for (let j = b.length - 1; j >= 0; j -= 1) {
			lengths[i * width + j] =
				a[i] === b[j]
					? lengths[(i + 1) * width + j + 1] + 1
					: Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
		}
	}

	const lines: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			lines.push({ type: 'same', text: a[i] });
			i += 1;
			j += 1;
		} else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
			lines.push({ type: 'remove', text: a[i] });
			i += 1;
		} else {
			lines.push({ type: 'add', text: b[j] });
			j += 1;
		}
	}
	while (i < a.length) lines.push({ type: 'remove', text: a[i++] });
	while (j < b.length) lines.push({ type: 'add', text: b[j++] });

	// Keep changes plus `context` lines around them; merge hunks that touch.
	const keep = lines.map(() => false);
	lines.forEach((line, index) => {
		if (line.type === 'same') return;
		for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k += 1) {
			keep[k] = true;
		}
	});
	const hunks: DiffHunk[] = [];
	let current: DiffLine[] | null = null;
	lines.forEach((line, index) => {
		if (keep[index]) {
			if (!current) {
				current = [];
				hunks.push({ lines: current });
			}
			current.push(line);
		} else {
			current = null;
		}
	});
	return hunks;
}
