import { McpToolError } from '../errors';

/**
 * Parses the outline format agents write (the same one read_map prints):
 *
 *   Paul Atreides &paul #character        node; &paul names it for this call
 *     $annotation type:warning Plot hole  child (2 spaces deeper)
 *     | more text                         literal content of the line above
 *   $task title:"Open questions"
 *     [ ] Why does the Baron wait?        task row of the $task above
 *   [a1b2c3] Existing node                existing node: an anchor for new children
 *     New child under it
 *   ---
 *   &paul -> a1b2c3 : son of              link
 */

export interface OutlineNodeLine {
	line: number;
	/** Index of the parent line in `nodes`, or null at the top level. */
	parent: number | null;
	/** `[a1b2c3]` lines point at an existing node; their text is ignored. */
	existingId?: string;
	ref?: string;
	/** Type trigger without `$`, lowercased (e.g. "task"). */
	trigger?: string;
	text: string;
	body: string[];
	tasks: { text: string; done: boolean }[];
}

export interface OutlineLinkLine {
	line: number;
	from: string;
	to: string;
	label?: string;
}

export interface ParsedOutline {
	nodes: OutlineNodeLine[];
	links: OutlineLinkLine[];
}

const MAX_REPORTED_ERRORS = 10;
const ID_LINE = /^\[([0-9a-fA-F][0-9a-fA-F-]{5,35})\](.*)$/;
const TASK_ROW = /^\[([ xX]?)\](?:\s+(.*))?$/;
const TRIGGER = /^\$([a-zA-Z]+)(?=\s|$)\s*/;
const REF = /(?:^|\s)&([A-Za-z][\w-]*)(?=\s|$)/g;
const LINK = /^(\S+)\s*->\s*(\S+)\s*(?::\s*(.*))?$/;

function measureIndent(raw: string): { indent: number; content: string } {
	const match = raw.match(/^[\t ]*/)?.[0] ?? '';
	const indent = [...match].reduce((sum, char) => sum + (char === '\t' ? 2 : 1), 0);
	return { indent, content: raw.slice(match.length).trimEnd() };
}

/** Strips the `[...]` read output puts around ids, so links can be copied as-is. */
const linkEnd = (token: string) => token.replace(/^\[(.*)\]$/, '$1');

export function parseOutline(text: string): ParsedOutline {
	const nodes: OutlineNodeLine[] = [];
	const links: OutlineLinkLine[] = [];
	const errors: string[] = [];
	const stack: { indent: number; index: number }[] = [];
	let inLinks = false;

	const fail = (line: number, message: string) => errors.push(`line ${line}: ${message}`);

	/**
	 * The node a `|` or `[ ]` line belongs to: the latest node at or above its
	 * indent, so both "indented under the node" and "same indent" work.
	 */
	const ownerOf = (indent: number): OutlineNodeLine | null => {
		for (let i = stack.length - 1; i >= 0; i--) {
			if (stack[i].indent <= indent) return nodes[stack[i].index];
		}
		return null;
	};

	text.replace(/\r\n?/g, '\n').split('\n').forEach((raw, index) => {
		const line = index + 1;
		if (!raw.trim()) return;
		const { indent, content } = measureIndent(raw);

		if (content === '---') {
			inLinks = true;
			return;
		}

		if (inLinks) {
			const match = content.match(LINK);
			if (!match) {
				fail(line, `links look like "a1b2c3 -> &paul : label", got "${content}"`);
				return;
			}
			links.push({
				line,
				from: linkEnd(match[1]),
				to: linkEnd(match[2]),
				label: match[3]?.trim() || undefined,
			});
			return;
		}

		// "… 12 more below" lines copied from read_map output.
		if (content.startsWith('…')) return;

		if (content.startsWith('|')) {
			const owner = ownerOf(indent);
			if (!owner) fail(line, '"|" continues the node above it, but there is none');
			else if (owner.existingId) fail(line, '"|" can\'t add text to an existing node; use an update op');
			else owner.body.push(content.slice(1).replace(/^ /, ''));
			return;
		}

		const taskRow = content.match(TASK_ROW);
		if (taskRow) {
			const owner = ownerOf(indent);
			if (!owner || owner.trigger !== 'task') {
				fail(line, '"[ ]" rows belong under a $task node');
				return;
			}
			const taskText = taskRow[2]?.trim();
			if (taskText) owner.tasks.push({ text: taskText, done: taskRow[1].toLowerCase() === 'x' });
			return;
		}

		while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
		const parent = stack.length > 0 ? stack[stack.length - 1].index : null;
		const node: OutlineNodeLine = { line, parent, text: '', body: [], tasks: [] };

		const idLine = content.match(ID_LINE);
		let rest = idLine ? idLine[2] : content;
		if (idLine) node.existingId = idLine[1];

		const refs = [...rest.matchAll(REF)].map((match) => match[1]);
		if (refs.length > 1) fail(line, `one &ref per line, found ${refs.map((ref) => `&${ref}`).join(' ')}`);
		if (refs.length > 0) {
			node.ref = refs[0];
			rest = rest.replace(REF, ' ');
		}

		if (!idLine) {
			const trigger = rest.trimStart().match(TRIGGER);
			if (trigger) {
				node.trigger = trigger[1].toLowerCase();
				rest = rest.trimStart().slice(trigger[0].length);
			}
			node.text = rest.replace(/\s+/g, ' ').trim();
		}

		nodes.push(node);
		stack.push({ indent, index: nodes.length - 1 });
	});

	if (errors.length > 0) {
		const shown = errors.slice(0, MAX_REPORTED_ERRORS);
		const more = errors.length > shown.length ? `\n(+${errors.length - shown.length} more)` : '';
		throw new McpToolError(`outline has errors:\n${shown.join('\n')}${more}`);
	}
	return { nodes, links };
}
