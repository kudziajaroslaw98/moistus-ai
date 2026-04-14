import webpush from 'web-push';

interface SendWebPushInput {
	subscription: {
		endpoint: string;
		expirationTime?: number | null;
		keys: {
			p256dh: string;
			auth: string;
		};
	};
	payload: {
		title: string;
		body: string;
		navigate: string;
		tag?: string;
	};
}

export type WebPushDeliveryResult =
	| {
			success: true;
	  }
	| {
			success: false;
			error: string;
			statusCode?: number;
	  };

let configured = false;

const getVapidConfig = () => {
	const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
	const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
	const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@shiko.app';

	if (!publicKey || !privateKey) {
		return null;
	}

	return {
		publicKey,
		privateKey,
		subject,
	};
};

const configureWebPush = (): boolean => {
	if (configured) {
		return true;
	}

	const config = getVapidConfig();
	if (!config) {
		return false;
	}

	webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
	configured = true;
	return true;
};

export const buildDeclarativePayload = (input: SendWebPushInput['payload']) => {
	return {
		web_push: 8030,
		notification: {
			title: input.title,
			body: input.body,
			navigate: input.navigate,
			tag: input.tag || 'shiko-notification',
			icon: '/icons/icon-192x192.png',
			badge: '/icons/badge-96x96.png',
		},
		shiko: input,
	};
};

export const sendWebPushNotification = async (
	input: SendWebPushInput
): Promise<WebPushDeliveryResult> => {
	if (!configureWebPush()) {
		return {
			success: false,
			error: 'Web push is not configured for this environment.',
		};
	}

	const payload = JSON.stringify(buildDeclarativePayload(input.payload));

	try {
		await webpush.sendNotification(input.subscription, payload, {
			TTL: 60,
			urgency: 'normal',
			topic: input.payload.tag || 'shiko-notification',
		});
		return { success: true };
	} catch (error) {
		console.warn('[push] web-push send failed', error);
		const statusCode =
			typeof error === 'object' &&
			error !== null &&
			'statusCode' in error &&
			typeof (error as { statusCode?: unknown }).statusCode === 'number'
				? (error as { statusCode: number }).statusCode
				: undefined;

		return {
			success: false,
			error:
				error instanceof Error ? error.message : 'Unknown web-push delivery failure',
			statusCode,
		};
	}
};

export const isWebPushConfigured = (): boolean => configureWebPush();
