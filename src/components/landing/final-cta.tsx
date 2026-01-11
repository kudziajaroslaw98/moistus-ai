'use client';

import { useReducedMotion } from 'motion/react';

const footerLinks = [
	{ label: 'Features', href: '#features' },
	{ label: 'Pricing', href: '#pricing' },
	{ label: 'FAQ', href: '#faq' },
];

export function FinalCta() {
	const currentYear = new Date().getFullYear();
	const shouldReduceMotion = useReducedMotion() ?? false;

	const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
		e.preventDefault();
		const targetId = href.replace('#', '');
		const element = document.getElementById(targetId);
		if (element) {
			element.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
		}
	};

	return (
		<footer className='relative bg-background'>
			{/* Subtle gradient accent at top */}
			<div className='absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent' />

			<div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
				{/* CTA Section */}
				<div className='py-32 text-center'>
					<h2 className='text-2xl sm:text-3xl font-bold text-text-primary mb-3'>
						Ready to connect your ideas?
					</h2>
					<p className='text-base text-text-secondary mb-6'>
						Start free. No credit card required.
					</p>
					<a
						href='/try'
						className='inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-md bg-primary-600 hover:bg-primary-500 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(96,165,250,0.35)]'
					>
						Try Free
					</a>
				</div>

				{/* Footer bar */}
				<div className='py-6 flex flex-col sm:flex-row items-center justify-between gap-4'>
					{/* Left: Brand */}
					<span className='text-sm font-medium text-text-primary'>Moistus</span>

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
					<span className='text-sm text-text-tertiary'>
						© {currentYear} Moistus
					</span>
				</div>
			</div>
		</footer>
	);
}
