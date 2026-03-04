'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { subscribeToNotificationChannel } from '@/lib/realtime/notification-channel';
import useAppStore from '@/store/mind-map-store';
import type { NotificationRecord } from '@/types/notification';
import { cn } from '@/utils/cn';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import Link from 'next/link';
import { useShallow } from 'zustand/shallow';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface NotificationBellProps {
	className?: string;
	filterMapId?: string | null;
}

interface NotificationsApiResponse {
	status: 'success' | 'error';
	data?: {
		notifications: NotificationRecord[];
		unreadCount: number;
	};
}

export function NotificationBell({
	className,
	filterMapId = null,
}: NotificationBellProps) {
	const { currentUser } = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
		}))
	);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const visibleNotifications = useMemo(() => {
		if (!filterMapId) {
			return notifications;
		}
		return notifications.filter((notification) => notification.map_id === filterMapId);
	}, [notifications, filterMapId]);

	const fetchNotifications = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch('/api/notifications?limit=30');
			if (!response.ok) {
				throw new Error('Failed to fetch notifications');
			}
			const payload = (await response.json()) as NotificationsApiResponse;
			if (payload.status !== 'success' || !payload.data) {
				throw new Error('Invalid notifications response');
			}
			setNotifications(payload.data.notifications ?? []);
			setUnreadCount(payload.data.unreadCount ?? 0);
		} catch (fetchError) {
			setError(
				fetchError instanceof Error
					? fetchError.message
					: 'Failed to fetch notifications'
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (currentUser?.id) {
			void fetchNotifications();
		}
	}, [fetchNotifications, currentUser?.id]);

	useEffect(() => {
		if (!currentUser?.id) {
			return;
		}

		let unsubscribe: (() => void) | null = null;
		let cancelled = false;

		void subscribeToNotificationChannel(currentUser.id, {
			onEvent: () => {
				void fetchNotifications();
			},
			onOpen: () => {
				void fetchNotifications();
			},
			onError: (event) => {
				console.warn('[notification-bell] notification channel error', event);
			},
			onClose: (event) => {
				if (event.code !== 1000 && event.reason !== 'client_unsubscribe') {
					console.warn('[notification-bell] notification channel closed', {
						code: event.code,
						reason: event.reason,
					});
				}
			},
			})
				.then((subscription) => {
					if (cancelled) {
						subscription.disconnect();
						return;
					}
					unsubscribe = subscription.disconnect;
				})
				.catch((error) => {
					if (!cancelled) {
						console.warn('[notification-bell] failed to subscribe to notification channel', {
							userId: currentUser.id,
							error: error instanceof Error ? error.message : 'Unknown error',
						});
					}
				});

		return () => {
			cancelled = true;
			unsubscribe?.();
		};
	}, [currentUser?.id, fetchNotifications]);

	useEffect(() => {
		if (isOpen) {
			void fetchNotifications();
		}
	}, [isOpen, fetchNotifications]);

	const handleMarkAllAsRead = useCallback(async () => {
		try {
			const response = await fetch('/api/notifications/mark-all-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(filterMapId ? { mapId: filterMapId } : {}),
			});

			if (!response.ok) {
				console.warn('[notification-bell] failed to mark all as read', {
					status: response.status,
					statusText: response.statusText,
				});
				return;
			}

			void fetchNotifications();
		} catch (markAllError) {
			console.warn('[notification-bell] failed to mark all as read', markAllError);
		}
	}, [fetchNotifications, filterMapId]);

	const handleMarkSingleAsRead = useCallback(
		async (notificationId: string) => {
			try {
				const response = await fetch(`/api/notifications/${notificationId}/read`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ read: true }),
				});
				if (!response.ok) {
					console.warn('[notification-bell] failed to mark notification as read', {
						notificationId,
						status: response.status,
					});
					return;
				}
				setNotifications((current) =>
					current.map((notification) =>
						notification.id === notificationId
							? { ...notification, is_read: true, read_at: new Date().toISOString() }
							: notification
					)
				);
				setUnreadCount((current) => Math.max(0, current - 1));
			} catch (markError) {
				console.warn('[notification-bell] failed to mark notification as read', {
					notificationId,
					markError,
				});
			}
		},
		[]
	);

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
						{unreadCount > 0 && (
							<span className='absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center'>
								{unreadCount > 99 ? '99+' : unreadCount}
							</span>
						)}
					</Button>
				}
			/>

			<PopoverContent align='end' className='w-[340px] p-0' side='bottom'>
				<div className='flex items-center justify-between px-3 py-2 border-b border-border-default'>
					<div className='flex items-center gap-2'>
						<span className='text-sm font-medium text-text-primary'>Notifications</span>
						{unreadCount > 0 && (
							<span className='text-xs text-text-secondary'>{unreadCount} unread</span>
						)}
					</div>
					<Button
						className='h-7 px-2 text-xs'
						disabled={unreadCount === 0}
						onClick={handleMarkAllAsRead}
						size='sm'
						variant='ghost'
					>
						<CheckCheck className='size-3.5 mr-1' />
						Mark all
					</Button>
				</div>

				<div className='max-h-[420px] overflow-y-auto'>
					{isLoading && notifications.length === 0 ? (
						<div className='px-3 py-6 text-sm text-text-secondary'>Loading notifications...</div>
					) : error ? (
						<div className='px-3 py-6 text-sm text-red-400'>{error}</div>
					) : visibleNotifications.length === 0 ? (
						<div className='px-3 py-6 text-sm text-text-secondary'>No notifications yet.</div>
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
														title={new Date(notification.created_at).toLocaleString()}
													>
														{formatRelativeTime(new Date(notification.created_at))}
													</span>
													<div className='flex items-center gap-1.5'>
														{!notification.is_read && (
															<Button
																className='h-6 px-2 text-[11px]'
																onClick={() => void handleMarkSingleAsRead(notification.id)}
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

function formatRelativeTime(date: Date): string {
	const now = Date.now();
	const diffSeconds = Math.floor((now - date.getTime()) / 1000);

	if (diffSeconds < 60) return 'just now';
	if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
	if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
	if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
	return `${Math.floor(diffSeconds / 604800)}w ago`;
}
