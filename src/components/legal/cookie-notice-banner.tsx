'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';

// Kept from the first notice so people who already dismissed it don't see it again.
const STORAGE_KEY = 'shiko_cookie_notice_acknowledged';

/**
 * Pages where someone can meet Shiko for the first time. The notice stays off
 * the legal pages (they explain it already) and off the signed-in app.
 */
function isPublicEntryPath(pathname: string | null): boolean {
	if (!pathname) return false;
	return (
		pathname === '/' ||
		pathname === '/auth' ||
		pathname.startsWith('/auth/') ||
		pathname === '/join' ||
		pathname.startsWith('/join/')
	);
}

function readAcknowledged(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'true';
	} catch {
		// Storage can be blocked (private modes, site settings): show the notice.
		return false;
	}
}

function subscribeToStorage(onChange: () => void) {
	window.addEventListener('storage', onChange);
	return () => window.removeEventListener('storage', onChange);
}

function writeAcknowledged() {
	try {
		localStorage.setItem(STORAGE_KEY, 'true');
	} catch {
		// Blocked storage: it stays dismissed until the page is reloaded.
	}
}

/**
 * Cookie and storage notice.
 *
 * Shiko stores only what it needs to sign people in and keep their work
 * (see "Cookies and Browser Storage" in the privacy policy), which needs no
 * consent under the EU ePrivacy rules. This is an information notice, not a
 * consent banner: there is nothing to accept or refuse. If Shiko ever adds
 * anything that isn't needed (analytics, ads), it needs a real consent choice
 * first, and this copy stops being true.
 */
export function CookieNoticeBanner() {
	// Server and hydration read "acknowledged" so nothing flashes in before the
	// saved choice is known; another tab dismissing it hides it here too.
	const acknowledged = useSyncExternalStore(
		subscribeToStorage,
		readAcknowledged,
		() => true
	);
	// Covers blocked storage, where the saved choice can't be written.
	const [dismissedHere, setDismissedHere] = useState(false);
	const pathname = usePathname();
	const reducedMotion = useReducedMotion() ?? false;

	const handleAcknowledge = () => {
		setDismissedHere(true);
		writeAcknowledged();
	};

	const shouldShow =
		!acknowledged && !dismissedHere && isPublicEntryPath(pathname);
	const offsetY = reducedMotion ? 0 : 8;

	return (
		<AnimatePresence>
			{shouldShow && (
				<motion.section
					key='cookie-notice'
					aria-label='About cookies'
					initial={{ opacity: 0, y: offsetY }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: offsetY }}
					className='fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 rounded-[14px] border border-[#292929] bg-[#0f0f11] px-4 py-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[340px] sm:p-4'
					transition={{
						duration: reducedMotion ? 0.1 : 0.25,
						ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
					}}
				>
					<p className='text-sm leading-5 text-zinc-300'>
						Shiko only stores what it needs to sign you in and keep your work.
						No ads, no analytics, nothing that follows you to other sites.
					</p>

					<div className='mt-3 flex items-center justify-between gap-3 sm:mt-3.5'>
						<Link
							href='/privacy#cookies'
							className='inline-flex min-h-11 items-center rounded-sm text-sm text-text-primary underline decoration-white/35 underline-offset-[3px] transition-colors duration-200 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f11] sm:min-h-0'
						>
							What we store
						</Link>

						<button
							type='button'
							onClick={handleAcknowledge}
							className='h-11 rounded-[10px] bg-white px-5 text-sm font-semibold text-neutral-900 transition-colors duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f11] sm:h-9 sm:px-4'
						>
							Got it
						</button>
					</div>
				</motion.section>
			)}
		</AnimatePresence>
	);
}
