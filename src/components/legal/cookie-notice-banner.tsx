'use client';

import { Cookie, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'shiko_cookie_notice_acknowledged';

/**
 * Check if user prefers reduced motion.
 * Returns true on server or if preference is set.
 */
function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * GDPR-compliant cookie notice banner.
 *
 * Shiko uses essential cookies only (authentication, payments).
 * This is an informational notice, not a consent banner, since
 * essential cookies don't require opt-in under GDPR Art. 6(1)(b).
 */
export function CookieNoticeBanner() {
	const [isDismissed, setIsDismissed] = useState(true); // SSR-safe default
	const pathname = usePathname();

	useEffect(() => {
		// Check if user has already acknowledged
		const acknowledged = localStorage.getItem(STORAGE_KEY);
		setIsDismissed(acknowledged === 'true');
	}, []);

	const handleAcknowledge = () => {
		setIsDismissed(true);
		localStorage.setItem(STORAGE_KEY, 'true');
	};

	// Hide on legal pages - user is already reading privacy details
	const isLegalPage = pathname === '/privacy' || pathname === '/terms';
	const shouldShow = !isDismissed && !isLegalPage;

	const reducedMotion = prefersReducedMotion();

	return (
		<AnimatePresence>
			{shouldShow && (
				<motion.div
					key="cookie-notice"
					role="region"
					aria-label="Cookie notice"
					aria-live="polite"
					initial={reducedMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
					animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
					exit={reducedMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
					transition={{
						duration: reducedMotion ? 0.1 : 0.3,
						ease: reducedMotion ? 'linear' : [0.215, 0.61, 0.355, 1], // ease-out-cubic
					}}
					className="fixed bottom-4 left-4 right-4 mx-auto z-50 pointer-events-none max-w-2xl"
				>
				<div className="pointer-events-auto relative overflow-hidden rounded-lg border border-teal-500/20 bg-zinc-900/95 backdrop-blur-md shadow-lg">
					{/* Glassmorphic overlay */}
					<div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent" />

					<div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3">
						{/* Left: Icon + Message */}
						<div className="flex items-start sm:items-center gap-3">
							<div className="shrink-0 rounded-full bg-teal-500/20 p-2">
								<Cookie className="h-4 w-4 text-teal-400" />
							</div>
							<p className="text-sm text-zinc-300">
								<span className="sm:hidden">
									Essential cookies only. No tracking.{' '}
								</span>
								<span className="hidden sm:inline">
									We use essential cookies only — for authentication and
									payment processing. No tracking.{' '}
								</span>
								<Link
									href="/privacy"
									className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors duration-200"
								>
									Learn more
								</Link>
							</p>
						</div>

						{/* Right: Acknowledge + Dismiss */}
						<div className="flex items-center gap-2 self-end sm:self-auto">
							<button
								onClick={handleAcknowledge}
								className="shrink-0 rounded-md bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 ease-out"
							>
								Got it
							</button>
							<button
								onClick={handleAcknowledge}
								className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors duration-200 ease-out"
								aria-label="Dismiss cookie notice"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					</div>
				</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
