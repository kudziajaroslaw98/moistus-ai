import { diffChars, diffLines, diffWords, type Change } from 'diff';

/**
 * Represents a segment of text in a diff with its change type
 */
export interface DiffSegment {
	value: string;
	type: 'added' | 'removed' | 'unchanged';
}

/**
 * Configuration for diff computation
 */
interface DiffOptions {
	algorithm?: 'auto' | 'chars' | 'words' | 'lines';
	ignoreCase?: boolean;
	ignoreWhitespace?: boolean;
}

/**
 * Converts a diff Change object to our DiffSegment format
 */
function changeToDiffSegment(change: Change): DiffSegment {
	return {
		value: change.value,
		type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
	};
}

/**
 * Automatically selects the best diff algorithm based on content
 */
function selectAlgorithm(oldValue: string, newValue: string): 'chars' | 'words' | 'lines' {
	const maxLength = Math.max(oldValue.length, newValue.length);
	const hasMultipleLines = oldValue.includes('\n') || newValue.includes('\n');

	// Use line-based diff for multi-line content
	if (hasMultipleLines) {
		return 'lines';
	}

	// Use character-based diff for short strings (< 50 chars)
	if (maxLength < 50) {
		return 'chars';
	}

	// Use word-based diff for longer single-line strings
	return 'words';
}

/**
 * Computes a diff between two text strings and returns styled segments
 * @param oldValue The original text
 * @param newValue The new text
 * @param options Configuration options
 * @returns Array of diff segments
 */
export function computeTextDiff(
	oldValue: string,
	newValue: string,
	options: DiffOptions = {}
): DiffSegment[] {
	const { algorithm = 'auto', ignoreCase = false, ignoreWhitespace = false } = options;

	// Normalize values
	const old = String(oldValue || '');
	const new_ = String(newValue || '');

	// If values are identical, return single unchanged segment
	if (old === new_) {
		return [{ value: old, type: 'unchanged' }];
	}

	// Select appropriate diff algorithm
	const selectedAlgorithm = algorithm === 'auto' ? selectAlgorithm(old, new_) : algorithm;

	// Compute diff using selected algorithm
	let changes: Change[];
	const diffOptions = {
		ignoreCase,
		ignoreWhitespace,
	};

	switch (selectedAlgorithm) {
		case 'chars':
			changes = diffChars(old, new_, diffOptions);
			break;
		case 'words':
			changes = diffWords(old, new_, diffOptions);
			break;
		case 'lines':
			changes = diffLines(old, new_, diffOptions);
			break;
		default:
			changes = diffWords(old, new_, diffOptions);
	}

	// Convert to our format
	return changes.map(changeToDiffSegment);
}

/**
 * Checks if a diff has any actual changes (not just unchanged segments)
 */
export function hasDifferences(segments: DiffSegment[]): boolean {
	return segments.some((seg) => seg.type !== 'unchanged');
}

/**
 * Gets a simple summary of changes in a diff
 */
export function getDiffSummary(segments: DiffSegment[]): {
	additions: number;
	deletions: number;
	unchanged: number;
} {
	return segments.reduce(
		(acc, seg) => {
			if (seg.type === 'added') acc.additions += seg.value.length;
			else if (seg.type === 'removed') acc.deletions += seg.value.length;
			else acc.unchanged += seg.value.length;
			return acc;
		},
		{ additions: 0, deletions: 0, unchanged: 0 }
	);
}

/**
 * Simplifies a diff by merging consecutive segments of the same type
 * Useful for reducing render complexity
 */
export function simplifyDiff(segments: DiffSegment[]): DiffSegment[] {
	if (segments.length === 0) return [];

	const simplified: DiffSegment[] = [];
	let current = { ...segments[0] };

	for (let i = 1; i < segments.length; i++) {
		const seg = segments[i];

		// If same type, merge with current
		if (seg.type === current.type) {
			current.value += seg.value;
		} else {
			// Different type, push current and start new
			simplified.push(current);
			current = { ...seg };
		}
	}

	// Push last segment
	simplified.push(current);

	return simplified;
}

/**
 * Calculates the "change density" of a diff - what percentage of the output
 * consists of highlighted (added/removed) text vs unchanged text.
 *
 * High change density (>40%) makes inline diffs hard to read, suggesting
 * a before/after view would be clearer.
 *
 * @param segments The diff segments to analyze
 * @returns A number between 0 and 1 representing the proportion of changed text
 */
export function calculateChangeDensity(segments: DiffSegment[]): number {
	if (segments.length === 0) return 0;

	let totalChars = 0;
	let changedChars = 0;

	for (const seg of segments) {
		const length = seg.value.length;
		totalChars += length;

		if (seg.type === 'added' || seg.type === 'removed') {
			changedChars += length;
		}
	}

	if (totalChars === 0) return 0;

	return changedChars / totalChars;
}

/**
 * Determines if an inline diff would be readable or if a before/after
 * view would be clearer.
 *
 * Returns false (use before/after) when:
 * - Change density exceeds 40% (too much highlighting)
 * - Strings are very different in length (major rewrite)
 *
 * @param oldValue Original text
 * @param newValue New text
 * @param threshold Maximum acceptable change density (default 0.4)
 * @returns true if inline diff is recommended, false for before/after
 */
export function shouldUseInlineDiff(
	oldValue: string,
	newValue: string,
	threshold = 0.4
): boolean {
	// Compute diff to analyze change density
	const segments = computeTextDiff(oldValue, newValue);
	const density = calculateChangeDensity(segments);

	// If too much of the text is highlighted, use before/after
	if (density > threshold) {
		return false;
	}

	// Check for dramatic length differences (likely a rewrite)
	const oldLen = oldValue.length;
	const newLen = newValue.length;
	const maxLen = Math.max(oldLen, newLen);
	const minLen = Math.min(oldLen, newLen);

	// If one string is less than 50% the length of the other, it's likely a rewrite
	if (minLen < maxLen * 0.5) {
		return false;
	}

	return true;
}
