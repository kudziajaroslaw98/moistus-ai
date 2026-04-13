'use client';

import { SerwistProvider as BaseSerwistProvider } from '@serwist/next/react';
import { createElement, useEffect } from 'react';
import type { ComponentProps } from 'react';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DEV_PWA_FLAG_VALUE = 'true';
const VERCEL_BYPASS_QUERY_KEYS = [
	'_vercel_share',
	'x-vercel-protection-bypass',
	'x-vercel-set-bypass-cookie',
] as const;

function shouldDisableInDevelopment(): boolean {
	if (process.env.NODE_ENV !== 'development') {
		return false;
	}

	return process.env.NEXT_PUBLIC_ENABLE_PWA_DEV !== DEV_PWA_FLAG_VALUE;
}

function getResolvedSwUrl(swUrl: string): string {
	if (typeof window === 'undefined') {
		return swUrl;
	}

	const scriptUrl = new URL(swUrl, window.location.origin);
	const pageUrl = new URL(window.location.href);

	for (const key of VERCEL_BYPASS_QUERY_KEYS) {
		if (scriptUrl.searchParams.has(key)) {
			continue;
		}

		const value = pageUrl.searchParams.get(key);
		if (!value) {
			continue;
		}

		scriptUrl.searchParams.set(key, value);
	}

	return scriptUrl.toString();
}

function isLegacySerwistScript(scriptUrl: string): boolean {
	try {
		const parsedUrl = new URL(scriptUrl);
		return parsedUrl.pathname.startsWith('/serwist/');
	} catch {
		return scriptUrl.includes('/serwist/');
	}
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
	swUrl = '/sw.js',
	...props
}: SerwistProviderProps) {
	const shouldDisableForDev = shouldDisableInDevelopment();
	const shouldDisableForInsecureLan =
		shouldDisableOnInsecureLan(disableOnInsecureDevLan);
	const shouldDisable = shouldDisableForDev || shouldDisableForInsecureLan;
	const resolvedSwUrl = getResolvedSwUrl(swUrl);

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
				console.warn('[serwist] Failed to unregister service workers', error);
			}
		})();
	}, [shouldDisable]);

	useEffect(() => {
		if (shouldDisable) {
			return;
		}
		if (typeof window === 'undefined') {
			return;
		}
		if (!('serviceWorker' in navigator)) {
			return;
		}

		const resolvedPath = new URL(resolvedSwUrl, window.location.origin).pathname;
		if (resolvedPath !== '/sw.js') {
			return;
		}

		void (async () => {
			try {
				const registrations = await navigator.serviceWorker.getRegistrations();
				const unregisterTasks = registrations.map((registration) => {
					const scriptUrl =
						registration.active?.scriptURL ??
						registration.waiting?.scriptURL ??
						registration.installing?.scriptURL;

					if (!scriptUrl || !isLegacySerwistScript(scriptUrl)) {
						return Promise.resolve(false);
					}

					return registration.unregister();
				});

				await Promise.all(unregisterTasks);
			} catch (error) {
				console.warn(
					'[serwist] Failed to clean up legacy /serwist worker registrations',
					error
				);
			}
		})();
	}, [resolvedSwUrl, shouldDisable]);

	return createElement(BaseSerwistProvider, {
		...props,
		swUrl: resolvedSwUrl,
		disable: Boolean(disable) || shouldDisable,
	});
}
