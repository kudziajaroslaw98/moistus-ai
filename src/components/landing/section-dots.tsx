'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const sections = [
	{ id: 'hero', label: 'Home' },
	{ id: 'problem', label: 'Problem' },
	{ id: 'features', label: 'Features' },
	{ id: 'how-it-works', label: 'How It Works' },
	{ id: 'pricing', label: 'Pricing' },
	{ id: 'faq', label: 'FAQ' },
];

export function SectionDots() {
	const [activeSection, setActiveSection] = useState('hero');
	const shouldReduceMotion = useReducedMotion() ?? false;

	useEffect(() => {
		const observers: IntersectionObserver[] = [];

		sections.forEach((section) => {
			const element = document.getElementById(section.id);
			if (!element) return;

			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							setActiveSection(section.id);
						}
					});
				},
				{
					rootMargin: '-40% 0px -40% 0px',
					threshold: 0,
				}
			);

			observer.observe(element);
			observers.push(observer);
		});

		return () => {
			observers.forEach((observer) => observer.disconnect());
		};
	}, []);

	const handleClick = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
		}
	};

	return (
		<div className='fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3'>
			{sections.map((section) => {
				const isActive = activeSection === section.id;

				return (
					<button
						key={section.id}
						onClick={() => handleClick(section.id)}
						className='group relative flex items-center justify-end'
						aria-label={`Go to ${section.label}`}
					>
						{/* Label tooltip */}
						<span className='absolute right-6 px-2 py-1 text-xs font-medium text-text-primary bg-elevated rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none'>
							{section.label}
						</span>

						{/* Dot */}
						<motion.div
							className={`w-2 h-2 rounded-full transition-colors duration-200 ${
								isActive
									? 'bg-primary-500'
									: 'bg-text-tertiary/50 group-hover:bg-text-secondary'
							}`}
							animate={
								shouldReduceMotion
									? {}
									: { scale: isActive ? 1.25 : 1 }
							}
							transition={{ duration: 0.2 }}
						/>
					</button>
				);
			})}
		</div>
	);
}
