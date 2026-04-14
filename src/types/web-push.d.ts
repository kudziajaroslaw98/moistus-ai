declare module 'web-push' {
	export interface PushSubscription {
		endpoint: string;
		expirationTime?: number | null;
		keys: {
			p256dh: string;
			auth: string;
		};
	}

	export interface SendNotificationOptions {
		TTL?: number;
		urgency?: 'very-low' | 'low' | 'normal' | 'high';
		topic?: string;
	}

	export function setVapidDetails(
		subject: string,
		publicKey: string,
		privateKey: string
	): void;

	export function sendNotification(
		subscription: PushSubscription,
		payload?: string,
		options?: SendNotificationOptions
	): Promise<unknown>;

	const webPush: {
		setVapidDetails: typeof setVapidDetails;
		sendNotification: typeof sendNotification;
	};

	export default webPush;
}
