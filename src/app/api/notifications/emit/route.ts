import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { createNotifications } from '@/lib/notifications/notification-service';
import type { NotificationEmitEvent } from '@/types/notification';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

const nodeMentionEventSchema = z.object({
	type: z.literal('node_mention'),
	mapId: uuidSchema,
	recipientUserIds: z.array(uuidSchema).min(1).max(50),
	nodeId: uuidSchema.optional(),
	nodeContent: z.string().max(2000).optional(),
});

const commentMentionEventSchema = z.object({
	type: z.literal('comment_mention'),
	mapId: uuidSchema,
	commentId: uuidSchema,
	messageId: uuidSchema,
	recipientUserIds: z.array(uuidSchema).min(1).max(50),
	messageContent: z.string().max(4000).optional(),
});

const commentReplyEventSchema = z.object({
	type: z.literal('comment_reply'),
	mapId: uuidSchema,
	commentId: uuidSchema,
	messageId: uuidSchema,
	recipientUserIds: z.array(uuidSchema).min(1).max(50),
	messageContent: z.string().max(4000).optional(),
});

const commentReactionEventSchema = z.object({
	type: z.literal('comment_reaction'),
	mapId: uuidSchema,
	commentId: uuidSchema,
	messageId: uuidSchema,
	recipientUserIds: z.array(uuidSchema).min(1).max(50),
	emoji: z.string().min(1).max(20),
	messageContent: z.string().max(4000).optional(),
});

const emitNotificationsSchema = z.object({
	events: z
		.array(
			z.discriminatedUnion('type', [
				nodeMentionEventSchema,
				commentMentionEventSchema,
				commentReplyEventSchema,
				commentReactionEventSchema,
			])
		)
		.min(1)
		.max(50),
});

interface EmitNotificationsResponse {
	createdCount: number;
}

type NotificationInsertPayload = Parameters<typeof createNotifications>[0][number];

interface MapParticipantContext {
	mapId: string;
	mapTitle: string | null;
	participantIds: Set<string>;
}

export const POST = withApiValidation<
	z.infer<typeof emitNotificationsSchema>,
	EmitNotificationsResponse
>(emitNotificationsSchema, async (_req, validatedBody, _supabase, user) => {
	try {
		const adminClient = createServiceRoleClient();
		const mapIds = Array.from(
			new Set(validatedBody.events.map((event) => event.mapId))
		);

		const mapContextById = new Map<string, MapParticipantContext>();
		for (const mapId of mapIds) {
			const mapContext = await getMapParticipantContext(adminClient, mapId, user.id);
			if (!mapContext) {
				return respondError(
					'Map not found or access denied for notification emit',
					403
				);
			}
			mapContextById.set(mapId, mapContext);
		}

		const notificationsToCreate: NotificationInsertPayload[] = [];
		for (const event of validatedBody.events as NotificationEmitEvent[]) {
			const mapContext = mapContextById.get(event.mapId);
			if (!mapContext) {
				continue;
			}

			const recipients = Array.from(new Set(event.recipientUserIds)).filter(
				(recipientId) =>
					recipientId !== user.id &&
					mapContext.participantIds.has(recipientId)
			);

			for (const recipientUserId of recipients) {
				const insertPayload = toNotificationInsertPayload({
					event,
					recipientUserId,
					actorUserId: user.id,
					mapTitle: mapContext.mapTitle,
				});
				if (insertPayload) {
					notificationsToCreate.push(insertPayload);
				}
			}
		}

		const created = await createNotifications(notificationsToCreate);
		return respondSuccess(
			{
				createdCount: created.length,
			},
			200,
			'Notification events emitted'
		);
	} catch (error) {
		console.error('[notifications/emit] failed', error);
		return respondError('Failed to emit notifications', 500);
	}
});

function toNotificationInsertPayload(params: {
	event: NotificationEmitEvent;
	recipientUserId: string;
	actorUserId: string;
	mapTitle: string | null;
}): NotificationInsertPayload | null {
	const mapLabel = params.mapTitle || 'a shared map';
	const event = params.event;

	switch (event.type) {
		case 'node_mention': {
			const snippet = clipSnippet(event.nodeContent);
			return {
				recipientUserId: params.recipientUserId,
				actorUserId: params.actorUserId,
				mapId: event.mapId,
				eventType: 'node_mention',
				title: 'You were mentioned in a node',
				body: snippet
					? `You were mentioned in "${mapLabel}": "${snippet}"`
					: `You were mentioned in a node on "${mapLabel}".`,
				metadata: {
					mapId: event.mapId,
					nodeId: event.nodeId ?? null,
					nodeContent: snippet,
				},
				dedupeKey: `node_mention:${event.mapId}:${event.nodeId ?? compactToken(snippet)}:${params.actorUserId}`,
			};
		}

		case 'comment_mention': {
			const snippet = clipSnippet(event.messageContent);
			return {
				recipientUserId: params.recipientUserId,
				actorUserId: params.actorUserId,
				mapId: event.mapId,
				eventType: 'comment_mention',
				title: 'You were mentioned in a comment',
				body: snippet
					? `You were mentioned in a comment on "${mapLabel}": "${snippet}"`
					: `You were mentioned in a comment on "${mapLabel}".`,
				metadata: {
					mapId: event.mapId,
					commentId: event.commentId,
					messageId: event.messageId,
					messageContent: snippet,
				},
				dedupeKey: `comment_mention:${event.mapId}:${event.messageId}:${params.actorUserId}`,
			};
		}

		case 'comment_reply': {
			const snippet = clipSnippet(event.messageContent);
			return {
				recipientUserId: params.recipientUserId,
				actorUserId: params.actorUserId,
				mapId: event.mapId,
				eventType: 'comment_reply',
				title: 'New reply in your comment thread',
				body: snippet
					? `New reply on "${mapLabel}": "${snippet}"`
					: `There is a new reply in your comment thread on "${mapLabel}".`,
				metadata: {
					mapId: event.mapId,
					commentId: event.commentId,
					messageId: event.messageId,
					messageContent: snippet,
				},
				dedupeKey: `comment_reply:${event.mapId}:${event.messageId}:${params.actorUserId}`,
			};
		}

		case 'comment_reaction':
			return {
				recipientUserId: params.recipientUserId,
				actorUserId: params.actorUserId,
				mapId: event.mapId,
				eventType: 'comment_reaction',
				title: 'Someone reacted to your message',
				body: `Your message on "${mapLabel}" received a ${event.emoji} reaction.`,
				metadata: {
					mapId: event.mapId,
					commentId: event.commentId,
					messageId: event.messageId,
					emoji: event.emoji,
					messageContent: clipSnippet(event.messageContent),
				},
				dedupeKey: `comment_reaction:${event.mapId}:${event.messageId}:${params.actorUserId}:${event.emoji}`,
			};

		default:
			return null;
	}
}

function clipSnippet(value?: string): string {
	if (!value) {
		return '';
	}
	return value.trim().replace(/\s+/g, ' ').slice(0, 180);
}

function compactToken(value: string): string {
	if (!value) {
		return 'no-content';
	}
	return Buffer.from(value).toString('base64url').slice(0, 16);
}

async function getMapParticipantContext(
	adminClient: ReturnType<typeof createServiceRoleClient>,
	mapId: string,
	requestingUserId: string
): Promise<MapParticipantContext | null> {
	const { data: mapData, error: mapError } = await adminClient
		.from('mind_maps')
		.select('id, user_id, title')
		.eq('id', mapId)
		.maybeSingle();

	if (mapError || !mapData?.id || !mapData.user_id) {
		return null;
	}

	if (mapData.user_id !== requestingUserId) {
		const { data: accessData, error: accessError } = await adminClient
			.from('share_access')
			.select('id')
			.eq('map_id', mapId)
			.eq('user_id', requestingUserId)
			.eq('status', 'active')
			.maybeSingle();

		if (accessError || !accessData) {
			return null;
		}
	}

	const { data: collaboratorRows, error: collaboratorError } = await adminClient
		.from('share_access')
		.select('user_id')
		.eq('map_id', mapId)
		.eq('status', 'active');

	if (collaboratorError) {
		console.error('[notifications/emit] failed to load map participants', {
			mapId,
			error: collaboratorError.message,
		});
		return null;
	}

	const participantIds = new Set<string>([mapData.user_id]);
	for (const row of collaboratorRows ?? []) {
		if (row.user_id) {
			participantIds.add(row.user_id);
		}
	}

	return {
		mapId,
		mapTitle: mapData.title ?? null,
		participantIds,
	};
}
