'use client';

import {
	formatRelativeNotificationTime,
	useNotifications,
} from '@/components/notifications/use-notifications';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface NotificationBellProps {
	className?: string;
	filterMapId?: string | null;
}

export function NotificationBell({
	className,
	filterMapId = null,
}: NotificationBellProps) {
	const [isOpen, setIsOpen] = useState(false);
	const {
		visibleNotifications,
		visibleUnreadCount,
		isLoading,
		error,
		refreshNotifications,
		markAllAsRead,
		markNotificationAsRead,
	} = useNotifications({ filterMapId });

	useEffect(() => {
		if (isOpen) {
			void refreshNotifications();
		}
	}, [isOpen, refreshNotifications]);

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<PopoverTrigger
				render={
					<Button
						aria-label='Notifications'
						className={cn('relative', className)}
						size='icon'
						variant='secondary'
					>
						<Bell className='size-4' />
						{visibleUnreadCount > 0 && (
							<span className='absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center'>
								{visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
							</span>
						)}
					</Button>
				}
			/>

			<PopoverContent align='end' className='w-[340px] p-0' side='bottom'>
				<div className='flex items-center justify-between px-3 py-2 border-b border-border-default'>
					<div className='flex items-center gap-2'>
						<span className='text-sm font-medium text-text-primary'>
							Notifications
						</span>
						{visibleUnreadCount > 0 && (
							<span className='text-xs text-text-secondary'>
								{visibleUnreadCount} unread
							</span>
						)}
					</div>
					<Button
						className='h-7 px-2 text-xs'
						disabled={visibleUnreadCount === 0}
						onClick={() => void markAllAsRead()}
						size='sm'
						variant='ghost'
					>
						<CheckCheck className='size-3.5 mr-1' />
						Mark all
					</Button>
				</div>

				<div className='max-h-[420px] overflow-y-auto'>
					{isLoading && visibleNotifications.length === 0 ? (
						<div className='px-3 py-6 text-sm text-text-secondary'>
							Loading notifications...
						</div>
					) : error ? (
						<div className='px-3 py-6 text-sm text-red-400'>{error}</div>
					) : visibleNotifications.length === 0 ? (
						<div className='px-3 py-6 text-sm text-text-secondary'>
							No notifications yet.
						</div>
					) : (
						<ul className='divide-y divide-border-default'>
							{visibleNotifications.map((notification) => (
								<li key={notification.id}>
									<div
										className={cn(
											'px-3 py-3',
											notification.is_read ? 'bg-transparent' : 'bg-cyan-500/5'
										)}
									>
										<div className='flex items-start gap-2'>
											{notification.is_read ? (
												<Circle className='size-2 mt-1.5 text-transparent' />
											) : (
												<Circle className='size-2 mt-1.5 fill-cyan-400 text-cyan-400' />
											)}
											<div className='min-w-0 flex-1'>
												<p className='text-sm font-medium text-text-primary'>
													{notification.title}
												</p>
												<p className='text-xs text-text-secondary mt-0.5'>
													{notification.body}
												</p>
												<div className='mt-2 flex items-center justify-between gap-2'>
													<span
														className='text-[11px] text-text-disabled'
														title={new Date(
															notification.created_at
														).toLocaleString()}
													>
														{formatRelativeNotificationTime(
															notification.created_at
														)}
													</span>
													<div className='flex items-center gap-1.5'>
														{!notification.is_read && (
															<Button
																className='h-6 px-2 text-[11px]'
																onClick={() =>
																	void markNotificationAsRead(notification.id)
																}
																size='sm'
																variant='ghost'
															>
																Mark read
															</Button>
														)}
														{notification.map_id && (
															<Link
																className='inline-flex h-6 items-center rounded px-2 text-[11px] text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors'
																href={`/mind-map/${notification.map_id}`}
															>
																Open
															</Link>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
