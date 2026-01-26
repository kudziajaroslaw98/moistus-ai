'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { MapAccessErrorType } from '@/store/app-state';
import { cn } from '@/utils/cn';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';

interface AccessRevokedPageProps {
	isAnonymous: boolean;
	errorType: MapAccessErrorType;
}

// Animation easing following guidelines
const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;

// Illustrated lock/shield SVG component
function AccessIllustration() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.svg
			animate={
				shouldReduceMotion
					? {}
					: {
							y: [0, -8, 0],
						}
			}
			className='w-48 h-48 text-zinc-600'
			fill='none'
			transition={
				shouldReduceMotion
					? {}
					: {
							duration: 4,
							ease: 'easeInOut',
							repeat: Infinity,
						}
			}
			viewBox='0 0 200 200'
			xmlns='http://www.w3.org/2000/svg'
		>
			{/* Background circle */}
			<circle
				className='fill-zinc-800/50'
				cx='100'
				cy='100'
				r='90'
			/>

			{/* Shield shape */}
			<path
				className='fill-zinc-700/80 stroke-zinc-600'
				d='M100 30 L160 55 L160 100 C160 140 130 170 100 180 C70 170 40 140 40 100 L40 55 L100 30Z'
				strokeWidth='2'
			/>

			{/* Lock body */}
			<rect
				className='fill-zinc-600'
				height='45'
				rx='6'
				width='50'
				x='75'
				y='95'
			/>

			{/* Lock shackle */}
			<path
				className='stroke-zinc-500'
				d='M85 95 L85 75 C85 60 115 60 115 75 L115 95'
				fill='none'
				strokeLinecap='round'
				strokeWidth='8'
			/>

			{/* Keyhole */}
			<circle
				className='fill-zinc-800'
				cx='100'
				cy='115'
				r='8'
			/>
			<rect
				className='fill-zinc-800'
				height='15'
				rx='2'
				width='6'
				x='97'
				y='118'
			/>

			{/* Decorative elements */}
			<circle
				className='fill-primary-500/20'
				cx='45'
				cy='45'
				r='8'
			/>
			<circle
				className='fill-sky-500/20'
				cx='155'
				cy='45'
				r='6'
			/>
			<circle
				className='fill-violet-500/20'
				cx='165'
				cy='155'
				r='10'
			/>
			<circle
				className='fill-amber-500/20'
				cx='35'
				cy='145'
				r='7'
			/>
		</motion.svg>
	);
}

// Not found illustration variant
function NotFoundIllustration() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.svg
			animate={
				shouldReduceMotion
					? {}
					: {
							rotate: [0, 5, -5, 0],
						}
			}
			className='w-48 h-48 text-zinc-600'
			fill='none'
			transition={
				shouldReduceMotion
					? {}
					: {
							duration: 6,
							ease: 'easeInOut',
							repeat: Infinity,
						}
			}
			viewBox='0 0 200 200'
			xmlns='http://www.w3.org/2000/svg'
		>
			{/* Background circle */}
			<circle
				className='fill-zinc-800/50'
				cx='100'
				cy='100'
				r='90'
			/>

			{/* Document shape */}
			<rect
				className='fill-zinc-700/80 stroke-zinc-600'
				height='100'
				rx='8'
				strokeWidth='2'
				width='80'
				x='60'
				y='50'
			/>

			{/* Fold corner */}
			<path
				className='fill-zinc-600'
				d='M120 50 L140 70 L120 70 Z'
			/>

			{/* Question mark */}
			<text
				className='fill-zinc-500'
				dominantBaseline='middle'
				fontSize='48'
				fontWeight='bold'
				textAnchor='middle'
				x='100'
				y='110'
			>
				?
			</text>

			{/* Decorative dots */}
			<circle
				className='fill-rose-500/20'
				cx='45'
				cy='55'
				r='8'
			/>
			<circle
				className='fill-amber-500/20'
				cx='155'
				cy='65'
				r='6'
			/>
			<circle
				className='fill-violet-500/20'
				cx='160'
				cy='145'
				r='10'
			/>
		</motion.svg>
	);
}

export function AccessRevokedPage({
	isAnonymous,
	errorType,
}: AccessRevokedPageProps) {
	const shouldReduceMotion = useReducedMotion();

	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.3, ease: easeOutCubic };

	const isAccessDenied = errorType === 'access_denied';
	const isNotFound = errorType === 'not_found';

	// Copy based on error type and user type
	const content = {
		access_denied: {
			headline: isAnonymous
				? 'This session has ended'
				: 'Access no longer available',
			body: isAnonymous
				? 'Your access to this mind map is no longer available. The share link may have expired or been revoked by the owner.'
				: 'You no longer have permission to view this mind map. The owner may have changed the sharing settings.',
			primaryCta: isAnonymous
				? { label: 'Create Free Account', href: '/auth/signup' }
				: { label: 'Go to My Maps', href: '/dashboard' },
			secondaryCta: isAnonymous
				? { label: 'Back to Home', href: '/' }
				: { label: 'Create New Map', href: '/dashboard?new=true' },
		},
		not_found: {
			headline: 'Mind map not found',
			body: "This mind map doesn't exist or may have been deleted. Please check the URL or contact the person who shared it with you.",
			primaryCta: isAnonymous
				? { label: 'Create Free Account', href: '/auth/signup' }
				: { label: 'Go to My Maps', href: '/dashboard' },
			secondaryCta: isAnonymous
				? { label: 'Back to Home', href: '/' }
				: { label: 'Create New Map', href: '/dashboard?new=true' },
		},
		network_error: {
			headline: 'Connection error',
			body: 'We had trouble loading this mind map. Please check your internet connection and try again.',
			primaryCta: { label: 'Try Again', href: '' },
			secondaryCta: isAnonymous
				? { label: 'Back to Home', href: '/' }
				: { label: 'Go to My Maps', href: '/dashboard' },
		},
	};

	const currentContent = content[errorType];

	const handleRetry = () => {
		window.location.reload();
	};

	return (
		<div className='flex h-full w-full items-center justify-center bg-zinc-950'>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='flex flex-col items-center text-center max-w-md px-6'
				initial={{ opacity: 0, y: 20 }}
				transition={transition}
			>
				{/* Illustration */}
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='mb-8'
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ ...transition, delay: 0.1 }}
				>
					{isNotFound ? <NotFoundIllustration /> : <AccessIllustration />}
				</motion.div>

				{/* Headline */}
				<motion.h1
					animate={{ opacity: 1, y: 0 }}
					className='text-2xl font-semibold text-white mb-3'
					initial={{ opacity: 0, y: 10 }}
					transition={{ ...transition, delay: 0.15 }}
				>
					{currentContent.headline}
				</motion.h1>

				{/* Body */}
				<motion.p
					animate={{ opacity: 1, y: 0 }}
					className='text-zinc-400 text-sm leading-relaxed mb-8'
					initial={{ opacity: 0, y: 10 }}
					transition={{ ...transition, delay: 0.2 }}
				>
					{currentContent.body}
				</motion.p>

				{/* CTAs */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'
					initial={{ opacity: 0, y: 10 }}
					transition={{ ...transition, delay: 0.25 }}
				>
					{errorType === 'network_error' ? (
						<Button
							className='w-full sm:w-auto'
							onClick={handleRetry}
							size='lg'
							variant='default'
						>
							{currentContent.primaryCta.label}
						</Button>
					) : (
						<Link
							className={cn(
								buttonVariants({ variant: 'default', size: 'lg' }),
								'w-full sm:w-auto'
							)}
							href={currentContent.primaryCta.href}
						>
							{currentContent.primaryCta.label}
						</Link>
					)}

					<Link
						className={cn(
							buttonVariants({ variant: 'outline', size: 'lg' }),
							'w-full sm:w-auto'
						)}
						href={currentContent.secondaryCta.href}
					>
						{currentContent.secondaryCta.label}
					</Link>
				</motion.div>

				{/* Additional help for anonymous users */}
				{isAnonymous && isAccessDenied && (
					<motion.p
						animate={{ opacity: 1 }}
						className='mt-8 text-xs text-zinc-500'
						initial={{ opacity: 0 }}
						transition={{ ...transition, delay: 0.3 }}
					>
						Create an account to build your own mind maps and collaborate with
						others.
					</motion.p>
				)}
			</motion.div>
		</div>
	);
}
