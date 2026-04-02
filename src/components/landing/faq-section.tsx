'use client';

import { ChevronDown } from 'lucide-react';
import {
	AnimatePresence,
	motion,
	useInView,
	useReducedMotion,
} from 'motion/react';
import { useRef, useState } from 'react';

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
			'Yes. Export your maps as PNG or SVG — free for everyone. Pro users also get PDF and JSON data export. Plus, you can download a full copy of all your account data anytime (GDPR-ready).',
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

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((faq) => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer,
			},
		})),
	};

	return (
		<section
			id='faq'
			ref={ref}
			className='relative bg-surface/55 px-6 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-24'
		>
			<script type='application/ld+json'>{JSON.stringify(faqJsonLd)}</script>
			<div className='relative z-10 mx-auto max-w-6xl'>
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
					className='overflow-visible rounded-none border-0 bg-transparent px-0 py-0 shadow-none md:overflow-hidden md:rounded-[2rem] md:border md:border-white/8 md:bg-[linear-gradient(180deg,rgba(13,16,22,0.94),rgba(9,11,16,0.88))] md:px-10 md:py-10 md:shadow-[0_20px_70px_rgba(0,0,0,0.24)]'
				>
					<div className='grid gap-8 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-12'>
						<div className='mx-auto max-w-sm text-center lg:mx-0 lg:text-left'>
							<p className='text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-primary-300/70'>
								Questions
							</p>
							<h2 className='mt-5 text-balance font-lora text-[2.35rem] font-bold leading-[0.98] tracking-tight text-text-primary md:text-[3.15rem]'>
								Common questions, direct answers.
							</h2>
							<p className='mt-4 text-[1.03rem] leading-7 text-text-secondary'>
								Privacy, limits, exports, and AI. The answers most people need
								before they start.
							</p>
						</div>

						<div className='border-t border-white/8 pt-2 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0'>
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
				</motion.div>
			</div>
		</section>
	);
}
