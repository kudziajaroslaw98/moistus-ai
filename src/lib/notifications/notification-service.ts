import { resolveDisplayName } from '@/helpers/identity/resolve-user-identity';
import { pushPartyKitNotificationEvent } from '@/helpers/partykit/admin';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { createResendClient } from '@/lib/email';
import { sendWebPushNotification } from '@/lib/push/web-push';
import type {
	NotificationEmailStatus,
	NotificationEventType,
	NotificationRecord,
} from '@/types/notification';
import type { SupabaseClient } from '@supabase/supabase-js';

interface NotificationInsertInput {
	recipientUserId: string;
	actorUserId?: string | null;
	mapId?: string | null;
	eventType: NotificationEventType;
	title: string;
	body: string;
	metadata?: Record<string, unknown>;
	dedupeKey?: string | null;
}

interface UserProfileEmailPayload {
	user_id: string;
	email: string | null;
	display_name: string | null;
	full_name: string | null;
	preferences: Record<string, unknown> | null;
}

interface PushSubscriptionRow {
	id: string;
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	expiration_time: string | null;
}

const EMAIL_FROM = 'Shiko <noreply@shiko.app>';

/**
 * Create in-app notifications and attempt email delivery (fail-soft).
 */
export async function createNotifications(
	inputs: NotificationInsertInput[]
): Promise<NotificationRecord[]> {
	if (inputs.length === 0) {
		return [];
	}

	const adminClient = createServiceRoleClient();
	const rows = inputs.map((input) => ({
		recipient_user_id: input.recipientUserId,
		actor_user_id: input.actorUserId ?? null,
		map_id: input.mapId ?? null,
		event_type: input.eventType,
		title: input.title,
		body: input.body,
		metadata: input.metadata ?? {},
		dedupe_key: input.dedupeKey ?? null,
	}));

	const { data, error } = await adminClient
		.from('notifications')
		.upsert(rows, {
			onConflict: 'recipient_user_id,event_type,dedupe_key',
			ignoreDuplicates: true,
		})
		.select('*');

	if (error) {
		console.error('[notifications] failed to insert notifications', error);
		return [];
	}

	const created = (data ?? []) as NotificationRecord[];
	if (created.length === 0) {
		return created;
	}

	const sideEffectResults = await Promise.allSettled([
		dispatchPartyKitNotificationEvents(created),
		processNotificationEmails(adminClient, created),
		processWebPushNotifications(adminClient, created),
	]);

	const partyKitResult = sideEffectResults[0];
	if (partyKitResult?.status === 'rejected') {
		console.warn(
			'[notifications] dispatchPartyKitNotificationEvents error',
			partyKitResult.reason instanceof Error
				? partyKitResult.reason.message
				: partyKitResult.reason
		);
	}

	const emailResult = sideEffectResults[1];
	if (emailResult?.status === 'rejected') {
		console.warn(
			'[notifications] processNotificationEmails error',
			emailResult.reason instanceof Error
				? emailResult.reason.message
				: emailResult.reason
		);
	}

	const webPushResult = sideEffectResults[2];
	if (webPushResult?.status === 'rejected') {
		console.warn(
			'[notifications] processWebPushNotifications error',
			webPushResult.reason instanceof Error
				? webPushResult.reason.message
				: webPushResult.reason
		);
	}
	return created;
}

async function dispatchPartyKitNotificationEvents(
	notifications: NotificationRecord[]
): Promise<void> {
	await Promise.all(
		notifications.map(async (notification) => {
			try {
				await pushPartyKitNotificationEvent({
					targetUserId: notification.recipient_user_id,
					notificationId: notification.id,
					occurredAt: notification.created_at,
				});
			} catch (error) {
				console.warn(
					'[notifications] failed to push PartyKit notification event',
					{
						notificationId: notification.id,
						recipientUserId: notification.recipient_user_id,
						error: error instanceof Error ? error.message : 'Unknown error',
					}
				);
			}
		})
	);
}

export async function createAccessChangedNotification(params: {
	recipientUserId: string;
	actorUserId: string;
	mapId: string;
	mapTitle?: string | null;
	newRole: 'viewer' | 'commentator' | 'editor';
	canEdit: boolean;
	canComment: boolean;
	canView: boolean;
	sourceId: string;
}): Promise<void> {
	const permissionsSummary = [
		params.canView ? 'view' : null,
		params.canComment ? 'comment' : null,
		params.canEdit ? 'edit' : null,
	]
		.filter(Boolean)
		.join(', ');

	const mapLabel = params.mapTitle || 'a shared map';
	await createNotifications([
		{
			recipientUserId: params.recipientUserId,
			actorUserId: params.actorUserId,
			mapId: params.mapId,
			eventType: 'access_changed',
			title: 'Access updated',
			body: `Your access to "${mapLabel}" was updated to ${params.newRole}. Permissions: ${permissionsSummary || 'none'}.`,
			metadata: {
				mapId: params.mapId,
				mapTitle: params.mapTitle ?? null,
				role: params.newRole,
				canEdit: params.canEdit,
				canComment: params.canComment,
				canView: params.canView,
			},
			dedupeKey: `access_changed:${params.mapId}:${params.sourceId}`,
		},
	]);
}

export async function createAccessRevokedNotification(params: {
	recipientUserId: string;
	actorUserId: string;
	mapId: string;
	mapTitle?: string | null;
	sourceId: string;
}): Promise<void> {
	const mapLabel = params.mapTitle || 'a shared map';
	await createNotifications([
		{
			recipientUserId: params.recipientUserId,
			actorUserId: params.actorUserId,
			mapId: params.mapId,
			eventType: 'access_revoked',
			title: 'Access revoked',
			body: `Your access to "${mapLabel}" has been revoked.`,
			metadata: {
				mapId: params.mapId,
				mapTitle: params.mapTitle ?? null,
			},
			dedupeKey: `access_revoked:${params.mapId}:${params.sourceId}`,
		},
	]);
}

/**
 * Processes notification emails for newly created in-app notifications.
 *
 * Workflow:
 * 1. Short-circuits on empty `notifications`.
 * 2. Validates `RESEND_API_KEY`; missing/invalid setup uses `markBulkEmailStatus(..., 'skipped_missing_api_key')`.
 * 3. Creates a Resend client via `createResendClient()` and reuses per-request caches for profiles/preferences/map titles.
 * 4. Resolves recipient data with `getUserProfile`, `getEmailPreference`, and `getMapTitle`.
 * 5. Builds email payloads (honoring `NODE_ENV` and `DEV_EMAIL_OVERRIDE`) and calls `resend.emails.send(...)`.
 * 6. Persists per-item state with `markSingleEmailStatus` (`skipped_no_email`, `skipped_preference_off`, `failed`, `sent`).
 *
 * Side effects: Reads user/map metadata, sends outbound email, and updates `notifications` delivery columns.
 * Errors are handled per item and recorded in email status fields; this function resolves with `Promise<void>`.
 */
async function processNotificationEmails(
	adminClient: SupabaseClient,
	notifications: NotificationRecord[]
): Promise<void> {
	if (notifications.length === 0) {
		return;
	}

	const resendApiKey = process.env.RESEND_API_KEY;
	if (!resendApiKey) {
		await markBulkEmailStatus(
			adminClient,
			notifications.map((item) => item.id),
			'skipped_missing_api_key'
		);
		return;
	}

	let resend: ReturnType<typeof createResendClient>;
	try {
		resend = createResendClient();
	} catch (error) {
		console.warn('[notifications] resend unavailable, skipping email sends', error);
		await markBulkEmailStatus(
			adminClient,
			notifications.map((item) => item.id),
			'skipped_missing_api_key'
		);
		return;
	}

	const profileCache = new Map<string, UserProfileEmailPayload | null>();
	const preferenceCache = new Map<string, boolean>();
	const mapTitleCache = new Map<string, string | null>();

	for (const notification of notifications) {
		const recipientProfile = await getUserProfile(
			adminClient,
			notification.recipient_user_id,
			profileCache
		);

		if (!recipientProfile?.email) {
			await markSingleEmailStatus(adminClient, notification.id, {
				email_status: 'skipped_no_email',
				email_error: 'Recipient has no email',
			});
			continue;
		}

		const emailEnabled = await getEmailPreference(
			adminClient,
			notification.recipient_user_id,
			preferenceCache,
			profileCache
		);
		if (!emailEnabled) {
			await markSingleEmailStatus(adminClient, notification.id, {
				email_status: 'skipped_preference_off',
				email_error: 'Email notifications disabled by user',
			});
			continue;
		}

		const actorProfile = notification.actor_user_id
			? await getUserProfile(adminClient, notification.actor_user_id, profileCache)
			: null;
		const actorName = resolveDisplayName({
			displayName: actorProfile?.display_name,
			fullName: actorProfile?.full_name,
			email: actorProfile?.email,
			userId: notification.actor_user_id ?? undefined,
		});

		const mapTitle = notification.map_id
			? await getMapTitle(adminClient, notification.map_id, mapTitleCache)
			: null;

		const recipientEmail =
			process.env.NODE_ENV !== 'production' && process.env.DEV_EMAIL_OVERRIDE
				? process.env.DEV_EMAIL_OVERRIDE
				: recipientProfile.email;

		const emailText = [
			`Hi ${resolveDisplayName({
				displayName: recipientProfile.display_name,
				fullName: recipientProfile.full_name,
				email: recipientProfile.email,
				userId: recipientProfile.user_id,
			})},`,
			'',
			notification.body,
			'',
			`Triggered by: ${actorName}`,
			mapTitle ? `Map: ${mapTitle}` : null,
			notification.map_id ? `Open map: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://shiko.app'}/mind-map/${notification.map_id}` : null,
			'',
			'You can manage notifications from your Shiko workspace.',
		]
			.filter(Boolean)
			.join('\n');

		try {
			const { error } = await resend.emails.send({
				from: EMAIL_FROM,
				to: recipientEmail,
				subject: `Shiko: ${notification.title}`,
				text: emailText,
			});

			if (error) {
				await markSingleEmailStatus(adminClient, notification.id, {
					email_status: 'failed',
					email_error: error.message,
				});
				continue;
			}

			await markSingleEmailStatus(adminClient, notification.id, {
				email_status: 'sent',
				email_error: null,
			});
		} catch (error) {
			await markSingleEmailStatus(adminClient, notification.id, {
				email_status: 'failed',
				email_error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
}

const resolvePushPreferenceFromProfile = (
	preferences: Record<string, unknown> | null | undefined
): {
	enabled: boolean;
	mentions: boolean;
	comments: boolean;
	reactions: boolean;
} => {
	if (!preferences || typeof preferences !== 'object') {
		return {
			enabled: false,
			mentions: true,
			comments: true,
			reactions: true,
		};
	}

	const maybeNotifications = preferences.notifications;
	if (!maybeNotifications || typeof maybeNotifications !== 'object') {
		return {
			enabled: false,
			mentions: true,
			comments: true,
			reactions: true,
		};
	}

	const notificationPrefs = maybeNotifications as Record<string, unknown>;
	const enabled =
		typeof notificationPrefs.push === 'boolean'
			? notificationPrefs.push
			: false;
	const mentions =
		typeof notificationPrefs.push_mentions === 'boolean'
			? notificationPrefs.push_mentions
			: true;
	const comments =
		typeof notificationPrefs.push_comments === 'boolean'
			? notificationPrefs.push_comments
			: true;
	const reactions =
		typeof notificationPrefs.push_reactions === 'boolean'
			? notificationPrefs.push_reactions
			: true;

	return {
		enabled,
		mentions,
		comments,
		reactions,
	};
};

const shouldDeliverPush = (
	eventType: NotificationEventType,
	pushPreferences: ReturnType<typeof resolvePushPreferenceFromProfile>
) => {
	if (!pushPreferences.enabled) {
		return false;
	}

	if (eventType === 'comment_reaction') {
		return pushPreferences.reactions;
	}
	if (eventType === 'comment_reply' || eventType === 'access_changed' || eventType === 'access_revoked') {
		return pushPreferences.comments;
	}
	return pushPreferences.mentions;
};

async function processWebPushNotifications(
	adminClient: SupabaseClient,
	notifications: NotificationRecord[]
): Promise<void> {
	if (notifications.length === 0) {
		return;
	}

	const recipientUserIds = Array.from(
		new Set(notifications.map((notification) => notification.recipient_user_id))
	);

	const { data: subscriptions, error: subscriptionsError } = await adminClient
		.from('push_subscriptions')
		.select('id, user_id, endpoint, p256dh, auth, expiration_time')
		.in('user_id', recipientUserIds);

	if (subscriptionsError) {
		console.warn('[notifications] failed to load push subscriptions', subscriptionsError);
		return;
	}

	if (!subscriptions || subscriptions.length === 0) {
		return;
	}

	const subscriptionsByUserId = new Map<string, PushSubscriptionRow[]>();
	(subscriptions as PushSubscriptionRow[]).forEach((subscription) => {
		const current = subscriptionsByUserId.get(subscription.user_id) ?? [];
		current.push(subscription);
		subscriptionsByUserId.set(subscription.user_id, current);
	});

	const profileCache = new Map<string, UserProfileEmailPayload | null>();
	const mapTitleCache = new Map<string, string | null>();
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shiko.app';

	for (const notification of notifications) {
		const userSubscriptions =
			subscriptionsByUserId.get(notification.recipient_user_id) ?? [];
		if (userSubscriptions.length === 0) {
			continue;
		}

		const profile = await getUserProfile(
			adminClient,
			notification.recipient_user_id,
			profileCache
		);
		const pushPreferences = resolvePushPreferenceFromProfile(profile?.preferences);
		if (!shouldDeliverPush(notification.event_type, pushPreferences)) {
			continue;
		}

		if (notification.map_id) {
			await getMapTitle(adminClient, notification.map_id, mapTitleCache);
		}
		const navigate = notification.map_id
			? `${siteUrl}/mind-map/${notification.map_id}`
			: `${siteUrl}/dashboard`;

		await Promise.all(
			userSubscriptions.map(async (subscription) => {
				const delivered = await sendWebPushNotification({
					subscription: {
						endpoint: subscription.endpoint,
						keys: {
							p256dh: subscription.p256dh,
							auth: subscription.auth,
						},
						expirationTime: subscription.expiration_time
							? new Date(subscription.expiration_time).getTime()
							: null,
					},
					payload: {
						title: notification.title,
						body: notification.body,
						navigate,
						tag: `notif:${notification.id}`,
					},
				});

				if (!delivered) {
					console.warn('[notifications] web push send failed', {
						notificationId: notification.id,
						subscriptionId: subscription.id,
					});
				} else {
					await adminClient
						.from('push_subscriptions')
						.update({
							last_used_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						})
						.eq('id', subscription.id);
				}
			})
		);
	}
}

async function getUserProfile(
	adminClient: SupabaseClient,
	userId: string,
	cache: Map<string, UserProfileEmailPayload | null>
): Promise<UserProfileEmailPayload | null> {
	if (cache.has(userId)) {
		return cache.get(userId) ?? null;
	}

	const { data, error } = await adminClient
		.from('user_profiles')
		.select('user_id, email, display_name, full_name, preferences')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		console.warn('[notifications] failed to load user profile for email', {
			userId,
			error: error.message,
		});
		cache.set(userId, null);
		return null;
	}

	const typedData = (data ?? null) as UserProfileEmailPayload | null;
	cache.set(userId, typedData);
	return typedData;
}

async function getEmailPreference(
	adminClient: SupabaseClient,
	userId: string,
	cache: Map<string, boolean>,
	profileCache: Map<string, UserProfileEmailPayload | null>
): Promise<boolean> {
	if (cache.has(userId)) {
		return cache.get(userId) ?? false;
	}

	const profile = await getUserProfile(adminClient, userId, profileCache);
	const preferenceFromProfile = resolveEmailPreferenceFromProfile(profile?.preferences);
	if (preferenceFromProfile !== null) {
		cache.set(userId, preferenceFromProfile);
		return preferenceFromProfile;
	}

	const { data, error } = await adminClient
		.from('user_preferences')
		.select('email_notifications')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		console.warn('[notifications] failed to load email preference', {
			userId,
			error: error.message,
			details: error,
		});
		cache.set(userId, false);
		return false;
	}

	const enabled = data?.email_notifications !== false;
	cache.set(userId, enabled);
	return enabled;
}

function resolveEmailPreferenceFromProfile(
	preferences: Record<string, unknown> | null | undefined
): boolean | null {
	if (!preferences || typeof preferences !== 'object') {
		return null;
	}

	const maybeNotifications = preferences.notifications;
	if (
		maybeNotifications &&
		typeof maybeNotifications === 'object' &&
		'email' in maybeNotifications
	) {
		const emailValue = (maybeNotifications as Record<string, unknown>).email;
		if (typeof emailValue === 'boolean') {
			return emailValue;
		}
	}

	if ('emailNotifications' in preferences) {
		const legacyValue = preferences.emailNotifications;
		if (typeof legacyValue === 'boolean') {
			return legacyValue;
		}
	}

	return null;
}

async function getMapTitle(
	adminClient: SupabaseClient,
	mapId: string,
	cache: Map<string, string | null>
): Promise<string | null> {
	if (cache.has(mapId)) {
		return cache.get(mapId) ?? null;
	}

	const { data, error } = await adminClient
		.from('mind_maps')
		.select('title')
		.eq('id', mapId)
		.maybeSingle();

	if (error) {
		console.warn('[notifications] failed to load map title', {
			mapId,
			error: error.message,
		});
		cache.set(mapId, null);
		return null;
	}

	const title = data?.title ?? null;
	cache.set(mapId, title);
	return title;
}

async function markBulkEmailStatus(
	adminClient: SupabaseClient,
	notificationIds: string[],
	status: NotificationEmailStatus
): Promise<void> {
	if (notificationIds.length === 0) {
		return;
	}

	const { error } = await adminClient
		.from('notifications')
		.update({
			email_status: status,
			email_error: null,
			emailed_at: status === 'sent' ? new Date().toISOString() : null,
			updated_at: new Date().toISOString(),
		})
		.in('id', notificationIds);

	if (error) {
		console.warn('[notifications] failed to update bulk email status', error);
	}
}

async function markSingleEmailStatus(
	adminClient: SupabaseClient,
	notificationId: string,
	params: { email_status: NotificationEmailStatus; email_error: string | null }
): Promise<void> {
	const { error } = await adminClient
		.from('notifications')
		.update({
			email_status: params.email_status,
			email_error: params.email_error,
			emailed_at: ['sent', 'failed'].includes(params.email_status) ? new Date().toISOString() : null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', notificationId);

	if (error) {
		console.warn('[notifications] failed to update email status', {
			notificationId,
			error: error.message,
		});
	}
}
