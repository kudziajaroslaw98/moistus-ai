import { pushPartyKitNotificationEvent } from '@/helpers/partykit/admin';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { createResendClient } from '@/lib/email';
import type { NotificationRecord } from '@/types/notification';
import { createNotifications } from './notification-service';

jest.mock('@/helpers/supabase/server', () => ({
	createServiceRoleClient: jest.fn(),
}));

jest.mock('@/helpers/partykit/admin', () => ({
	pushPartyKitNotificationEvent: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
	createResendClient: jest.fn(),
}));

type NotificationStatusUpdate = {
	values: Record<string, unknown>;
	matchType: 'eq' | 'in';
	matchKey: string;
	matchValue: unknown;
};

type UserProfileFixture = {
	user_id: string;
	email: string | null;
	display_name: string | null;
	full_name: string | null;
	preferences: Record<string, unknown> | null;
};

type MockAdminClientOptions = {
	createdNotifications: NotificationRecord[];
	profilesById: Record<string, UserProfileFixture>;
};

const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
	typeof createServiceRoleClient
>;
const mockPushPartyKitNotificationEvent =
	pushPartyKitNotificationEvent as jest.MockedFunction<
		typeof pushPartyKitNotificationEvent
	>;
const mockCreateResendClient = createResendClient as jest.MockedFunction<
	typeof createResendClient
>;

function createDeferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
} {
	let resolvePromise: ((value: T) => void) | null = null;
	const promise = new Promise<T>((resolve) => {
		resolvePromise = resolve;
	});

	if (!resolvePromise) {
		throw new Error('Failed to initialize deferred promise');
	}

	return {
		promise,
		resolve: resolvePromise,
	};
}

function buildNotificationRecord(
	overrides: Partial<NotificationRecord> = {}
): NotificationRecord {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		recipient_user_id: '22222222-2222-4222-8222-222222222222',
		actor_user_id: null,
		map_id: null,
		event_type: 'comment_mention',
		title: 'You were mentioned in a comment',
		body: 'Test body',
		metadata: {},
		dedupe_key: 'dedupe-key',
		is_read: false,
		read_at: null,
		email_status: 'pending',
		email_error: null,
		emailed_at: null,
		created_at: '2026-03-05T10:00:00.000Z',
		updated_at: '2026-03-05T10:00:00.000Z',
		...overrides,
	};
}

function createMockAdminClient(options: MockAdminClientOptions): {
	client: ReturnType<typeof createServiceRoleClient>;
	statusUpdates: NotificationStatusUpdate[];
} {
	const statusUpdates: NotificationStatusUpdate[] = [];

	const notificationsTable = {
		upsert: jest.fn(() => ({
			select: jest.fn(async () => ({
				data: options.createdNotifications,
				error: null,
			})),
		})),
		update: jest.fn((values: Record<string, unknown>) => ({
			eq: jest.fn(async (key: string, value: unknown) => {
				statusUpdates.push({
					values,
					matchType: 'eq',
					matchKey: key,
					matchValue: value,
				});
				return { error: null };
			}),
			in: jest.fn(async (key: string, value: unknown) => {
				statusUpdates.push({
					values,
					matchType: 'in',
					matchKey: key,
					matchValue: value,
				});
				return { error: null };
			}),
		})),
	};

	const userProfilesTable = {
		select: jest.fn(() => ({
			eq: jest.fn((_key: string, userId: string) => ({
				maybeSingle: jest.fn(async () => ({
					data: options.profilesById[userId] ?? null,
					error: null,
				})),
			})),
		})),
	};

	const userPreferencesTable = {
		select: jest.fn(() => ({
			eq: jest.fn(() => ({
				maybeSingle: jest.fn(async () => ({
					data: { email_notifications: true },
					error: null,
				})),
			})),
		})),
	};

	const mindMapsTable = {
		select: jest.fn(() => ({
			eq: jest.fn(() => ({
				maybeSingle: jest.fn(async () => ({
					data: { title: 'Fixture Map' },
					error: null,
				})),
			})),
		})),
	};

	const client = {
		from: jest.fn((table: string) => {
			switch (table) {
				case 'notifications':
					return notificationsTable;
				case 'user_profiles':
					return userProfilesTable;
				case 'user_preferences':
					return userPreferencesTable;
				case 'mind_maps':
					return mindMapsTable;
				default:
					throw new Error(`Unexpected table in notification-service test: ${table}`);
			}
		}),
	} as unknown as ReturnType<typeof createServiceRoleClient>;

	return { client, statusUpdates };
}

describe('notification-service createNotifications', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetAllMocks();
		process.env = {
			...originalEnv,
			RESEND_API_KEY: 'test-api-key',
			NEXT_PUBLIC_SITE_URL: 'https://shiko.test',
			NODE_ENV: 'test',
		};
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('waits for both PartyKit dispatch and email processing before resolving', async () => {
		const createdNotification = buildNotificationRecord();
		const { client } = createMockAdminClient({
			createdNotifications: [createdNotification],
			profilesById: {
				[createdNotification.recipient_user_id]: {
					user_id: createdNotification.recipient_user_id,
					email: 'recipient@example.com',
					display_name: 'Recipient',
					full_name: null,
					preferences: {
						notifications: { email: true },
					},
				},
			},
		});
		mockCreateServiceRoleClient.mockReturnValue(client);

		const partyKitDeferred = createDeferred<{
			attempted: boolean;
			delivered: boolean;
		}>();
		mockPushPartyKitNotificationEvent.mockReturnValue(partyKitDeferred.promise);

		const emailDeferred = createDeferred<{ error: null }>();
		const sendMock = jest.fn(() => emailDeferred.promise);
		mockCreateResendClient.mockReturnValue({
			emails: { send: sendMock },
		} as unknown as ReturnType<typeof createResendClient>);

		const pending = createNotifications([
			{
				recipientUserId: createdNotification.recipient_user_id,
				eventType: createdNotification.event_type,
				title: createdNotification.title,
				body: createdNotification.body,
				dedupeKey: createdNotification.dedupe_key,
			},
		]);

		let settled = false;
		pending.then(() => {
			settled = true;
		});

		await Promise.resolve();
		expect(settled).toBe(false);

		partyKitDeferred.resolve({
			attempted: true,
			delivered: true,
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		emailDeferred.resolve({ error: null });
		const result = await pending;
		expect(settled).toBe(true);
		expect(result).toEqual([createdNotification]);
	});

	it('continues email processing when PartyKit dispatch fails', async () => {
		const createdNotification = buildNotificationRecord();
		const { client, statusUpdates } = createMockAdminClient({
			createdNotifications: [createdNotification],
			profilesById: {
				[createdNotification.recipient_user_id]: {
					user_id: createdNotification.recipient_user_id,
					email: 'recipient@example.com',
					display_name: 'Recipient',
					full_name: null,
					preferences: {
						notifications: { email: true },
					},
				},
			},
		});
		mockCreateServiceRoleClient.mockReturnValue(client);
		mockPushPartyKitNotificationEvent.mockRejectedValue(
			new Error('PartyKit unavailable')
		);

		const sendMock = jest.fn(async () => ({ error: null }));
		mockCreateResendClient.mockReturnValue({
			emails: { send: sendMock },
		} as unknown as ReturnType<typeof createResendClient>);

		const result = await createNotifications([
			{
				recipientUserId: createdNotification.recipient_user_id,
				eventType: createdNotification.event_type,
				title: createdNotification.title,
				body: createdNotification.body,
				dedupeKey: createdNotification.dedupe_key,
			},
		]);

		expect(result).toEqual([createdNotification]);
		expect(sendMock).toHaveBeenCalledTimes(1);
		expect(
			statusUpdates.some(
				(update) => update.values.email_status === 'sent' && update.matchType === 'eq'
			)
		).toBe(true);
	});

	it('marks email status as failed when provider returns an error', async () => {
		const createdNotification = buildNotificationRecord();
		const { client, statusUpdates } = createMockAdminClient({
			createdNotifications: [createdNotification],
			profilesById: {
				[createdNotification.recipient_user_id]: {
					user_id: createdNotification.recipient_user_id,
					email: 'recipient@example.com',
					display_name: 'Recipient',
					full_name: null,
					preferences: {
						notifications: { email: true },
					},
				},
			},
		});
		mockCreateServiceRoleClient.mockReturnValue(client);
		mockPushPartyKitNotificationEvent.mockResolvedValue({
			attempted: true,
			delivered: true,
		});

		const sendMock = jest.fn(
			async () =>
				({
					error: { message: 'Resend failure' },
				}) as { error: { message: string } }
		);
		mockCreateResendClient.mockReturnValue({
			emails: { send: sendMock },
		} as unknown as ReturnType<typeof createResendClient>);

		const result = await createNotifications([
			{
				recipientUserId: createdNotification.recipient_user_id,
				eventType: createdNotification.event_type,
				title: createdNotification.title,
				body: createdNotification.body,
				dedupeKey: createdNotification.dedupe_key,
			},
		]);

		expect(result).toEqual([createdNotification]);
		expect(
			statusUpdates.some(
				(update) =>
					update.values.email_status === 'failed' &&
					update.values.email_error === 'Resend failure' &&
					update.matchType === 'eq'
			)
		).toBe(true);
	});

	it('returns early when no notifications were created and skips side effects', async () => {
		const { client } = createMockAdminClient({
			createdNotifications: [],
			profilesById: {},
		});
		mockCreateServiceRoleClient.mockReturnValue(client);
		mockPushPartyKitNotificationEvent.mockResolvedValue({
			attempted: true,
			delivered: true,
		});
		mockCreateResendClient.mockReturnValue({
			emails: { send: jest.fn(async () => ({ error: null })) },
		} as unknown as ReturnType<typeof createResendClient>);

		const result = await createNotifications([
			{
				recipientUserId: '22222222-2222-4222-8222-222222222222',
				eventType: 'comment_mention',
				title: 'You were mentioned in a comment',
				body: 'Test body',
				dedupeKey: 'dedupe-key',
			},
		]);

		expect(result).toEqual([]);
		expect(mockPushPartyKitNotificationEvent).not.toHaveBeenCalled();
		expect(mockCreateResendClient).not.toHaveBeenCalled();
	});
});
