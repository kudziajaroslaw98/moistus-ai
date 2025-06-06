'use client';

import { cn } from '@/lib/utils';
import { CollaborationUser } from '@/types/sharing-types';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface UserCursorProps {
	user: CollaborationUser;
	position: { x: number; y: number };
	color: string;
	isActive: boolean;
	showLabel?: boolean;
	className?: string;
}

// Generate a consistent color for a user based on their ID
export function getUserCursorColor(userId: string): string {
	const colors = [
		'#f87171', // red-400
		'#fb923c', // orange-400
		'#fbbf24', // amber-400
		'#34d399', // emerald-400
		'#60a5fa', // blue-400
		'#818cf8', // indigo-400
		'#a78bfa', // violet-400
		'#f472b6', // pink-400
	];

	// Simple hash function to get consistent color
	let hash = 0;

	for (let i = 0; i < userId.length; i++) {
		hash = (hash << 5) - hash + userId.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}

	return colors[Math.abs(hash) % colors.length];
}

// Cursor SVG component
function CursorSvg({ color }: { color: string }) {
	return (
		<svg
			className='absolute top-0 left-0'
			width='24'
			height='36'
			viewBox='0 0 24 36'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<defs>
				<filter id='cursorShadow' x='-50%' y='-50%' width='200%' height='200%'>
					<feDropShadow dx='1' dy='1' stdDeviation='1' floodOpacity='0.2' />
				</filter>
			</defs>

			<path
				d='M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z'
				fill={color}
				stroke='white'
				strokeWidth='1'
				filter='url(#cursorShadow)'
			/>
		</svg>
	);
}

export function UserCursor({
	user,
	position,
	color,
	isActive,
	showLabel = true,
	className,
}: UserCursorProps) {
	const [isHovered, setIsHovered] = useState(false);
	const labelRef = useRef<HTMLDivElement>(null);
	const cursorRef = useRef<HTMLDivElement>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Auto-hide label after 3 seconds of no movement
	useEffect(() => {
		if (showLabel && isActive) {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				setIsHovered(false);
			}, 3000);
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [position, showLabel, isActive]);

	// Ensure label stays within viewport bounds
	useEffect(() => {
		if (labelRef.current && (showLabel || isHovered)) {
			const label = labelRef.current;
			const rect = label.getBoundingClientRect();
			const padding = 8;

			// Check right edge
			if (rect.right > window.innerWidth - padding) {
				label.style.transform = `translateX(-${rect.right - window.innerWidth + padding}px)`;
			}

			// Check bottom edge
			if (rect.bottom > window.innerHeight - padding) {
				label.style.bottom = '100%';
				label.style.top = 'auto';
				label.style.marginBottom = '8px';
				label.style.marginTop = '0';
			}
		}
	}, [position, showLabel, isHovered]);

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	if (!isActive) {
		return null;
	}

	return (
		<AnimatePresence>
			<motion.div
				ref={cursorRef}
				className={cn('absolute pointer-events-none z-50', className)}
				initial={{ scale: 0, opacity: 0 }}
				animate={{
					x: position.x,
					y: position.y,
					scale: 1,
					opacity: 1,
				}}
				exit={{ scale: 0, opacity: 0 }}
				transition={{
					type: 'spring',
					stiffness: 600,
					damping: 28,
					mass: 0.5,
					restDelta: 0.001,
				}}
				onHoverStart={() => setIsHovered(true)}
				onHoverEnd={() => setIsHovered(false)}
				style={{
					transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
				}}
			>
				{/* Cursor */}
				<motion.div
					animate={{
						scale: isHovered ? 1.2 : 1,
					}}
					transition={{
						type: 'spring',
						stiffness: 400,
						damping: 17,
					}}
				>
					<CursorSvg color={color || getUserCursorColor(user.id)} />
				</motion.div>

				{/* Label */}
				<AnimatePresence>
					{(showLabel || isHovered) && (
						<motion.div
							ref={labelRef}
							initial={{ opacity: 0, scale: 0.8, y: 5 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.8, y: 5 }}
							transition={{
								type: 'spring',
								stiffness: 500,
								damping: 30,
							}}
							className='absolute left-6 top-2 pointer-events-auto'
							style={{ transformOrigin: 'left center' }}
						>
							<div
								className='flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg'
								style={{
									backgroundColor: color || getUserCursorColor(user.id),
									boxShadow: `0 2px 10px ${color || getUserCursorColor(user.id)}40`,
								}}
								onMouseEnter={() => setIsHovered(true)}
								onMouseLeave={() => setIsHovered(false)}
							>
								{/* Avatar */}
								<div className='flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white text-xs font-medium'>
									{user.avatar_url ? (
										<img
											src={user.avatar_url}
											alt={user.display_name}
											className='w-full h-full rounded-full object-cover'
										/>
									) : (
										<span>{getInitials(user.display_name)}</span>
									)}
								</div>

								{/* Name */}
								<span className='text-white text-sm font-medium whitespace-nowrap'>
									{user.display_name}
								</span>

								{/* Activity indicator */}
								{user.current_activity && user.current_activity !== 'idle' && (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className='flex items-center justify-center w-4 h-4 rounded-full bg-white/30'
									>
										<motion.div
											className='w-2 h-2 rounded-full bg-white'
											animate={{
												scale: [1, 1.2, 1],
												opacity: [0.7, 1, 0.7],
											}}
											transition={{
												duration: 1.5,
												repeat: Infinity,
											}}
										/>
									</motion.div>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Click ripple effect */}
				<AnimatePresence>
					{isHovered && (
						<motion.div
							initial={{ scale: 0, opacity: 0.5 }}
							animate={{ scale: 3, opacity: 0 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.5 }}
							className='absolute top-2 left-2 w-4 h-4 rounded-full pointer-events-none'
							style={{
								backgroundColor: color || getUserCursorColor(user.id),
							}}
						/>
					)}
				</AnimatePresence>
			</motion.div>
		</AnimatePresence>
	);
}

// Cursor layer component to manage multiple cursors
interface CursorLayerProps {
	users: CollaborationUser[];
	currentUserId: string;
	className?: string;
}

export function CursorLayer({
	users,
	currentUserId,
	className,
}: CursorLayerProps) {
	const [userPositions, setUserPositions] = useState<
		Record<string, { x: number; y: number }>
	>({});

	// Filter out current user
	const otherUsers = users.filter((u) => u.id !== currentUserId);

	// Listen for cursor position updates (this would come from your real-time system)
	useEffect(() => {
		const handleCursorUpdate = (
			event: CustomEvent<{
				userId: string;
				position: { x: number; y: number };
			}>
		) => {
			const { userId, position } = event.detail;
			setUserPositions((prev) => ({
				...prev,
				[userId]: position,
			}));
		};

		window.addEventListener('cursorUpdate' as any, handleCursorUpdate);

		return () => {
			window.removeEventListener('cursorUpdate' as any, handleCursorUpdate);
		};
	}, []);

	return (
		<div className={cn('fixed inset-0 pointer-events-none z-50', className)}>
			{otherUsers.map((user) => {
				const position = userPositions[user.id];
				if (!position) return null;

				return (
					<UserCursor
						key={user.id}
						user={user}
						position={position}
						color={getUserCursorColor(user.id)}
						isActive={true}
						showLabel={true}
					/>
				);
			})}
		</div>
	);
}
