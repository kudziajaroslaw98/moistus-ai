'use client';

import { Button } from '@/components/ui/button';
import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeStepProps {
	onContinue: () => void;
	userName?: string;
}

export function WelcomeStep({ onContinue, userName }: WelcomeStepProps) {
	return (
		<div className='flex flex-col items-center justify-center h-full p-12 text-center'>
			{/* Logo animation - using ease-out-quart for entrance */}
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart from animation guidelines
					delay: 0.1,
				}}
				className='mb-8'
			>
				<div
					className='w-24 h-24 rounded-2xl flex items-center justify-center'
					style={{
						background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.8) 0%, rgba(52, 211, 153, 0.6) 100%)',
						boxShadow: '0 8px 32px rgba(52, 211, 153, 0.2)',
					}}
				>
					<Sparkles
						className='w-12 h-12'
						style={{ color: GlassmorphismTheme.elevation[0] }}
					/>
				</div>
			</motion.div>

			{/* Welcome text */}
			<motion.h1
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.2,
				}}
				className='text-4xl font-bold mb-4'
				style={{ color: GlassmorphismTheme.text.high }}
			>
				Welcome to Moistus AI{userName ? `, ${userName}` : ''}!
			</motion.h1>

			<motion.p
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.3,
				}}
				className='text-xl mb-8 max-w-2xl'
				style={{ color: GlassmorphismTheme.text.medium }}
			>
				Transform your ideas into beautiful mind maps with AI-powered
				intelligence
			</motion.p>

			{/* Feature highlights - staggered entrance */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2, delay: 0.4 }}
				className='space-y-3 mb-12'
			>
				{[
					'✨ AI-powered suggestions to expand your thinking',
					'🚀 Real-time collaboration with your team',
					'🎨 Beautiful, customizable visual layouts',
					'💾 Export to multiple formats',
				].map((feature, index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							duration: 0.2,
							ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
							delay: 0.5 + index * 0.1,
						}}
						style={{ color: GlassmorphismTheme.text.high }}
					>
						{feature}
					</motion.div>
				))}
			</motion.div>

			{/* CTA Button */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.9,
				}}
			>
				<Button
					onClick={onContinue}
					size='lg'
					className='font-semibold px-8 py-3 text-lg transition-all'
					style={{
						backgroundColor: 'rgba(52, 211, 153, 0.8)',
						color: GlassmorphismTheme.elevation[0],
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 1)';
						e.currentTarget.style.transform = 'translateY(-2px)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.8)';
						e.currentTarget.style.transform = 'translateY(0)';
					}}
				>
					Get Started
				</Button>
			</motion.div>
		</div>
	);
}
