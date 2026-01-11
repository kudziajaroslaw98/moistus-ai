import { FaqSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { FinalCta } from '@/components/landing/final-cta';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingNav } from '@/components/landing/landing-nav';
import { PricingSection } from '@/components/landing/pricing-section';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { ScrollProgress } from '@/components/landing/scroll-progress';
import { SectionDots } from '@/components/landing/section-dots';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Moistus AI - AI-Powered Mind Mapping for Power Users',
	description:
		'Transform your thoughts into connected knowledge with AI-powered mind mapping. Real-time collaboration, keyboard-first editor, and AI that thinks with you.',
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
		title: 'Moistus AI - From Scattered Notes to Connected Ideas',
		description:
			'The mind mapping tool for power users. AI-native suggestions, real-time collaboration, and a keyboard-first editor.',
		type: 'website',
		url: 'https://moistus.ai',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Moistus AI - AI-Powered Mind Mapping',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Moistus AI - From Scattered Notes to Connected Ideas',
		description:
			'The mind mapping tool for power users. AI-native suggestions, real-time collaboration.',
		images: ['/og-image.png'],
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
			{/* Skip to content link for accessibility */}
			<a
				href='#features'
				className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-background'
			>
				Skip to content
			</a>
			<ScrollProgress />
			<LandingNav />
			<SectionDots />
			<main id='main-content' className='min-h-screen h-auto flex flex-col bg-background'>
				<HeroSection />
				<ProblemSolution />
				<FeaturesSection />
				<HowItWorks />
				<PricingSection />
				<FaqSection />
				<FinalCta />
			</main>
		</>
	);
}
