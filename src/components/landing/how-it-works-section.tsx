'use client';

import {
	CheckCircle,
	ChevronRight,
	Link2,
	PlayCircle,
	Plus,
	Share2,
	Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useRef, useState } from 'react';
import {
	fadeInScale,
	scrollReveal,
	staggerContainer,
	staggerItem,
	viewportSettings,
} from './animations';
import DemoVideo from './demo-video';

const steps = [
	{
		id: 'create',
		number: '01',
		title: 'Create Your Mind Map',
		description:
			'Start with a central idea and begin adding nodes. Use text, images, code, or any content type that helps express your thoughts.',
		icon: Plus,
		color: 'from-blue-500 to-cyan-500',
		demo: {
			nodes: [
				{ id: 'center', label: 'Project Ideas', x: 50, y: 50, size: 12 },
				{ id: 'node1', label: 'Research', x: 30, y: 30, size: 8 },
				{ id: 'node2', label: 'Design', x: 70, y: 30, size: 8 },
				{ id: 'node3', label: 'Development', x: 50, y: 70, size: 8 },
			],
			connections: [
				{ from: 'center', to: 'node1' },
				{ from: 'center', to: 'node2' },
				{ from: 'center', to: 'node3' },
			],
		},
	},
	{
		id: 'enhance',
		number: '02',
		title: 'Let AI Enhance Your Ideas',
		description:
			'Our AI suggests connections, generates related content, and helps you discover patterns you might have missed.',
		icon: Sparkles,
		color: 'from-violet-500 to-purple-500',
		demo: {
			nodes: [
				{ id: 'center', label: 'Project Ideas', x: 50, y: 50, size: 12 },
				{ id: 'node1', label: 'Research', x: 30, y: 30, size: 8 },
				{ id: 'node2', label: 'Design', x: 70, y: 30, size: 8 },
				{ id: 'node3', label: 'Development', x: 50, y: 70, size: 8 },
				{
					id: 'ai1',
					label: 'Market Analysis',
					x: 20,
					y: 50,
					size: 6,
					isAI: true,
				},
				{
					id: 'ai2',
					label: 'User Personas',
					x: 80,
					y: 50,
					size: 6,
					isAI: true,
				},
			],
			connections: [
				{ from: 'center', to: 'node1' },
				{ from: 'center', to: 'node2' },
				{ from: 'center', to: 'node3' },
				{ from: 'node1', to: 'ai1', isAI: true },
				{ from: 'node2', to: 'ai2', isAI: true },
			],
		},
	},
	{
		id: 'connect',
		number: '03',
		title: 'Connect & Collaborate',
		description:
			'Link related concepts across different maps, collaborate with your team in real-time, and build knowledge together.',
		icon: Link2,
		color: 'from-emerald-500 to-green-500',
		demo: {
			nodes: [
				{ id: 'map1', label: 'Project Ideas', x: 30, y: 40, size: 10 },
				{ id: 'map2', label: 'Team Goals', x: 70, y: 40, size: 10 },
				{ id: 'user1', label: 'Alice', x: 30, y: 70, size: 6, isUser: true },
				{ id: 'user2', label: 'Bob', x: 70, y: 70, size: 6, isUser: true },
			],
			connections: [
				{ from: 'map1', to: 'map2', isDashed: true },
				{ from: 'user1', to: 'map1' },
				{ from: 'user2', to: 'map2' },
			],
		},
	},
	{
		id: 'share',
		number: '04',
		title: 'Share Your Knowledge',
		description:
			'Export your mind maps, share with stakeholders, or integrate with your favorite tools. Your knowledge, amplified.',
		icon: Share2,
		color: 'from-amber-500 to-orange-500',
		demo: {
			nodes: [
				{ id: 'center', label: 'Knowledge Base', x: 50, y: 50, size: 12 },
				{ id: 'export1', label: 'PDF', x: 30, y: 30, size: 6 },
				{ id: 'export2', label: 'Notion', x: 70, y: 30, size: 6 },
				{ id: 'export3', label: 'Slack', x: 30, y: 70, size: 6 },
				{ id: 'export4', label: 'Docs', x: 70, y: 70, size: 6 },
			],
			connections: [
				{ from: 'center', to: 'export1' },
				{ from: 'center', to: 'export2' },
				{ from: 'center', to: 'export3' },
				{ from: 'center', to: 'export4' },
			],
		},
	},
];

function StepDemo({
	step,
	isActive,
}: {
	step: (typeof steps)[0];
	isActive: boolean;
}) {
	return (
		<div className='relative h-64 w-full'>
			<svg
				className='absolute inset-0 h-full w-full'
				viewBox='0 0 100 100'
				preserveAspectRatio='xMidYMid meet'
			>
				{/* Connections */}
				<AnimatePresence>
					{isActive && (
						<g>
							{step.demo.connections.map((connection, index) => {
								const fromNode = step.demo.nodes.find(
									(n) => n.id === connection.from
								);
								const toNode = step.demo.nodes.find(
									(n) => n.id === connection.to
								);
								if (!fromNode || !toNode) return null;

								return (
									<motion.line
										key={`${connection.from}-${connection.to}`}
										x1={fromNode.x}
										y1={fromNode.y}
										x2={toNode.x}
										y2={toNode.y}
										stroke={connection.isAI ? '#8b5cf6' : '#3b82f6'}
										strokeWidth='0.5'
										strokeDasharray={connection.isDashed ? '2 2' : '0'}
										initial={{ pathLength: 0, opacity: 0 }}
										animate={{ pathLength: 1, opacity: 0.6 }}
										exit={{ pathLength: 0, opacity: 0 }}
										transition={{
											pathLength: { delay: index * 0.1, duration: 0.5 },
											opacity: { delay: index * 0.1, duration: 0.3 },
										}}
									/>
								);
							})}
						</g>
					)}
				</AnimatePresence>

				{/* Nodes */}
				<AnimatePresence>
					{isActive && (
						<g>
							{step.demo.nodes.map((node, index) => (
								<motion.g
									key={node.id}
									initial={{ scale: 0, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0, opacity: 0 }}
									transition={{
										delay: index * 0.1,
										duration: 0.5,
										type: 'spring',
										stiffness: 200,
										damping: 20,
									}}
								>
									<circle
										cx={node.x}
										cy={node.y}
										r={node.size / 2}
										fill={
											node.isAI
												? '#8b5cf6'
												: node.isUser
													? '#10b981'
													: '#3b82f6'
										}
										fillOpacity='0.8'
									/>
									<text
										x={node.x}
										y={node.y}
										textAnchor='middle'
										dominantBaseline='middle'
										fill='#fafafa'
										fontSize={node.size > 8 ? '3' : '2.5'}
										className='font-medium'
									>
										{node.label}
									</text>
								</motion.g>
							))}
						</g>
					)}
				</AnimatePresence>
			</svg>
		</div>
	);
}

function StepCard({
	step,
	index,
	isActive,
	onClick,
}: {
	step: (typeof steps)[0];
	index: number;
	isActive: boolean;
	onClick: () => void;
}) {
	const Icon = step.icon;

	return (
		<motion.div
			variants={staggerItem}
			custom={index}
			onClick={onClick}
			className={`relative cursor-pointer transition-all ${
				isActive ? 'scale-105' : 'scale-100 opacity-75 hover:opacity-100'
			}`}
		>
			<div
				className={`rounded-2xl border ${
					isActive
						? 'border-zinc-700 bg-zinc-900'
						: 'border-zinc-800 bg-zinc-900/50'
				} p-6 transition-all hover:border-zinc-700`}
			>
				{/* Step number */}
				<div className='flex items-center justify-between mb-4'>
					<span
						className={`text-sm font-bold ${
							isActive ? 'text-zinc-300' : 'text-zinc-500'
						}`}
					>
						{step.number}
					</span>
					{isActive && (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							className='flex items-center gap-1 text-xs text-green-500'
						>
							<CheckCircle className='h-4 w-4' />
							<span>Active</span>
						</motion.div>
					)}
				</div>

				{/* Icon */}
				<div
					className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} p-2.5 mb-4`}
				>
					<Icon className='h-full w-full text-white' />
				</div>

				{/* Content */}
				<h3 className='text-lg font-semibold text-zinc-50 mb-2'>
					{step.title}
				</h3>
				<p className='text-sm text-zinc-400 leading-relaxed'>
					{step.description}
				</p>

				{/* Active indicator */}
				{isActive && (
					<motion.div
						className='absolute inset-0 rounded-2xl ring-2 ring-blue-500/50 pointer-events-none'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					/>
				)}
			</div>
		</motion.div>
	);
}

export default function HowItWorksSection() {
	const containerRef = useRef(null);
	const isInView = useInView(containerRef, viewportSettings);
	const [activeStep, setActiveStep] = useState(0);

	return (
		<section
			ref={containerRef}
			id='how-it-works'
			className='relative py-24 sm:py-32 bg-zinc-950 overflow-hidden'
		>
			{/* Background pattern */}
			<div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />

			<div className='relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
					className='text-center mb-16'
				>
					<motion.span
						initial={{ opacity: 0, scale: 0.9 }}
						animate={isInView ? { opacity: 1, scale: 1 } : {}}
						transition={{ delay: 0.1, duration: 0.5 }}
						className='inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20'
					>
						<PlayCircle className='h-4 w-4' />
						How It Works
					</motion.span>
					<motion.h2
						variants={scrollReveal}
						initial='hidden'
						animate={isInView ? 'visible' : 'hidden'}
						className='mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50'
					>
						Four steps to{' '}
						<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500'>
							amplified thinking
						</span>
					</motion.h2>
					<motion.p
						variants={scrollReveal}
						initial='hidden'
						animate={isInView ? 'visible' : 'hidden'}
						transition={{ delay: 0.1 }}
						className='mt-4 text-lg text-zinc-400 max-w-2xl mx-auto'
					>
						Get started in minutes and transform how you capture and connect
						ideas.
					</motion.p>
				</motion.div>

				{/* Interactive Demo Area */}
				<motion.div
					variants={fadeInScale}
					initial='hidden'
					animate={isInView ? 'visible' : 'hidden'}
					className='mb-16'
				>
					<div className='rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8'>
						<StepDemo step={steps[activeStep]} isActive={true} />
					</div>
				</motion.div>

				{/* Steps Grid */}
				<motion.div
					variants={staggerContainer}
					initial='hidden'
					animate={isInView ? 'visible' : 'hidden'}
					className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
				>
					{steps.map((step, index) => (
						<StepCard
							key={step.id}
							step={step}
							index={index}
							isActive={activeStep === index}
							onClick={() => setActiveStep(index)}
						/>
					))}
				</motion.div>

				{/* Demo Video */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ delay: 0.7, duration: 0.6 }}
					className='mt-16'
				>
					<h3 className='text-2xl font-bold text-zinc-50 text-center mb-8'>
						Watch a Quick Demo
					</h3>
					<DemoVideo title='See Moistus AI in Action' duration='2:34' />
				</motion.div>

				{/* CTA */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ delay: 0.9, duration: 0.6 }}
					className='mt-16 text-center'
				>
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className='inline-block'
					>
						<a
							href='/auth/sign-up'
							className='inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-4 text-base font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all group'
						>
							Try It Yourself
							<ChevronRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
						</a>
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}
