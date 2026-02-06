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
		<footer className='relative bg-surface'>
			{/* Subtle gradient accent at top */}
			<div className='absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent' />

			<div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
				{/* CTA Section */}
				<div className='py-28 text-center'>
					<h2 className='font-lora text-2xl sm:text-3xl font-bold text-text-primary mb-3'>
						Ready to connect your ideas?
					</h2>
					<p className='text-base text-text-secondary mb-8'>
						Start free. No credit card required.
					</p>
					<div className='group inline-block'>
						<a
							href='/dashboard'
							className='inline-flex items-center gap-2 justify-center px-8 py-3.5 text-base font-semibold rounded-lg bg-white text-neutral-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] translate-y-0 transition-all duration-200 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] group-hover:-translate-y-0.5'
						>
							Start Mapping
							<ArrowRight
								aria-hidden='true'
								className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5'
							/>
						</a>
					</div>
				</div>

				{/* Footer bar */}
				<div className='py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4'>
					{/* Left: Brand */}
					<span className='text-sm font-medium text-text-primary'>Shiko</span>

					{/* Center: Links */}
					<nav className='flex items-center gap-6'>
						{footerLinks.map((link) => (
							<a
								key={link.label}
								href={link.href}
								onClick={(e) => handleLinkClick(e, link.href)}
								className='text-sm text-text-tertiary hover:text-text-primary transition-colors duration-200'
							>
								{link.label}
							</a>
						))}
					</nav>

					{/* Right: Copyright */}
					<span className='text-sm text-text-tertiary' suppressHydrationWarning>
						© {currentYear} Shiko
					</span>
				</div>
			</div>
		</footer>
	);
}
