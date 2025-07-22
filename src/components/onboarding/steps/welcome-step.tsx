'use client';

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeStepProps {
	onContinue: () => void;
	userName?: string;
}

export function WelcomeStep({ onContinue, userName }: WelcomeStepProps) {
	return (
		<div className='flex flex-col items-center justify-center h-full p-12 text-center'>
			{/* Logo animation */}
			<motion.div
				initial={{ scale: 0, rotate: -180 }}
				animate={{ scale: 1, rotate: 0 }}
				transition={{
					type: 'spring',
					stiffness: 260,
					damping: 20,
					delay: 0.1,
				}}
				className='mb-8'
			>
				<div className='w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center'>
					<Sparkles className='w-12 h-12 text-zinc-900' />
				</div>
			</motion.div>

			{/* Welcome text */}
			<motion.h1
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3 }}
				className='text-4xl font-bold text-zinc-50 mb-4'
			>
				Welcome to Moistus AI{userName ? `, ${userName}` : ''}!
			</motion.h1>

			<motion.p
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className='text-xl text-zinc-400 mb-8 max-w-2xl'
			>
				Transform your ideas into beautiful mind maps with AI-powered
				intelligence
			</motion.p>

			{/* Feature highlights with typewriter effect */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.6 }}
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
						transition={{ delay: 0.7 + index * 0.1 }}
						className='text-zinc-300'
					>
						{feature}
					</motion.div>
				))}
			</motion.div>

			{/* CTA Button */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 1.2 }}
			>
				<Button
					onClick={onContinue}
					size='lg'
					className='bg-teal-500 hover:bg-teal-600 text-zinc-900 font-semibold px-8 py-3 text-lg'
				>
					Get Started
				</Button>
			</motion.div>
		</div>
	);
}
