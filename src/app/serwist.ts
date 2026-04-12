'use client';

import { SerwistProvider as BaseSerwistProvider } from '@serwist/turbopack/react';
import { createElement, useEffect } from 'react';
import type { ComponentProps } from 'react';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEV_PWA_FLAG_VALUE = 'true';

function shouldDisableInDevelopment(): boolean {
	if (process.env.NODE_ENV !== 'development') {
		return false;
	}

	return process.env.NEXT_PUBLIC_ENABLE_PWA_DEV !== DEV_PWA_FLAG_VALUE;
}

function shouldDisableOnInsecureLan(
	disableOnInsecureDevLan: boolean
): boolean {
	if (!disableOnInsecureDevLan) {
		return false;
	}
	if (typeof window === 'undefined') {
		return false;
	}
	if (process.env.NODE_ENV !== 'development') {
		return false;
	}
	if (window.location.protocol === 'https:') {
		return false;
	}

	const hostname = window.location.hostname.toLowerCase();
	return !LOOPBACK_HOSTS.has(hostname);
}

export type SerwistProviderProps = ComponentProps<typeof BaseSerwistProvider> & {
	disableOnInsecureDevLan?: boolean;
};

export function SerwistProvider({
	disableOnInsecureDevLan = true,
	disable,
	...props
}: SerwistProviderProps) {
	const shouldDisableForDev = shouldDisableInDevelopment();
	const shouldDisableForInsecureLan =
		shouldDisableOnInsecureLan(disableOnInsecureDevLan);
	const shouldDisable = shouldDisableForDev || shouldDisableForInsecureLan;

	useEffect(() => {
		if (!shouldDisable) {
			return;
		}
		if (typeof window === 'undefined') {
			return;
		}
		if (!('serviceWorker' in navigator)) {
			return;
		}

		void (async () => {
			try {
				const registrations = await navigator.serviceWorker.getRegistrations();
				await Promise.all(
					registrations.map((registration) => registration.unregister())
				);
			} catch (error) {
				console.warn('[serwist] Failed to unregister dev service workers', error);
			}
		})();
	}, [shouldDisable]);

	return createElement(BaseSerwistProvider, {
		...props,
		disable: Boolean(disable) || shouldDisable,
	});
}
