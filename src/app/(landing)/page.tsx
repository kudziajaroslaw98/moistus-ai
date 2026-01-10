import BackgroundEffects from '@/components/waitlist/background-effects';
import MinimalFooter from '@/components/waitlist/minimal-footer';
import {
	HeroSection,
	ProblemSolution,
	FeaturesSection,
	HowItWorks,
	PricingSection,
	FaqSection,
	FinalCta,
} from '@/components/landing';
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
		<main className="relative min-h-screen flex flex-col bg-background">
			<BackgroundEffects />

			<div className="relative z-10">
				<HeroSection />
				<ProblemSolution />
				<FeaturesSection />
				<HowItWorks />
				<PricingSection />
				<FaqSection />
				<FinalCta />
				<MinimalFooter />
			</div>
		</main>
	);
}
