'use client';

import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

const navLinks = [
	{ label: 'Features', href: '#features' },
	{ label: 'Pricing', href: '#pricing' },
	{ label: 'FAQ', href: '#faq' },
];

export function LandingNav() {
	const { scrollY } = useScroll();
	const shouldReduceMotion = useReducedMotion() ?? false;

	// Background opacity: transparent at top, solid after 100px scroll
	const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 1]);
	const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.1]);

	const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
		e.preventDefault();
		const targetId = href.replace('#', '');
		const element = document.getElementById(targetId);
		if (element) {
			element.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
		}
	};

	return (
		<motion.header
			className='fixed top-0 left-0 right-0 z-50'
			style={{
				backgroundColor: shouldReduceMotion
					? 'rgb(var(--background))'
					: undefined,
			}}
		>
			{/* Background with scroll-based opacity */}
			{!shouldReduceMotion && (
				<motion.div
					className='absolute inset-0 bg-background backdrop-blur-md'
					style={{ opacity: backgroundOpacity }}
				/>
			)}

			{/* Bottom border */}
			<motion.div
				className='absolute bottom-0 left-0 right-0 h-px bg-border-subtle'
				style={{ opacity: shouldReduceMotion ? 0.1 : borderOpacity }}
			/>

			{/* Nav content */}
			<nav className='relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex items-center justify-between h-16'>
					{/* Logo */}
					<a
						href='/'
						className='text-lg font-semibold text-text-primary hover:text-primary-400 transition-colors duration-200'
					>
						Moistus
					</a>

					{/* Center links - hidden on mobile */}
					<div className='hidden sm:flex items-center gap-8'>
						{navLinks.map((link) => (
							<a
								key={link.label}
								href={link.href}
								onClick={(e) => handleNavClick(e, link.href)}
								className='text-sm text-text-secondary hover:text-text-primary transition-colors duration-200'
							>
								{link.label}
							</a>
						))}
					</div>

					{/* CTA */}
					<a
						href='/try'
						className='inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary-600 hover:bg-primary-500 text-white transition-all duration-200'
					>
						Try Free
					</a>
				</div>
			</nav>
		</motion.header>
	);
}
