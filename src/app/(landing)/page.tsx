import { FaqSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { FinalCta } from '@/components/landing/final-cta';
import { HeroSection } from '@/components/landing/hero-section';
import { LandingNav } from '@/components/landing/landing-nav';
import { PricingSection } from '@/components/landing/pricing-section';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { ScrollProgress } from '@/components/landing/scroll-progress';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Shiko - Turn Scattered Thoughts Into Shared Structure',
	description:
		'Keyboard-first mind mapping that turns scattered thoughts into shared structure with in-context AI and real-time collaboration.',
	keywords: [
		'mind mapping',
		'AI',
		'knowledge management',
		'collaboration',
		'productivity',
		'brainstorming',
		'PKM',
		'second brain',
	],
	openGraph: {
		title: 'Shiko - Turn Scattered Thoughts Into Shared Structure',
		description:
			'Keyboard-first mind mapping with in-context AI, real-time collaboration, and a flow that keeps up with how you think.',
		type: 'website',
		url: 'https://shiko.app',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Shiko - Turn Scattered Thoughts Into Shared Structure',
		description:
			'Keyboard-first mind mapping with in-context AI and real-time collaboration.',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
};

export default function Home() {
	return (
		<>
			<ScrollProgress />
			<LandingNav />
			<main
				id='main-content'
				className='min-h-screen h-auto flex flex-col bg-background'
			>
				<HeroSection />
				<ProblemSolution />
				<FeaturesSection />
				<PricingSection />
				<FaqSection />
				<FinalCta />
			</main>
		</>
	);
}
