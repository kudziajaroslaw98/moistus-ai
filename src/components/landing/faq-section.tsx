'use client';

import { ChevronDown } from 'lucide-react';
import {
	AnimatePresence,
	motion,
	useInView,
	useReducedMotion,
} from 'motion/react';
import { useRef, useState } from 'react';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const faqs = [
	{
		question: 'Is my data private?',
		answer:
			"Yes. Your maps are private by default. Only you and people you explicitly invite can see them. We don't train AI on your data.",
	},
	{
		question: 'What happens when I hit the free limit?',
		answer:
			'You can still view and edit existing maps. To create new maps or add more nodes, upgrade to Pro or delete old maps.',
	},
	{
		question: 'Can I export my data?',
		answer:
			'Yes. Free users get PNG/SVG export. Pro users get PDF and JSON export. You can download all your data anytime.',
	},
	{
		question: 'How does real-time collaboration work?',
		answer:
			'Share a room code with teammates. They join instantly — no account required for viewers. Edits sync in real-time.',
	},
	{
		question: 'What AI features are included in Pro?',
		answer:
			'AI suggests new nodes, connections between ideas, and helps expand your thinking. 100 suggestions per month, refreshes monthly.',
	},
];

function FaqItem({
	faq,
	index,
	isInView,
	shouldReduceMotion,
}: {
	faq: (typeof faqs)[0];
	index: number;
	isInView: boolean;
	shouldReduceMotion: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<motion.div
			initial={
				shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
			}
			animate={isInView ? { opacity: 1, y: 0 } : {}}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { duration: 0.3, ease: EASE_OUT_QUART, delay: index * 0.1 }
			}
			className='border-b border-border-subtle last:border-b-0'
		>
			<button
				type='button'
				onClick={() => setIsOpen(!isOpen)}
				className='w-full py-5 flex items-center justify-between text-left group'
			>
				<span className='text-lg font-medium text-text-primary group-hover:text-primary-400 transition-colors duration-200'>
					{faq.question}
				</span>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { type: 'spring', stiffness: 300, damping: 20 }
					}
				>
					<ChevronDown className='h-5 w-5 text-text-tertiary transition-colors duration-200 group-hover:text-primary-400' />
				</motion.div>
			</button>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={
							shouldReduceMotion ? { opacity: 1 } : { height: 0, opacity: 0 }
						}
						animate={
							shouldReduceMotion
								? { opacity: 1 }
								: { height: 'auto', opacity: 1 }
						}
						exit={
							shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
						}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.2, ease: EASE_OUT_QUART }
						}
						className='overflow-hidden'
					>
						<p className='pb-5 text-text-secondary leading-relaxed'>
							{faq.answer}
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

export function FaqSection() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			id='faq'
			ref={ref}
			className='relative py-32 px-4 sm:px-6 lg:px-8 bg-surface/50'
		>
			<SectionDecoration variant='faq' />
			<div className='relative z-10 max-w-2xl mx-auto'>
				{/* Header */}
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
					}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.3, ease: EASE_OUT_QUART }
					}
					className='text-center mb-12'
				>
					<h2 className='font-lora text-3xl md:text-4xl font-bold text-text-primary mb-4'>
						Frequently Asked Questions
					</h2>
				</motion.div>

				{/* FAQ items */}
				<div
					className='rounded-xl border border-border-subtle bg-surface/50 backdrop-blur-sm px-6'
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
					}}
				>
					{faqs.map((faq, index) => (
						<FaqItem
							key={faq.question}
							faq={faq}
							index={index}
							isInView={isInView}
							shouldReduceMotion={shouldReduceMotion}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
