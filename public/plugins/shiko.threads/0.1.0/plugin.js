// Threads: open questions, and the nodes where each one comes up ("stops").
// Runs in Shiko's plugin sandbox, where only `definePlugin` and `ui` exist.
// Stops are node ids in the `stops` list (set by clicking nodes, never typed). `ctx.refs`
// holds the nodes they point at, so a stop whose node was deleted has no entry there.

const MAX_STOPS_PER_THREAD = 12;
const MAX_STOPS = 100;

const list = (data, field) => (Array.isArray(data[field]) ? data[field] : []);
// Rows get their ids when a node is saved; a draft in the node editor has none yet.
const stopsOf = (data, threadId) =>
	threadId ? list(data, 'stops').filter((stop) => stop.thread === threadId) : [];
// Deleting a thread's line in the node editor leaves its stops in the list (they are set by
// clicking, never typed). They don't show anywhere, so they don't count toward the limits,
// and the next pick or removal drops them.
const liveStops = (data) => {
	const threadIds = list(data, 'threads').map((thread) => thread.id);
	return list(data, 'stops').filter((stop) => threadIds.includes(stop.thread));
};
const plural = (count, word) => count + ' ' + word + (count === 1 ? '' : 's');

/** Which limit a thread has reached, if any: its own 12 stops, or the node's 100 in all. */
function limitMessage(data, threadId) {
	if (stopsOf(data, threadId).length >= MAX_STOPS_PER_THREAD) {
		return 'This thread has ' + MAX_STOPS_PER_THREAD + ' of ' + MAX_STOPS_PER_THREAD + ' stops.';
	}
	if (liveStops(data).length >= MAX_STOPS) {
		return 'This node holds ' + MAX_STOPS + ' stops, the most it can.';
	}
	return null;
}

function short(text, length) {
	const line = String(text || '').replace(/\s+/g, ' ').trim();
	return line.length > length ? line.slice(0, length - 1).trimEnd() + '…' : line;
}

const STATUS_TONE = { open: 'info', resolved: 'success', dropped: 'neutral' };
/** The same colors for text, which has no "neutral". */
const RANK_TONE = { open: 'info', resolved: 'success', dropped: 'muted' };

function statusIcon(status) {
	if (status === 'resolved') return ui.icon('circle-check', { tone: 'success' });
	if (status === 'dropped') return ui.icon('circle-minus', { tone: 'neutral' });
	return ui.icon('circle', { tone: 'info' });
}

/** What a stop is: the node's text, or null when the node is gone. */
function stopNode(stop, refs) {
	return refs[stop.node] || null;
}

function pickFor(thread, data, refs) {
	const live = stopsOf(data, thread.id).filter((stop) => stopNode(stop, refs));
	// At a limit a click on a new node changes nothing, so say so before anyone tries.
	const limit = limitMessage(data, thread.id);
	return {
		title: 'Adding stops to “' + short(thread.text, 40) + '”',
		hint: limit
			? limit + ' Click a numbered node to remove one.'
			: (live.length === 0 ? 'No stops yet. ' : plural(live.length, 'stop') + ' so far. ') +
				'Click a node to add it, click a numbered one to remove it.',
		marked: live.map((stop) => stop.node),
	};
}

function subLine(thread, data, refs) {
	const stops = stopsOf(data, thread.id);
	const live = stops.filter((stop) => stopNode(stop, refs));
	const gone = stops.length - live.length;
	const first = live.length ? short(refs[live[0].node].text, 24) : '';
	const last = live.length ? short(refs[live[live.length - 1].node].text, 24) : '';

	if (thread.status === 'resolved' || thread.status === 'dropped') {
		const resolved = thread.status === 'resolved';
		if (!live.length) {
			return ui.text(resolved ? 'Resolved, no stops left' : 'Dropped, no stops left', {
				size: 'sm',
				tone: resolved ? 'success' : 'muted',
			});
		}
		return ui.row({ gap: 0, wrap: true }, [
			ui.text('Raised in ' + first + ' · ', { size: 'sm', tone: 'muted' }),
			ui.text(resolved ? 'resolved in ' + last : 'dropped after ' + last, {
				size: 'sm',
				tone: resolved ? 'success' : 'muted',
			}),
		]);
	}
	if (stops.length === 0) return ui.text('No stops yet', { size: 'sm', tone: 'muted' });
	if (live.length === 0) return ui.text('All stops were deleted', { size: 'sm', tone: 'warning' });
	return ui.text(
		'Raised in ' + first + ' · ' + plural(live.length, 'stop') + (gone ? ', ' + gone + ' deleted' : ''),
		{ size: 'sm', tone: 'muted' }
	);
}

function stopRows(thread, data, refs, canEdit) {
	const rows = [];
	let rank = 0;
	for (const stop of stopsOf(data, thread.id)) {
		const node = stopNode(stop, refs);
		const remove = canEdit
			? ui.button('Remove stop', 'removeStop', {
					icon: 'x',
					iconOnly: true,
					payload: { id: stop.id },
				})
			: null;
		if (node) {
			rank += 1;
			rows.push(
				ui.row({ key: stop.id, justify: 'between', align: 'center', gap: 2 }, [
					ui.row({ gap: 2, align: 'center' }, [
						ui.text(String(rank), { size: 'sm', tone: RANK_TONE[thread.status] }),
						ui.text(short(node.text, 60) || '(empty node)', { size: 'sm' }),
					]),
					...(remove ? [remove] : []),
				])
			);
		} else {
			rows.push(
				ui.row({ key: stop.id, tone: 'warning', justify: 'between', align: 'center', gap: 2 }, [
					ui.row({ gap: 2, align: 'center' }, [
						ui.icon('triangle-alert', { tone: 'warning' }),
						ui.text('This node was deleted', { size: 'sm', tone: 'warning' }),
					]),
					...(remove ? [remove] : []),
				])
			);
		}
	}
	return rows;
}

function menuFor(thread, data, refs, expanded) {
	const open = thread.status === 'open';
	const items = [
		{
			label: expanded ? 'Hide stops' : 'Show stops',
			action: 'toggleStops',
			payload: { id: thread.id },
			icon: 'list',
		},
	];
	if (open) {
		items.push(
			{
				label: 'Add a stop',
				action: 'addStop',
				payload: { thread: thread.id },
				icon: 'plus',
				pick: pickFor(thread, data, refs),
			},
			{ label: 'Mark resolved', action: 'setStatus', payload: { id: thread.id, status: 'resolved' }, icon: 'circle-check' },
			{ label: 'Mark dropped', action: 'setStatus', payload: { id: thread.id, status: 'dropped' }, icon: 'circle-minus' }
		);
	} else {
		items.push({ label: 'Reopen', action: 'setStatus', payload: { id: thread.id, status: 'open' }, icon: 'rotate-ccw' });
	}
	items.push(
		{ separator: true },
		{ label: 'Delete thread', action: 'remove', payload: { id: thread.id }, icon: 'trash', danger: true }
	);
	return ui.menu('Actions for “' + short(thread.text, 24) + '”', items);
}

function threadBlock(thread, data, refs, canEdit) {
	const expanded = Boolean(thread.id) && data.current === thread.id;
	const stops = stopsOf(data, thread.id);
	const gone = stops.filter((stop) => !stopNode(stop, refs)).length;
	const dropped = thread.status === 'dropped';

	const head = ui.row({ justify: 'between', align: 'start', gap: 2 }, [
		ui.row({ gap: 2, align: 'start' }, [
			statusIcon(thread.status),
			ui.stack({ gap: 0 }, [
				ui.text(thread.text, { tone: dropped ? 'muted' : 'default', strike: dropped }),
				subLine(thread, data, refs),
			]),
		]),
		ui.row({ gap: 1, align: 'center' }, [
			...(gone > 0 && thread.status === 'open' ? [ui.icon('triangle-alert', { tone: 'warning' })] : []),
			...(canEdit ? [menuFor(thread, data, refs, expanded)] : []),
		]),
	]);

	const children = [head];
	if (expanded) {
		const rows = stopRows(thread, data, refs, canEdit);
		if (rows.length === 0) {
			children.push(ui.text('No stops yet. Add the nodes where this comes up.', { size: 'sm', tone: 'muted' }));
		}
		children.push(...rows);
		if (canEdit && thread.status === 'open') {
			const limit = limitMessage(data, thread.id);
			if (limit) children.push(ui.text(limit + ' Remove one to add another.', { size: 'sm', tone: 'warning' }));
			children.push(
				ui.row({ gap: 2 }, [
					ui.button('Add a stop', 'addStop', {
						icon: 'plus',
						payload: { thread: thread.id },
						pick: pickFor(thread, data, refs),
					}),
				])
			);
		}
	}
	return ui.stack(Object.assign({ key: thread.id, gap: 2 }, expanded ? { tone: 'info' } : {}), children);
}

function counts(data, refs) {
	const threads = list(data, 'threads');
	const resolved = threads.filter((thread) => thread.status === 'resolved').length;
	const dropped = threads.filter((thread) => thread.status === 'dropped').length;
	const open = threads.length - resolved - dropped;
	const needLook = threads.filter(
		(thread) =>
			thread.status === 'open' && stopsOf(data, thread.id).some((stop) => !stopNode(stop, refs))
	).length;
	return { total: threads.length, resolved, dropped, open, needLook };
}

definePlugin({
	kinds: {
		threads: {
			render(data, ctx) {
				const refs = ctx.refs || {};
				const threads = list(data, 'threads');
				const { total, resolved, dropped, open, needLook } = counts(data, refs);
				const allClosed = total > 0 && open === 0;
				const canEdit = ctx.canEdit;
				const title = data.title || 'Open threads';

				const badge = allClosed
					? ui.badge('None open', { tone: 'success' })
					: needLook > 0
						? ui.badge(needLook + (needLook === 1 ? ' needs a look' : ' need a look'), { tone: 'warning' })
						: null;
				const sections = [
					ui.row({ justify: 'between', align: 'center', gap: 2 }, [
						ui.text(title, { tone: 'strong' }),
						...(badge ? [badge] : []),
					]),
				];

				if (total === 0) {
					sections.push(
						ui.text('Track things that are raised in one place and should be settled in another.', { tone: 'muted' })
					);
					if (canEdit) sections.push(ui.row({}, [ui.button('Add thread', 'add', { icon: 'plus', edit: true })]));
					return ui.stack({ gap: 3 }, sections);
				}

				sections.push(
					ui.progress(resolved / total, {
						label: resolved + ' of ' + total + ' resolved',
						showValue: true,
						tone: allClosed ? 'success' : 'info',
					}),
					ui.divider()
				);

				const shown = threads.filter((thread) => data.showClosed || thread.status === 'open');
				if (shown.length === 0) {
					sections.push(ui.text('Nothing left open.', { tone: 'success' }));
				} else {
					sections.push(ui.stack({ gap: 1 }, shown.map((thread) => threadBlock(thread, data, refs, canEdit))));
				}

				const closed = [];
				if (resolved) closed.push(resolved + ' resolved');
				if (dropped) closed.push(dropped + ' dropped');
				const footer = [];
				if (canEdit) footer.push(ui.button('Add thread', 'add', { icon: 'plus', edit: true }));
				if (closed.length > 0) {
					if (canEdit) {
						footer.push(
							ui.button(data.showClosed ? 'Hide resolved and dropped' : 'Show ' + closed.join(', '), 'toggleClosed')
						);
					} else if (!data.showClosed) {
						footer.push(ui.text(closed.join(', ') + ' hidden', { size: 'sm', tone: 'muted' }));
					}
				}
				if (footer.length > 0) sections.push(ui.row({ gap: 2, wrap: true, align: 'center' }, footer));
				return ui.stack({ gap: 3 }, sections);
			},

			summary(data) {
				const { total, resolved, open } = counts(data, {});
				return (data.title || 'Open threads') + ': ' + open + ' open, ' + resolved + ' resolved of ' + total;
			},

			actions: {
				toggleStops(data, payload) {
					const id = payload && payload.id;
					if (!list(data, 'threads').some((thread) => thread.id === id)) return data;
					const next = Object.assign({}, data);
					if (data.current === id) delete next.current;
					else next.current = id;
					return next;
				},

				toggleClosed(data) {
					return Object.assign({}, data, { showClosed: !data.showClosed });
				},

				setStatus(data, payload) {
					const status = payload && payload.status;
					if (!STATUS_TONE[status]) return data;
					return Object.assign({}, data, {
						threads: list(data, 'threads').map((thread) =>
							thread.id === payload.id ? Object.assign({}, thread, { status }) : thread
						),
					});
				},

				remove(data, payload) {
					const id = payload && payload.id;
					const next = Object.assign({}, data, {
						threads: list(data, 'threads').filter((thread) => thread.id !== id),
						stops: list(data, 'stops').filter((stop) => stop.thread !== id),
					});
					if (data.current === id) delete next.current;
					return next;
				},

				// Runs for every node the person clicks while picking: adds it as a stop, or
				// removes it when it already is one. Without a node (a check, an old click) nothing changes.
				addStop(data, payload) {
					const threadId = payload && payload.thread;
					const nodeId = payload && payload.nodeId;
					if (!nodeId || !list(data, 'threads').some((thread) => thread.id === threadId)) return data;
					const stops = liveStops(data);
					const exists = stops.some((stop) => stop.thread === threadId && stop.node === nodeId);
					if (exists) {
						return Object.assign({}, data, {
							stops: stops.filter((stop) => !(stop.thread === threadId && stop.node === nodeId)),
						});
					}
					// The pick bar already says when a limit is reached (see `limitMessage`).
					if (limitMessage(data, threadId)) return data;
					return Object.assign({}, data, {
						stops: stops.concat([{ thread: threadId, node: nodeId }]),
						current: threadId,
					});
				},

				removeStop(data, payload) {
					return Object.assign({}, data, {
						stops: liveStops(data).filter((stop) => stop.id !== (payload && payload.id)),
					});
				},
			},
		},
	},
});
