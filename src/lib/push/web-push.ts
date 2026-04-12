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
): Promise<boolean> => {
	if (!configureWebPush()) {
		return false;
	}

	const payload = JSON.stringify(buildDeclarativePayload(input.payload));

	try {
		await webpush.sendNotification(input.subscription, payload, {
			TTL: 60,
			urgency: 'normal',
			topic: input.payload.tag || 'shiko-notification',
		});
		return true;
	} catch (error) {
		console.warn('[push] web-push send failed', error);
		return false;
	}
};

export const isWebPushConfigured = (): boolean => configureWebPush();

