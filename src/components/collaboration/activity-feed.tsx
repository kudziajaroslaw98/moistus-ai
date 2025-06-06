'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import useAppStore from '@/contexts/mind-map/mind-map-store';
import { cn } from '@/lib/utils';
import {
	ActivityActionType,
	ActivityItem as CollaborationActivityItem,
} from '@/types/collaboration-types';
import {
	Activity,
	ChevronRight,
	Edit3,
	Eye,
	Filter,
	MessageSquare,
	MousePointer2,
	Sparkles,
	UserMinus,
	UserPlus,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getUserCursorColor } from './user-cursor';

// Map ActivityActionType to simplified types for UI
export type ActivityType =
	| 'join'
	| 'leave'
	| 'edit'
	| 'comment'
	| 'view'
	| 'cursor_move'
	| 'selection';

// UI-specific activity item interface
export interface UIActivityItem {
	id: string;
	type: ActivityType;
	userId: string;
	userName: string;
	userAvatar?: string;
	timestamp: Date;
	details?: {
		nodeId?: string;
		nodeName?: string;
		comment?: string;
		changes?: string[];
		position?: { x: number; y: number };
	};
	isGrouped?: boolean;
	groupCount?: number;
}

// Map ActivityActionType to ActivityType
const mapActionTypeToUIType = (
	actionType: ActivityActionType
): ActivityType => {
	const typeMap: Partial<Record<ActivityActionType, ActivityType>> = {
		create_node: 'edit',
		update_node: 'edit',
		delete_node: 'edit',
		move_node: 'edit',
		create_comment: 'comment',
		update_comment: 'comment',
		map_share: 'join',
	};
	return typeMap[actionType] || 'view';
};

// Convert CollaborationActivityItem to UIActivityItem
const mapToUIActivity = (
	activity: CollaborationActivityItem
): UIActivityItem => {
	return {
		id: activity.id,
		type: mapActionTypeToUIType(activity.action_type),
		userId: activity.user_id,
		userName:
			activity.user?.name ||
			activity.metadata?.user_profile?.display_name ||
			'Anonymous',
		userAvatar:
			activity.user?.avatar_url || activity.metadata?.user_profile?.avatar_url,
		timestamp: new Date(activity.created_at),
		details: {
			nodeId: activity.target_id,
			nodeName: activity.target_id, // Would need to look up node name
			changes: activity.change_summary ? [activity.change_summary] : undefined,
		},
	};
};

interface ActivityFeedProps {
	mapId: string;
	maxItems?: number;
	showFilters?: boolean;
	compact?: boolean;
	className?: string;
}

// Activity type configuration
const activityConfig = {
	join: {
		icon: UserPlus,
		color: 'text-green-400',
		bgColor: 'bg-green-400/10',
		label: 'joined',
	},
	leave: {
		icon: UserMinus,
		color: 'text-red-400',
		bgColor: 'bg-red-400/10',
		label: 'left',
	},
	edit: {
		icon: Edit3,
		color: 'text-blue-400',
		bgColor: 'bg-blue-400/10',
		label: 'edited',
	},
	comment: {
		icon: MessageSquare,
		color: 'text-yellow-400',
		bgColor: 'bg-yellow-400/10',
		label: 'commented',
	},
	view: {
		icon: Eye,
		color: 'text-purple-400',
		bgColor: 'bg-purple-400/10',
		label: 'viewing',
	},
	cursor_move: {
		icon: MousePointer2,
		color: 'text-zinc-400',
		bgColor: 'bg-zinc-400/10',
		label: 'moved cursor',
	},
	selection: {
		icon: Sparkles,
		color: 'text-teal-400',
		bgColor: 'bg-teal-400/10',
		label: 'selected',
	},
};

// Format timestamp
function formatTimestamp(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 10) return 'just now';
	if (seconds < 60) return `${seconds}s ago`;
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;

	return date.toLocaleDateString();
}

// Single activity item component
function ActivityItemComponent({
	activity,
	compact = false,
}: {
	activity: UIActivityItem;
	compact?: boolean;
}) {
	const config = activityConfig[activity.type as keyof typeof activityConfig];
	const Icon = config.icon;
	const userColor = getUserCursorColor(activity.userId);

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			className={cn(
				'flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors',
				compact && 'p-2 gap-2'
			)}
		>
			{/* User Avatar */}
			<div className='relative flex-shrink-0'>
				<Avatar className={cn('h-8 w-8', compact && 'h-6 w-6')}>
					<AvatarImage
						src={
							activity.userAvatar ||
							`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activity.userName)}`
						}
						alt={activity.userName}
					/>

					<AvatarFallback
						className='text-xs'
						style={{ backgroundColor: userColor, color: 'white' }}
					>
						{activity.userName.slice(0, 2).toUpperCase()}
					</AvatarFallback>
				</Avatar>

				{/* Activity type indicator */}
				<div
					className={cn(
						'absolute -bottom-1 -right-1 rounded-full p-0.5',
						config.bgColor
					)}
				>
					<Icon className={cn('h-3 w-3', config.color)} />
				</div>
			</div>

			{/* Activity content */}
			<div className='flex-1 min-w-0'>
				<div className='flex items-start justify-between gap-2'>
					<div className='flex-1'>
						<p className={cn('text-sm', compact && 'text-xs')}>
							<span className='font-medium text-zinc-200'>
								{activity.userName}
							</span>{' '}
							<span className='text-zinc-400'>{config.label}</span>
							{/* Activity details */}
							{activity.details?.nodeName && (
								<>
									{' '}
									<span className='font-medium text-zinc-300'>
										{`"${activity.details.nodeName}"`}
									</span>
								</>
							)}
							{/* Group indicator */}
							{activity.isGrouped &&
								activity.groupCount &&
								activity.groupCount > 1 && (
									<>
										{' '}
										<Badge variant='secondary' className='text-xs'>
											×{activity.groupCount}
										</Badge>
									</>
								)}
						</p>

						{/* Additional details */}
						{activity.details?.comment && (
							<p className='text-xs text-zinc-500 mt-1 line-clamp-2'>
								{`"${activity.details.comment}"`}
							</p>
						)}

						{activity.details?.changes &&
							activity.details.changes.length > 0 && (
								<div className='flex flex-wrap gap-1 mt-1'>
									{activity.details.changes
										.slice(0, 3)
										.map((change: string, idx: number) => (
											<Badge
												key={idx}
												variant='outline'
												className='text-xs border-zinc-700'
											>
												{change}
											</Badge>
										))}

									{activity.details.changes.length > 3 && (
										<Badge
											variant='outline'
											className='text-xs border-zinc-700'
										>
											+{activity.details.changes.length - 3} more
										</Badge>
									)}
								</div>
							)}
					</div>

					{/* Timestamp */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									className={cn(
										'text-xs text-zinc-500 whitespace-nowrap',
										compact && 'text-[10px]'
									)}
								>
									{formatTimestamp(activity.timestamp)}
								</span>
							</TooltipTrigger>

							<TooltipContent side='left'>
								<p className='text-xs'>{activity.timestamp.toLocaleString()}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		</motion.div>
	);
}

export function ActivityFeed({
	mapId,
	maxItems = 50,
	showFilters = true,
	compact = false,
	className,
}: ActivityFeedProps) {
	const { activities } = useAppStore();

	const [filter, setFilter] = useState<UIActivityItem['type'] | 'all'>('all');
	const [isCollapsed, setIsCollapsed] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);

	// Convert collaboration activities to UI activities
	const uiActivities = useMemo(() => {
		return activities.map(mapToUIActivity);
	}, [activities]);

	// Filter activities
	const filteredActivities = useMemo(() => {
		let filtered = uiActivities;

		if (filter !== 'all') {
			filtered = uiActivities.filter((a) => a.type === filter);
		}

		// Limit to maxItems
		return filtered.slice(0, maxItems);
	}, [uiActivities, filter, maxItems]);

	// Group similar activities
	const groupedActivities = useMemo(() => {
		const grouped: UIActivityItem[] = [];
		let currentGroup: UIActivityItem | null = null;

		filteredActivities.forEach((activity) => {
			// Don't group certain types
			if (['join', 'leave', 'comment'].includes(activity.type)) {
				if (currentGroup) {
					grouped.push(currentGroup);
					currentGroup = null;
				}

				grouped.push(activity);
				return;
			}

			// Check if we can group with current
			if (
				currentGroup &&
				currentGroup.type === activity.type &&
				currentGroup.userId === activity.userId &&
				currentGroup.details?.nodeId === activity.details?.nodeId &&
				activity.timestamp.getTime() - currentGroup.timestamp.getTime() < 60000 // Within 1 minute
			) {
				currentGroup.groupCount = (currentGroup.groupCount || 1) + 1;
				currentGroup.timestamp = activity.timestamp;
			} else {
				if (currentGroup) {
					grouped.push(currentGroup);
				}

				currentGroup = { ...activity, isGrouped: true, groupCount: 1 };
			}
		});

		if (currentGroup) {
			grouped.push(currentGroup);
		}

		return grouped;
	}, [filteredActivities]);

	// Auto-scroll to bottom when new activities arrive
	useEffect(() => {
		if (autoScroll && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [groupedActivities, autoScroll]);

	// Detect manual scroll
	const handleScroll = useCallback(() => {
		if (!scrollRef.current) return;

		const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
		const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

		setAutoScroll(isAtBottom);
	}, []);

	if (isCollapsed) {
		return (
			<motion.div
				className={cn(
					'flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer',
					className
				)}
				onClick={() => setIsCollapsed(false)}
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				<Activity className='h-4 w-4 text-zinc-400' />

				<span className='text-sm text-zinc-400'>Activity Feed</span>

				<Badge variant='secondary' className='ml-auto'>
					{activities.length}
				</Badge>

				<ChevronRight className='h-4 w-4 text-zinc-400' />
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				'flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden',
				className
			)}
		>
			{/* Header */}
			<div className='flex items-center justify-between p-3 border-b border-zinc-800'>
				<div className='flex items-center gap-2'>
					<Activity className='h-4 w-4 text-zinc-400' />

					<h3 className='font-medium text-sm text-zinc-200'>Activity Feed</h3>

					{activities.length > 0 && (
						<Badge variant='secondary' className='text-xs'>
							{activities.length}
						</Badge>
					)}
				</div>

				<div className='flex items-center gap-1'>
					{showFilters && (
						<Button
							size='sm'
							variant='ghost'
							onClick={() => setFilter(filter === 'all' ? 'edit' : 'all')}
							className='h-7 px-2'
						>
							<Filter className='h-3 w-3 mr-1' />

							{filter === 'all' ? 'All' : filter}
						</Button>
					)}

					<Button
						size='sm'
						variant='ghost'
						onClick={() => setIsCollapsed(true)}
						className='h-7 w-7 p-0'
					>
						<X className='h-3 w-3' />
					</Button>
				</div>
			</div>

			{/* Filter pills */}
			{showFilters && filter !== 'all' && (
				<div className='flex gap-1 p-2 border-b border-zinc-800'>
					{(['all', 'edit', 'comment', 'join', 'leave'] as const).map(
						(type) => (
							<Button
								key={type}
								size='sm'
								variant={filter === type ? 'secondary' : 'ghost'}
								onClick={() => setFilter(type)}
								className='h-7 px-2 text-xs'
							>
								{type === 'all'
									? 'All'
									: activityConfig[type as keyof typeof activityConfig]?.label}
							</Button>
						)
					)}
				</div>
			)}

			{/* Activity list */}
			<ScrollArea
				ref={scrollRef}
				onScroll={handleScroll}
				className='flex-1 h-full max-h-[400px]'
			>
				<div className='p-2'>
					{groupedActivities.length === 0 ? (
						<div className='text-center py-8'>
							<Activity className='h-8 w-8 text-zinc-600 mx-auto mb-2' />

							<p className='text-sm text-zinc-500'>No activity yet</p>

							<p className='text-xs text-zinc-600 mt-1'>
								Activities will appear here as users collaborate
							</p>
						</div>
					) : (
						<AnimatePresence mode='popLayout'>
							{groupedActivities.map((activity) => (
								<ActivityItemComponent
									key={activity.id}
									activity={activity}
									compact={compact}
								/>
							))}
						</AnimatePresence>
					)}
				</div>
			</ScrollArea>

			{/* Auto-scroll indicator */}
			{!autoScroll && activities.length > 5 && (
				<motion.button
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 10 }}
					onClick={() => {
						setAutoScroll(true);

						if (scrollRef.current) {
							scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
						}
					}}
					className='absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors'
				>
					New activities ↓
				</motion.button>
			)}
		</motion.div>
	);
}
