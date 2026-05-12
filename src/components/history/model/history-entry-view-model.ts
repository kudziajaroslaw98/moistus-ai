import {
	formatHistoryActionTitle,
	type HistoryFocusTarget,
	type HistoryPresentation,
	type HistoryPresentationSubject,
} from '@/helpers/history/presentation';
import { formatTimestamp } from '@/helpers/history/time-utils';
import type {
	AttributedHistoryDelta,
	HistoryItem as HistoryMeta,
	HistorySubjectHint,
} from '@/types/history-state';

export interface HistoryEntryViewModel {
	headline: string;
	headlineDetail?: string;
	subjectPreview: string;
	subjects: HistoryPresentationSubject[];
	inlineSubject: HistoryPresentationSubject | null;
	firstFocusableSubject: HistoryPresentationSubject | null;
	mobileFocusTarget: HistoryFocusTarget | null;
	mobileFocusLabel: string;
	hasAttribution: boolean;
	userDisplay: string;
	timestamp: {
		display: string;
		tooltip: string;
	};
}

export function toHistoryEntryViewModel({
	meta,
	delta,
	presentation,
	currentUserId,
}: {
	meta: HistoryMeta;
	delta: AttributedHistoryDelta | null;
	presentation: HistoryPresentation | null;
	currentUserId?: string;
}): HistoryEntryViewModel {
	const fallbackSubjects = (meta.subjects ?? []).map(
		mapHintToPresentationSubject
	);
	const subjects = presentation?.subjects ?? fallbackSubjects;
	const inlineSubject = subjects.length === 1 ? subjects[0] : null;
	const firstFocusableSubject =
		inlineSubject ??
		subjects.find((subject) => Boolean(subject.focusTarget)) ??
		null;

	const actorUserId = delta?.userId ?? meta.userId;
	const actorName = delta?.userName ?? meta.userName;
	const hasAttribution = Boolean(actorUserId || actorName);
	const userDisplay = !hasAttribution
		? ''
		: actorUserId === currentUserId
			? 'You'
			: actorName || 'Unknown';

	return {
		headline:
			presentation?.summary ??
			meta.summary ??
			formatHistoryActionTitle(meta.actionName),
		headlineDetail: presentation?.summaryDetail ?? meta.summaryDetail,
		subjectPreview: presentation?.subjectPreview ?? summarizeSubjectHints(meta),
		subjects,
		inlineSubject,
		firstFocusableSubject,
		mobileFocusTarget: firstFocusableSubject?.focusTarget ?? null,
		mobileFocusLabel: firstFocusableSubject?.label ?? 'item',
		hasAttribution,
		userDisplay,
		timestamp: formatTimestamp(meta.timestamp),
	};
}

function summarizeSubjectHints(meta: HistoryMeta): string {
	const subjects = meta.subjects ?? [];
	if (subjects.length === 0) return '';

	const labels = subjects
		.slice(0, 3)
		.map(
			(subject) => subject.label || `${subject.type} ${subject.id.slice(0, 8)}`
		);
	if (subjects.length > 3) labels.push(`+${subjects.length - 3} more`);
	return labels.join(', ');
}

function mapHintToPresentationSubject(
	hint: HistorySubjectHint
): HistoryPresentationSubject {
	return {
		id: hint.id,
		type: hint.type,
		label:
			hint.label ||
			(hint.type === 'node'
				? `Node #${hint.id.slice(0, 8)}`
				: `Connection #${hint.id.slice(0, 8)}`),
		description:
			hint.type === 'edge' && hint.sourceLabel && hint.targetLabel
				? `${hint.sourceLabel} -> ${hint.targetLabel}`
				: hint.type === 'node'
					? hint.nodeType || 'Node'
					: 'Connection',
		focusTarget:
			hint.type === 'node'
				? {
						type: 'node',
						nodeId: hint.id,
						label: hint.label || `Node #${hint.id.slice(0, 8)}`,
						position: hint.position,
						width: hint.width,
						height: hint.height,
					}
				: hint.sourceId && hint.targetId
					? {
							type: 'edge',
							edgeId: hint.id,
							label: hint.label || `Connection #${hint.id.slice(0, 8)}`,
							nodeIds: [hint.sourceId, hint.targetId],
						}
					: null,
		changes: [],
	};
}
