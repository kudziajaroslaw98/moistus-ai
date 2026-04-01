'use client';

import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

const footerLinks = [
	{ label: 'Features', href: '#features' },
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
		<footer className='relative overflow-hidden bg-background'>
			<div className='absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent' />

			<div className='mx-auto max-w-6xl px-6 sm:px-6 lg:px-8'>
				<div className='py-14 sm:py-16'>
					<div className='relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(16,20,28,0.94),rgba(10,12,18,0.88))] px-6 py-10 shadow-[0_20px_70px_rgba(0,0,0,0.28)] md:px-10 md:py-12'>
						<div className='absolute inset-x-[12%] top-8 h-28 rounded-full bg-primary-500/10 blur-3xl' />
						<div className='relative flex flex-col gap-8 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left'>
							<div className='mx-auto max-w-2xl lg:mx-0'>
								<p className='text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-primary-300/70'>
									Start on the real canvas
								</p>
								<h2 className='mx-auto mt-5 max-w-[15ch] text-balance font-lora text-[2.35rem] font-bold leading-[0.98] tracking-tight text-text-primary md:max-w-[14ch] md:text-[3.35rem] lg:mx-0 lg:max-w-[12ch]'>
									Open a blank map. Leave with structure.
								</h2>
								<p className='mx-auto mt-4 max-w-[34rem] text-[1.03rem] leading-7 text-text-secondary lg:mx-0'>
									Open a map, capture the raw material, and let Shiko carry it
									from loose notes to connected work without changing tools.
								</p>
							</div>

							<div className='group inline-block'>
								<a
									href='/dashboard'
									className='inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-neutral-900 shadow-[0_12px_36px_rgba(255,255,255,0.14)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_42px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
								>
									Start Mapping
									<ArrowRight
										aria-hidden='true'
										className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5'
									/>
								</a>
							</div>
						</div>
					</div>
				</div>

				<div className='flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-6 sm:flex-row'>
					<span className='text-sm font-medium text-text-primary'>Shiko</span>

					<nav className='flex items-center gap-6'>
						{footerLinks.map((link) => (
							<a
								key={link.label}
								href={link.href}
								onClick={(e) => handleLinkClick(e, link.href)}
								className='text-sm text-text-tertiary hover:text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm'
							>
								{link.label}
							</a>
						))}
					</nav>

					<span className='text-sm text-text-tertiary' suppressHydrationWarning>
						© {currentYear} Shiko
					</span>
				</div>
			</div>
		</footer>
	);
}
