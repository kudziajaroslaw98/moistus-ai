/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_SYNC_TAG = 'shiko-offline-sync';

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: defaultCache,
	fallbacks: {
		entries: [
			{
				url: '/~offline',
				matcher({ request }) {
					return request.destination === 'document';
				},
			},
		],
	},
});

serwist.addEventListeners();

self.addEventListener('message', (event) => {
	const data = event.data as { type?: string } | undefined;
	if (data?.type === 'SKIP_WAITING') {
		void self.skipWaiting();
	}
});

self.addEventListener('sync', (event) => {
	if (event.tag !== OFFLINE_SYNC_TAG) {
		return;
	}

	event.waitUntil(
		(async () => {
			const clientList = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true,
			});
			clientList.forEach((client) => {
				client.postMessage({
					type: 'OFFLINE_SYNC_REQUEST',
				});
			});
		})()
	);
});

type DeclarativeNotificationPayload = {
	web_push?: number;
	notification?: {
		title?: string;
		body?: string;
		navigate?: string;
		tag?: string;
		icon?: string;
		badge?: string;
		data?: Record<string, unknown>;
	};
	shiko?: {
		title?: string;
		body?: string;
		navigate?: string;
		tag?: string;
		mapId?: string | null;
	};
};

const resolveNotificationPayload = (payload: DeclarativeNotificationPayload) => {
	const declarative = payload.notification;
	const shiko = payload.shiko;
	const title = declarative?.title || shiko?.title || 'Shiko update';
	const body = declarative?.body || shiko?.body || 'You have a new notification.';
	const navigate =
		declarative?.navigate ||
		shiko?.navigate ||
		(shiko?.mapId ? `/mind-map/${shiko.mapId}` : '/dashboard');
	const icon = declarative?.icon || '/icons/icon-192x192.png';
	const badge = declarative?.badge || '/icons/badge-96x96.png';
	const tag = declarative?.tag || shiko?.tag || 'shiko-notification';

	return {
		title,
		options: {
			body,
			icon,
			badge,
			tag,
			data: {
				navigate,
			},
		} satisfies NotificationOptions,
	};
};

self.addEventListener('push', (event) => {
	if (!event.data) {
		return;
	}

	event.waitUntil(
		(async () => {
			try {
				const payload = event.data?.json() as DeclarativeNotificationPayload;
				const { title, options } = resolveNotificationPayload(payload);
				await self.registration.showNotification(title, options);
			} catch (error) {
				console.warn('[sw] Failed to parse push payload', error);
				await self.registration.showNotification('Shiko update', {
					body: 'Open Shiko to review new activity.',
					icon: '/icons/icon-192x192.png',
					badge: '/icons/badge-96x96.png',
					data: {
						navigate: '/dashboard',
					},
				});
			}
		})()
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		(async () => {
			const rawNavigate = event.notification.data?.navigate;
			const navigate =
				typeof rawNavigate === 'string' && rawNavigate.length > 0
					? rawNavigate
					: '/dashboard';

			const allClients = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true,
			});

			const existingClient = allClients.find((client) => {
				const clientUrl = new URL(client.url);
				return clientUrl.pathname === navigate;
			});

			if (existingClient) {
				await existingClient.focus();
				return;
			}

			await self.clients.openWindow(navigate);
		})()
	);
});
