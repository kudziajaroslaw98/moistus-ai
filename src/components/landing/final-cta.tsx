'use client';

import { useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { StartMappingLink } from './start-mapping-link';

const footerLinks = [
	{ label: 'How a map grows', href: '#story' },
	{ label: 'Pricing', href: '#pricing' },
	{ label: 'FAQ', href: '#faq' },
	{ label: 'Privacy', href: '/privacy' },
	{ label: 'Terms', href: '/terms' },
];

export function FinalCta() {
	const currentYear = new Date().getFullYear();
	const shouldReduceMotion = useReducedMotion() ?? false;

	const handleLinkClick = (
		e: React.MouseEvent<HTMLAnchorElement>,
		href: string
	) => {
		// Only handle anchor links, let regular links navigate normally
		if (!href.startsWith('#')) return;

		e.preventDefault();
		const targetId = href.replace('#', '');
		const element = document.getElementById(targetId);
		if (element) {
			element.scrollIntoView({
				behavior: shouldReduceMotion ? 'auto' : 'smooth',
			});
		}
	};

	return (
		<footer className='relative overflow-hidden bg-zinc-950'>
			<div className='mx-auto max-w-[1200px] px-6 lg:px-8'>
				<div className='pt-40'>
					<div className='relative overflow-hidden rounded-[28px] border border-white/8 bg-[#040404] px-6 py-24 text-center [background-image:radial-gradient(circle,rgba(255,255,255,0.12)_0.6px,transparent_1px)] [background-size:16px_16px]'>
						<h2 className='font-lora text-[2.5rem] font-semibold leading-none tracking-tight text-text-primary md:text-[4.5rem]'>
							Start with{' '}

							<em className='font-medium text-brand-coral'>one thought.</em>
						</h2>

						<p className='mx-auto mt-5 max-w-lg text-lg leading-relaxed text-text-secondary'>
							Shiko will help you find the rest. Free for personal use.
						</p>

						{/* Decorative: an empty selected node, echoing the hero. */}
						<div
							aria-hidden='true'
							className='mx-auto mt-10 flex h-[66px] w-full max-w-[320px] items-center justify-center rounded-[10px] border border-[rgba(96,165,250,0.3)] bg-[#1e1e1e] bg-[url("/images/groovepaper.png")] bg-repeat bg-blend-color-burn text-[#8b8b94]'
						>
							What are you planning?
							<span className='ml-0.5 h-5 w-0.5 bg-white motion-safe:animate-pulse' />
						</div>

						<div className='group mt-6 inline-block'>
							<StartMappingLink
								showArrow
								arrowClassName='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5'
								className='inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-neutral-900 shadow-[0_12px_36px_rgba(255,255,255,0.12)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_42px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
							/>
						</div>
					</div>
				</div>

				<div className='mt-24 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-7 sm:flex-row'>
					<span className='flex items-center gap-2.5 text-sm font-semibold text-text-primary'>
						<Image alt='' height={18} src='/images/shiko-logo.svg' width={18} />
						Shiko
					</span>

					<nav aria-label='Footer' className='flex flex-wrap items-center justify-center gap-x-6 gap-y-1'>
						{footerLinks.map((link) => (
							<a
								className='rounded-sm py-2.5 text-sm text-text-tertiary transition-colors duration-200 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
								href={link.href}
								key={link.label}
								onClick={(e) => handleLinkClick(e, link.href)}
							>
								{link.label}
							</a>
						))}
					</nav>

					<span suppressHydrationWarning className='text-sm text-text-tertiary'>
						© {currentYear} Shiko
					</span>
				</div>
			</div>
		</footer>
	);
}
