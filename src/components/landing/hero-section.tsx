'use client';

import { ArrowRight, Play } from 'lucide-react';
import { motion, useAnimation, useInView } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
	fadeIn,
	heroButtonReveal,
	heroTextReveal,
	pulse,
	viewportSettings,
} from './animations';
import CompanyLogos from './company-logos';

// Mind map node data for visualization
const mindMapNodes = [
	{ id: '1', x: 50, y: 50, size: 60, delay: 0, label: 'Ideas' },
	{ id: '2', x: 25, y: 30, size: 40, delay: 0.2, label: 'Research' },
	{ id: '3', x: 75, y: 25, size: 45, delay: 0.3, label: 'Planning' },
	{ id: '4', x: 20, y: 70, size: 35, delay: 0.4, label: 'Tasks' },
	{ id: '5', x: 80, y: 65, size: 50, delay: 0.5, label: 'Goals' },
	{ id: '6', x: 50, y: 80, size: 40, delay: 0.6, label: 'Insights' },
];

const connections = [
	{ from: '1', to: '2', delay: 0.7 },
	{ from: '1', to: '3', delay: 0.8 },
	{ from: '1', to: '4', delay: 0.9 },
	{ from: '1', to: '5', delay: 1.0 },
	{ from: '1', to: '6', delay: 1.1 },
	{ from: '2', to: '4', delay: 1.2 },
	{ from: '3', to: '5', delay: 1.3 },
];

function AnimatedMindMap() {
	const svgRef = useRef<SVGSVGElement>(null);
	const controls = useAnimation();
	const isInView = useInView(svgRef, viewportSettings);

	useEffect(() => {
		if (isInView) {
			controls.start('visible');
		}
	}, [isInView, controls]);

	return (
		<div className='relative h-[600px] w-full max-w-4xl'>
			{/* Gradient background */}
			<div className='absolute inset-0 bg-gradient-to-br from-blue-500/30 via-violet-500/30 to-transparent rounded-3xl' />

			{/* SVG Mind Map */}
			<svg
				ref={svgRef}
				className='absolute inset-0 h-full w-full'
				viewBox='0 0 100 100'
				preserveAspectRatio='xMidYMid meet'
			>
				{/* Connections */}
				<g className='connections'>
					{connections.map((connection, index) => {
						const fromNode = mindMapNodes.find((n) => n.id === connection.from);
						const toNode = mindMapNodes.find((n) => n.id === connection.to);
						if (!fromNode || !toNode) return null;

						return (
							<motion.line
								key={`${connection.from}-${connection.to}`}
								x1={fromNode.x}
								y1={fromNode.y}
								x2={toNode.x}
								y2={toNode.y}
								stroke='url(#gradient)'
								strokeWidth='0.5'
								initial={{ pathLength: 0, opacity: 0 }}
								animate={controls}
								variants={{
									visible: {
										pathLength: 1,
										opacity: 0.6,
										transition: {
											pathLength: { delay: connection.delay, duration: 0.5 },
											opacity: { delay: connection.delay, duration: 0.3 },
										},
									},
								}}
							/>
						);
					})}
				</g>

				{/* Gradient definition */}
				<defs>
					<linearGradient id='gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
						<stop offset='0%' stopColor='#3b82f6' />
						<stop offset='100%' stopColor='#8b5cf6' />
					</linearGradient>
				</defs>

				{/* Nodes */}
				<g className='nodes'>
					{mindMapNodes.map((node) => (
						<motion.g
							key={node.id}
							initial={{ scale: 0, opacity: 0 }}
							animate={controls}
							variants={{
								visible: {
									scale: 1,
									opacity: 1,
									transition: {
										delay: node.delay,
										duration: 0.5,
										type: 'spring',
										stiffness: 200,
										damping: 20,
									},
								},
							}}
						>
							<motion.circle
								cx={node.x}
								cy={node.y}
								r={node.size / 10}
								fill='url(#gradient)'
								fillOpacity='0.8'
								animate={{
									scale: [1, 1.1, 1],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									delay: node.delay * 2,
								}}
							/>
							<circle
								cx={node.x}
								cy={node.y}
								r={node.size / 10 + 1}
								fill='none'
								stroke='url(#gradient)'
								strokeWidth='0.2'
								opacity='0.5'
							/>
							<text
								x={node.x}
								y={node.y}
								textAnchor='middle'
								dominantBaseline='middle'
								fill='#fafafa'
								fontSize='2'
								className='font-medium'
							>
								{node.label}
							</text>
						</motion.g>
					))}
				</g>
			</svg>
		</div>
	);
}

export default function HeroSection() {
	const containerRef = useRef(null);
	const isInView = useInView(containerRef, { once: true, margin: '-100px' });

	return (
		<section
			ref={containerRef}
			className='relative min-h-screen overflow-hidden bg-zinc-950 pt-24 pb-24'
		>
			{/* Background gradient mesh */}
			<div className='absolute inset-0'>
				<div className='absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl' />
				<div className='absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl' />
				<motion.div
					className='absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-full blur-3xl'
					animate={{
						x: ['-50%', '-55%', '-50%'],
						y: ['-50%', '-45%', '-50%'],
					}}
					transition={{
						duration: 20,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
			</div>

			{/* Grid pattern overlay */}
			<div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

			{/* Content */}
			<div className='relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24'>
				<div className='grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center'>
					{/* Left column - Text content */}
					<motion.div
						initial='hidden'
						animate={isInView ? 'visible' : 'hidden'}
						className='text-center lg:text-left lg:col-span-5'
					>
						{/* Headline */}
						<motion.h1
							variants={heroTextReveal}
							className='text-4xl sm:text-5xl lg:text-6xl xl:text-5xl font-bold text-zinc-50 leading-tight'
						>
							Transform Your Thoughts Into{' '}
							<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500'>
								Connected Knowledge
							</span>
						</motion.h1>

						{/* Subheadline */}
						<motion.p
							variants={heroTextReveal}
							transition={{ delay: 0.1 }}
							className='mt-8 text-lg sm:text-xl lg:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto lg:mx-0'
						>
							AI-powered mind mapping that understands context, suggests
							connections, and grows with your ideas. Organize thoughts,
							collaborate in real-time, and discover insights you never knew
							existed.
						</motion.p>

						{/* CTA Buttons */}
						<motion.div
							variants={heroButtonReveal}
							className='mt-12 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'
						>
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								variants={pulse}
								animate='animate'
							>
								<Link
									href='/auth/sign-up'
									className='inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-4 text-base font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all group'
								>
									Start Mapping for Free
									<ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
								</Link>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
							>
								<button
									onClick={() =>
										document
											.getElementById('how-it-works')
											?.scrollIntoView({ behavior: 'smooth' })
									}
									className='inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/50 backdrop-blur-sm px-8 py-4 text-base font-medium text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-50 hover:border-zinc-600 transition-all group'
								>
									<Play className='mr-2 h-5 w-5' />
									See How It Works
								</button>
							</motion.div>
						</motion.div>

						{/* Trust indicators */}
						<motion.div
							variants={fadeIn}
							transition={{ delay: 0.6 }}
							className='mt-16 flex flex-wrap items-center gap-8 justify-center lg:justify-start text-sm text-zinc-500'
						>
							<div className='flex items-center gap-2'>
								<svg
									className='h-5 w-5 text-green-500'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path
										fillRule='evenodd'
										d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
										clipRule='evenodd'
									/>
								</svg>
								<span>No credit card required</span>
							</div>
							<div className='flex items-center gap-2'>
								<svg
									className='h-5 w-5 text-green-500'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path
										fillRule='evenodd'
										d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
										clipRule='evenodd'
									/>
								</svg>
								<span>14-day free trial</span>
							</div>
							<div className='flex items-center gap-2'>
								<svg
									className='h-5 w-5 text-green-500'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path
										fillRule='evenodd'
										d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
										clipRule='evenodd'
									/>
								</svg>
								<span>Cancel anytime</span>
							</div>
						</motion.div>
					</motion.div>

					{/* Right column - Animated Mind Map */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={isInView ? { opacity: 1, scale: 1 } : {}}
						transition={{ delay: 0.3, duration: 0.8 }}
						className='relative flex justify-center lg:justify-center lg:col-span-7'
					>
						<AnimatedMindMap />
					</motion.div>
				</div>
			</div>

			{/* Company Logos */}
			<div className='relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20'>
				<CompanyLogos />
			</div>

			{/* Scroll indicator */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 1.5, duration: 0.5 }}
				className='absolute bottom-8 left-1/2 transform -translate-x-1/2'
			>
				<motion.div
					animate={{ y: [0, 10, 0] }}
					transition={{ duration: 2, repeat: Infinity }}
					className='flex flex-col items-center gap-2 text-zinc-500'
				>
					<span className='text-sm'>Scroll to explore</span>
					<svg
						className='h-6 w-6'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M19 14l-7 7m0 0l-7-7m7 7V3'
						/>
					</svg>
				</motion.div>
			</motion.div>
		</section>
	);
}
