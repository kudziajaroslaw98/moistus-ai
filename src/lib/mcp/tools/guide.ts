import { z } from 'zod';
import { defineMcpTool } from '../tool-types';

export const GUIDE_TOPICS = {
	syntax: `Shiko outline format. read_map prints it.
One line per node; 2 spaces of indent = child of the line above.
  [a1b2c3] $type text tokens   existing node: [short id], optional $type (none = note)
    | literal text             more content of the node above; never parsed for tokens
    [ ] open task / [x] done   checklist rows of a $task node
    … 12 more below (read_map root:a1b2c3)   a branch that was cut
---                            links section
a1b2c3 -> d4e5f6 : label       link between two nodes (indent already implies parent -> child)
Tokens on a node line: #tag  @person  ^2026-12-31 (due)  ! / !! / !!! (low/medium/high) or !critical  :status  title:"Title"
Type-specific tokens: guide {topic:"node-types"}.`,

	'node-types': `$note (default)  idea or entity; text plus universal tokens
$text        styled text: size:24px weight:bold style:italic align:center color:#hex
$task        checklist: [ ] / [x] rows under it; title:"…"
$question    question:binary|multiple options:[A,B,C] multiple:true|false
$annotation  callout: type:note|idea|quote|summary|warning|success|info|error
$code        code goes in | lines; lang:ts file:name.ts lines:on|off
$link        url:https://… title:"…" plus description text
$image       image URL as the text; alt:"…"
$reference   points at a node in another map (read-only here)
$group       visual group (read-only here)
$plugin <id> "<kind>"  a node owned by a plugin; its data is not shown`,

	reading: `Reading maps without wasting tokens:
1. list_maps: pick a map id.
2. read_map {map, depth:1} or {depth:2}: the top of the map. Long text is trimmed (detail:"brief").
3. read_map {map, root:<id>}: open one branch. "… N more below" lines tell you where to go.
4. read_nodes {map, ids:[…]}: full text, links in/out, and fields the outline can't show.
5. search_nodes {query, map?}: find nodes by words, type or tag; without map it searches all your maps.
Ids are short hex prefixes (6+ chars). Any unique prefix or the full UUID works.`,
} as const;

export type GuideTopic = keyof typeof GUIDE_TOPICS;

export const guideTool = defineMcpTool({
	name: 'guide',
	kind: 'read',
	summary: 'How-to text: outline syntax, node types, reading big maps.',
	keywords: ['help', 'syntax', 'format', 'docs', 'how', 'types'],
	input: z.strictObject({
		topic: z.enum(Object.keys(GUIDE_TOPICS) as [GuideTopic, ...GuideTopic[]]),
	}),
	example: { topic: 'syntax' },
	async run({ topic }) {
		return GUIDE_TOPICS[topic];
	},
});
