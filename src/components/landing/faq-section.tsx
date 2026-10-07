'use client';

import { Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { Reveal } from './reveal';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const faqs = [
	{
		question: 'Is my data private?',
		answer:
			"Yes. Maps are private by default. Only you and the people you invite can see them. A plugin that connects to another site only does so when someone editing the map adds or refreshes it, and it sends only what's typed into it to the site it names. We don't train AI on your data.",
	},
	{
		question: 'What happens when I hit the free limit?',
		answer:
			'You can still view and edit your existing maps. To create new maps or add more nodes, upgrade to Pro or delete old maps.',
	},
	{
		question: 'Can I export my data?',
		answer:
			'Yes. PNG and SVG export is free for everyone; Pro adds PDF and JSON. You can also download a full copy of your account data at any time.',
	},
	{
		question: 'How does real-time collaboration work?',
		answer:
			'Share a room code with your team. They join instantly, with no account needed for viewers, and every edit syncs live.',
	},
	{
		question: 'What AI features come with Pro?',
		answer:
			'Expand ideas into new nodes, find connections, generate counterpoints and spot similar nodes. You get 100 suggestions a month, refreshed monthly.',
	},
];

function FaqItem({
	faq,
	defaultOpen,
	shouldReduceMotion,
}: {
	faq: (typeof faqs)[0];
	defaultOpen: boolean;
	shouldReduceMotion: boolean;
}) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const answerId = useId();

	return (
		<div className='border-b border-white/8'>
			<h3>
				<button
					aria-controls={answerId}
					aria-expanded={isOpen}
					className='group flex w-full items-center justify-between gap-4 rounded-sm py-[22px] text-left text-lg font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'
					onClick={() => setIsOpen((open) => !open)}
					type='button'
				>
					{faq.question}

					<motion.span
						animate={{ rotate: isOpen ? 45 : 0 }}
						aria-hidden='true'
						className='flex-none'
						initial={false}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { type: 'spring', stiffness: 400, damping: 32 }
						}
					>
						<Plus className='size-[18px] text-text-tertiary transition-colors duration-200 group-hover:text-text-primary' />
					</motion.span>
				</button>
			</h3>

			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						animate={{ height: 'auto', opacity: 1 }}
						className='overflow-hidden'
						exit={{ height: 0, opacity: 0 }}
						id={answerId}
						initial={{ height: 0, opacity: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.2, ease: EASE_OUT_QUART }
						}
					>
						<p className='pb-6 pr-10 text-base leading-[1.65] text-text-secondary'>
							{faq.answer}
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export function FaqSection() {
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
			aria-labelledby='faq-title'
			className='px-6 pt-40 lg:px-8'
			id='faq'
		>
			<script type='application/ld+json'>{JSON.stringify(faqJsonLd)}</script>

			<Reveal className='mx-auto flex max-w-[1200px] flex-wrap gap-x-14 gap-y-10'>
				<div className='max-w-[380px] flex-[1_1_300px]'>
					<p className='font-mono text-xs uppercase tracking-[0.14em] text-text-tertiary'>
						Questions
					</p>

					<h2
						className='mt-4 font-lora text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl'
						id='faq-title'
					>
						Straight answers.
					</h2>

					<p className='mt-4 text-base leading-[1.65] text-text-secondary'>
						Privacy, limits, exports and AI: what people ask before they start.
					</p>
				</div>

				<div className='min-w-0 flex-[999_1_560px] border-t border-white/8'>
					{faqs.map((faq, index) => (
						<FaqItem
							defaultOpen={index === 0}
							faq={faq}
							key={faq.question}
							shouldReduceMotion={shouldReduceMotion}
						/>
					))}
				</div>
			</Reveal>
		</section>
	);
}
