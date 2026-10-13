import { z } from 'zod';
import { MAX_NEW_NODES_PER_CALL } from '../graph/edit-plan';
import { MAX_NODE_TEXT_CHARS } from '../format/node-input';
import { McpToolError } from '../errors';
import { readMcpPlan } from '../plan-gate';
import { defineMcpTool } from '../tool-types';
import { MAX_OPS_PER_CALL, MAX_TEXT_PER_CALL } from './edit-map';

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

	editing: `Writing maps (create_map / edit_map). Every call is atomic: one error and nothing is written.
New nodes are outline lines without an id. Name a node with &ref to link to it later in the same call:
  Paul Atreides &paul #character
    $annotation type:warning How does Paul know?   (annotations hang off the node above)
  [a1b2c3] An existing node                      (anchor: new lines indented under it become its children)
    New child
  ---
  &paul -> a1b2c3 : son of
edit_map ops, run in order (ids: short id, full id or &ref):
  {op:"outline", under?, text}        add an outline (under = attach its top lines there)
  {op:"add", under?, text}            one node (+ its | lines / [ ] rows / children)
  {op:"update", id, text?, type?, tags?, title?, collapsed?}   text replaces the node's text and tokens; other fields stay
  {op:"move", id, under}              under:null = top level
  {op:"delete", ids, withDescendants?}
  {op:"link", from, to, label?}  {op:"unlink", from, to}  {op:"label", from, to, label}
New and moved nodes are placed next to their parent (place:"auto"). Nothing else moves.
Plugin nodes ($plugin) can be moved, linked or deleted, not created or edited.
Prefer one big edit_map call over many small ones: each call is one "agent edit" against the plan's limits.`,

	'source-to-map': `Turning a source (book, codebase, notes, meeting) into a map:
1. Read the source first; decide 3-8 top-level branches (e.g. Characters, Events, Places, Themes, Open questions).
2. Entities become nodes tagged by kind: "Paul Atreides &paul #character". Keep text short; put detail in | lines.
3. Relations become labeled links after ---: "&paul -> &jessica : son of", "&event3 -> &event4 : causes".
4. Problems become $annotation type:warning under the node they concern (plot holes, contradictions, bugs).
5. Open questions become $question nodes; to-dos become a $task with [ ] rows.
6. Build it with one create_map {title, outline} call (up to 500 nodes), then add more with edit_map.
7. To update later: read_map with depth 1-2, then edit_map using the [ids] you read. Don't re-create what exists.`,

	limits: '', // built per caller from their plan, see limitsGuide

	reading: `Reading maps without wasting tokens:
1. list_maps: pick a map id.
2. read_map {map, depth:1} or {depth:2}: the top of the map. Long text is trimmed (detail:"brief").
3. read_map {map, root:<id>}: open one branch. "… N more below" lines tell you where to go.
4. read_nodes {map, ids:[…]}: full text, links in/out, and fields the outline can't show.
5. search_nodes {query, map?}: find nodes by words, type or tag; without map it searches all your maps.
Ids are short hex prefixes (6+ chars). Any unique prefix or the full UUID works.`,
} as const;

export type GuideTopic = keyof typeof GUIDE_TOPICS;

const limitText = (value: unknown, unit: string) =>
	value === -1 ? `unlimited ${unit}` : typeof value === 'number' ? `${value} ${unit}` : `a set number of ${unit}`;

/** Limits text with the caller's real plan numbers (they live in the database). */
export function limitsGuide(planName: string, limits: Record<string, unknown>): string {
	const plan = readMcpPlan({ plan_name: planName, limits });
	return `Limits (errors name the one you hit; a failed call writes nothing):
- Per call: ${MAX_OPS_PER_CALL} ops, ${MAX_NEW_NODES_PER_CALL} new nodes, ${MAX_TEXT_PER_CALL.toLocaleString('en-US')} characters of text, ${MAX_NODE_TEXT_CHARS.toLocaleString('en-US')} per node.
- Your plan (${planName}): ${limitText(limits.mindMaps, 'maps')}, ${limitText(limits.nodesPerMap, 'nodes per map')} (a shared map uses its owner's plan).
- Agent edits: each successful create_map / edit_map / update_map_info call is one. ${plan.writesPerMonth === -1 ? 'No monthly cap' : `${plan.writesPerMonth} a month`}, ${plan.writesPerMinute} a minute.${plan.access === 'read' ? ' Your plan lets AI apps read only.' : ''}
- Reads: 120 a minute.
- Roles: owners and editors can edit; commentators and viewers can only read; only the owner can rename a map.
- AI apps can't delete maps, change sharing, or see billing.`;
}

export const guideTool = defineMcpTool({
	name: 'guide',
	kind: 'read',
	summary: 'How-to text: outline syntax, node types, editing, turning a source into a map, limits, reading big maps.',
	keywords: ['help', 'syntax', 'format', 'docs', 'how', 'types'],
	input: z.strictObject({
		topic: z.enum(Object.keys(GUIDE_TOPICS) as [GuideTopic, ...GuideTopic[]]),
	}),
	example: { topic: 'syntax' },
	async run({ topic }, ctx) {
		if (topic !== 'limits') return GUIDE_TOPICS[topic];

		const { data, error } = await ctx.supabase.rpc('get_mcp_plan_limits').maybeSingle();
		if (error) throw new McpToolError(`Could not load your plan: ${error.message}`);
		const row = data as { plan_name: string; limits: Record<string, unknown> } | null;
		return limitsGuide(row?.plan_name ?? 'free', row?.limits ?? {});
	},
});
