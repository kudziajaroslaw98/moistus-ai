'use client';

import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useState } from 'react';

const navLinks = [
	{ label: 'Features', href: '#features' },
	{ label: 'Pricing', href: '#pricing' },
	{ label: 'FAQ', href: '#faq' },
];

export function LandingNav() {
	const { scrollY } = useScroll();
	const shouldReduceMotion = useReducedMotion() ?? false;
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	// Background opacity: transparent at top, solid after 100px scroll
	const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 1]);
	const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.1]);

	const handleNavClick = (
		e: React.MouseEvent<HTMLAnchorElement>,
		href: string
	) => {
		e.preventDefault();
		const targetId = href.replace('#', '');
		const element = document.getElementById(targetId);
		if (element) {
			element.scrollIntoView({
				behavior: shouldReduceMotion ? 'auto' : 'smooth',
			});
			// Close mobile menu after navigation
			setMobileMenuOpen(false);
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
						Shiko
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

					{/* Right side: CTA + Mobile hamburger */}
					<div className='flex items-center gap-3'>
						{/* CTA - hidden on mobile, shown on desktop */}
						<div className='hidden sm:block group'>
							<a
								href='/dashboard'
								className='inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary-600 group-hover:bg-primary-500 text-white shadow-[0_2px_10px_rgba(96,165,250,0.2)] translate-y-0 transition-all duration-200 group-hover:shadow-[0_4px_20px_rgba(96,165,250,0.35)] group-hover:-translate-y-0.5'
							>
								Start Mapping
							</a>
						</div>

						{/* Mobile hamburger menu */}
						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<button
								type='button'
								onClick={() => setMobileMenuOpen(true)}
								className='sm:hidden p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md'
								aria-label='Open navigation menu'
								aria-expanded={mobileMenuOpen}
							>
								<Menu aria-hidden='true' className='h-6 w-6' />
							</button>

							<SheetContent side='right' className='w-[280px] p-0'>
								<SheetHeader className='px-6 pt-6 pb-4 border-b border-border-subtle'>
									<span className='text-lg font-semibold text-text-primary'>
										Shiko
									</span>
								</SheetHeader>

								{/* Mobile nav links */}
								<nav className='flex flex-col px-4 py-4'>
									{navLinks.map((link) => (
										<a
											key={link.label}
											href={link.href}
											onClick={(e) => handleNavClick(e, link.href)}
											className='block py-3 px-2 text-base text-text-secondary hover:text-text-primary hover:bg-elevated/50 rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
										>
											{link.label}
										</a>
									))}
								</nav>

								<SheetFooter className='px-6 pb-6 mt-auto border-t border-border-subtle pt-4'>
									<a
										href='/dashboard'
										onClick={() => setMobileMenuOpen(false)}
										className='w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md bg-primary-600 hover:bg-primary-500 text-white transition-[background-color] duration-200'
									>
										Start Mapping
									</a>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</nav>
		</motion.header>
	);
}
