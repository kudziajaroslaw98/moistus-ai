import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Header from '../../components/landing/header';
import HeroSection from '../../components/landing/hero-section';

// Lazy load below-fold components for better performance
const FeaturesGrid = dynamic(
	() => import('../../components/landing/features-grid'),
	{
		ssr: true,
		loading: () => <div className='h-96 bg-zinc-950 animate-pulse' />,
	}
);

const HowItWorksSection = dynamic(
	() => import('../../components/landing/how-it-works-section'),
	{
		ssr: true,
		loading: () => <div className='h-96 bg-zinc-950 animate-pulse' />,
	}
);

const BenefitsSection = dynamic(
	() => import('../../components/landing/benefits-section'),
	{
		ssr: true,
		loading: () => <div className='h-96 bg-zinc-950 animate-pulse' />,
	}
);

const PricingSection = dynamic(
	() => import('../../components/landing/pricing-section'),
	{
		ssr: true,
		loading: () => <div className='h-96 bg-zinc-950 animate-pulse' />,
	}
);

const SocialProofSection = dynamic(
	() => import('../../components/landing/social-proof-section'),
	{
		ssr: true,
		loading: () => <div className='h-96 bg-zinc-950 animate-pulse' />,
	}
);

const CTASection = dynamic(
	() => import('../../components/landing/cta-section'),
	{
		ssr: true,
		loading: () => <div className='h-96 bg-zinc-950 animate-pulse' />,
	}
);

const Footer = dynamic(() => import('../../components/landing/footer'), {
	ssr: true,
	loading: () => <div className='h-64 bg-zinc-950 animate-pulse' />,
});

export const metadata: Metadata = {
	title: 'Moistus AI - Transform Your Thoughts Into Connected Knowledge',
	description:
		'AI-powered mind mapping that understands context, suggests connections, and grows with your ideas. Organize thoughts, collaborate in real-time, and discover insights.',
	keywords: [
		'mind mapping',
		'AI',
		'knowledge management',
		'collaboration',
		'productivity',
		'brainstorming',
		'semantic search',
	],
	openGraph: {
		title: 'Moistus AI - Transform Your Thoughts Into Connected Knowledge',
		description:
			'AI-powered mind mapping that understands context, suggests connections, and grows with your ideas.',
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
		title: 'Moistus AI - Transform Your Thoughts Into Connected Knowledge',
		description:
			'AI-powered mind mapping that understands context, suggests connections, and grows with your ideas.',
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
			<Header />
			<main className='bg-zinc-950'>
				<HeroSection />
				<FeaturesGrid />
				<HowItWorksSection />
				<BenefitsSection />
				<PricingSection />
				<SocialProofSection />
				<CTASection />
			</main>
			<Footer />
		</>
	);
}
