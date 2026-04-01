'use client';

import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import {
	motion,
	useReducedMotion,
	useScroll,
	useTransform,
} from 'motion/react';
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

	const backgroundOpacity = useTransform(scrollY, [0, 120], [0.45, 0.95]);
	const borderOpacity = useTransform(scrollY, [0, 120], [0.08, 0.16]);

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
		<motion.header className='fixed left-0 right-0 top-0 z-50'>
			<motion.div
				className='absolute inset-0 bg-background/90 backdrop-blur-xl'
				style={{ opacity: shouldReduceMotion ? 1 : backgroundOpacity }}
			/>
			<motion.div
				className='absolute bottom-0 left-0 right-0 h-px bg-border-subtle'
				style={{ opacity: shouldReduceMotion ? 0.12 : borderOpacity }}
			/>

			<nav className='relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
				<div className='flex h-16 items-center justify-between'>
					<a
						href='/'
						className='text-lg font-semibold text-text-primary hover:text-primary-400 transition-colors duration-200'
					>
						Shiko
					</a>

					<div className='hidden items-center gap-8 sm:flex'>
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

					<div className='flex items-center gap-3'>
						<div className='group hidden sm:block'>
							<a
								href='/dashboard'
								className='inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-neutral-900 shadow-[0_12px_30px_rgba(255,255,255,0.14)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_36px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
							>
								Start Mapping
							</a>
						</div>

						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<button
								type='button'
								onClick={() => setMobileMenuOpen(true)}
								className='-mr-2 rounded-xl border border-white/8 bg-white/[0.04] p-2 text-text-secondary transition-colors duration-200 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden'
								aria-label='Open navigation menu'
								aria-expanded={mobileMenuOpen}
							>
								<Menu aria-hidden='true' className='h-6 w-6' />
							</button>

							<SheetContent
								side='right'
								className='w-[280px] border-l border-border-subtle p-0'
							>
								<SheetHeader className='px-6 pt-6 pb-4 border-b border-border-subtle'>
									<span className='text-lg font-semibold text-text-primary'>
										Shiko
									</span>
								</SheetHeader>

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
										className='inline-flex h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-neutral-900 shadow-[0_12px_30px_rgba(255,255,255,0.14)] transition-all duration-200 hover:shadow-[0_18px_36px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
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
