'use client';

import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { Button } from '@/components/ui/button';
import { Brain, Download, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface BenefitsStepProps {
	onContinue: () => void;
	onBack: () => void;
}

interface Benefit {
	id: string;
	icon: React.ElementType;
	title: string;
	description: string;
	gradient: string;
	delay: number;
}

const benefits: Benefit[] = [
	{
		id: 'ai-powered',
		icon: Sparkles,
		title: 'AI-Powered Intelligence',
		description: 'Get smart suggestions and auto-connections',
		gradient:
			'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(147, 51, 234, 0.8) 100%)',
		delay: 0,
	},
	{
		id: 'realtime-collab',
		icon: Users,
		title: 'Real-time Collaboration',
		description: 'Work together seamlessly with your team',
		gradient:
			'linear-gradient(135deg, rgba(96, 165, 250, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%)',
		delay: 0.1,
	},
	{
		id: 'smart-layouts',
		icon: Brain,
		title: 'Smart Layouts',
		description: 'Automatically organize your thoughts',
		gradient:
			'linear-gradient(135deg, rgba(52, 211, 153, 0.8) 0%, rgba(16, 185, 129, 0.8) 100%)',
		delay: 0.2,
	},
	{
		id: 'export-anywhere',
		icon: Download,
		title: 'Export Anywhere',
		description: 'PDF, PNG, Markdown, and more',
		gradient:
			'linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.8) 100%)',
		delay: 0.3,
	},
	{
		id: 'lightning-fast',
		icon: Zap,
		title: 'Lightning Fast',
		description: 'Optimized performance for large maps',
		gradient:
			'linear-gradient(135deg, rgba(234, 179, 8, 0.8) 0%, rgba(202, 138, 4, 0.8) 100%)',
		delay: 0.4,
	},
	{
		id: 'secure-private',
		icon: Shield,
		title: 'Secure & Private',
		description: 'Your data is encrypted and protected',
		gradient:
			'linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(225, 29, 72, 0.8) 100%)',
		delay: 0.5,
	},
];

export function BenefitsStep({ onContinue, onBack }: BenefitsStepProps) {
	return (
		<div className='flex flex-col h-full w-full p-12'>
			{/* Header */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-12'
				initial={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
				}}
			>
				<h2
					className='text-3xl font-bold mb-4'
					style={{ color: GlassmorphismTheme.text.high }}
				>
					Why Teams Love Moistus AI
				</h2>

				<p
					className='text-lg'
					style={{ color: GlassmorphismTheme.text.medium }}
				>
					Everything you need to bring your ideas to life
				</p>
			</motion.div>

			{/* Benefits Grid */}
			<div className='w-full grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 mb-12'>
				{benefits.map((benefit, index) => (
					<motion.div
						animate={{ opacity: 1, y: 0, scale: 1 }}
						className='relative group'
						initial={{ opacity: 0, y: 20, scale: 0.95 }}
						key={benefit.id}
						transition={{
							duration: 0.3,
							ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
							delay: benefit.delay,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'translateY(-4px)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'translateY(0)';
						}}
					>
						<div
							className='h-full rounded-xl p-6'
							style={{
								backgroundColor: GlassmorphismTheme.elevation[1],
								border: `1px solid ${GlassmorphismTheme.borders.default}`,
								backdropFilter: GlassmorphismTheme.effects.glassmorphism,
								transition: GlassmorphismTheme.effects.transition,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor =
									GlassmorphismTheme.borders.hover;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor =
									GlassmorphismTheme.borders.default;
							}}
						>
							<div
								className='w-12 h-12 rounded-lg flex items-center justify-center mb-4'
								style={{
									background: benefit.gradient,
									boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
								}}
							>
								<benefit.icon className='w-6 h-6 text-white' />
							</div>

							<h3
								className='text-lg font-semibold mb-2'
								style={{ color: GlassmorphismTheme.text.high }}
							>
								{benefit.title}
							</h3>

							<p
								className='text-sm'
								style={{ color: GlassmorphismTheme.text.medium }}
							>
								{benefit.description}
							</p>

							{/* Subtle hover glow effect */}
							<div
								className='absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100'
								style={{
									background: GlassmorphismTheme.effects.ambientGlow,
									transition: `opacity ${GlassmorphismTheme.animations.duration.slow} ${GlassmorphismTheme.animations.easing.default}`,
								}}
							/>
						</div>
					</motion.div>
				))}
			</div>

			{/* Navigation */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='flex items-center justify-between'
				initial={{ opacity: 0, y: 20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.6,
				}}
			>
				<Button
					className='transition-colors'
					variant='ghost'
					style={{
						color: GlassmorphismTheme.text.medium,
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
					}}
					onClick={onBack}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = GlassmorphismTheme.text.high;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = GlassmorphismTheme.text.medium;
					}}
				>
					Back
				</Button>

				<Button
					className='font-semibold px-8 transition-all'
					size='lg'
					style={{
						backgroundColor: 'rgba(52, 211, 153, 0.8)',
						color: GlassmorphismTheme.elevation[0],
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
					}}
					onClick={onContinue}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 1)';
						e.currentTarget.style.transform = 'translateY(-2px)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.8)';
						e.currentTarget.style.transform = 'translateY(0)';
					}}
				>
					Continue
				</Button>
			</motion.div>
		</div>
	);
}
