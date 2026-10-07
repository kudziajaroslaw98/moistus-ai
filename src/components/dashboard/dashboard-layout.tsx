'use client';

import { AnonymousUserBanner } from '@/components/auth/anonymous-user-banner';
import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import { UserMenu } from '@/components/common/user-menu';
import { useEffectiveSubscriptionState } from '@/components/providers/subscription-hydration-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { isProSubscription } from '@/helpers/subscription/subscription-hydration';
import { useTouchFirst } from '@/hooks/use-touch-first';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import {
	Archive,
	Home,
	PanelLeft,
	Plus,
	SlidersHorizontal,
	Star,
	Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/shallow';
import { UpgradeModal } from '../modals/upgrade-modal';
import { Sidebar, useSidebar } from '../ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { DashboardHeader } from './dashboard-header';
import { DashboardPlanCard } from './dashboard-plan-card';
import { SettingsPanel } from './settings-panel';
import { useDashboardMaps } from './use-dashboard-data';

interface DashboardLayoutProps {
	children: ReactNode;
	/** Breadcrumb label in the top bar. */
	title?: string;
	/** Top-bar search field (Home only). */
	headerSearch?: ReactNode;
	/** Sidebar "New map" action; without it the button links to the dashboard's create flow. */
	onNewMap?: () => void;
}

interface NavItem {
	id: string;
	label: string;
	icon: typeof Home;
	href: string;
	comingSoon?: boolean;
}

const mainNavItems: NavItem[] = [
	{ id: 'home', label: 'Home', icon: Home, href: '/dashboard' },
	{
		id: 'templates',
		label: 'Templates',
		icon: Star,
		href: '/dashboard/templates',
	},
	{
		id: 'teams',
		label: 'Teams',
		icon: Users,
		href: '/dashboard/teams',
		comingSoon: true,
	},
	{
		id: 'archive',
		label: 'Archive',
		icon: Archive,
		href: '/dashboard/archive',
		comingSoon: true,
	},
];

const RECENT_MAP_COUNT = 3;

/** Tooltip with the label, shown only while the sidebar is collapsed to icons. */
function CollapsedTip({
	collapsed,
	label,
	children,
}: {
	collapsed: boolean;
	label: ReactNode;
	children: React.ReactElement;
}) {
	if (!collapsed) return children;

	return (
		<Tooltip>
			<TooltipTrigger render={children} />

			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function SidebarNavItem({
	item,
	isActive,
	collapsed,
}: {
	item: NavItem;
	isActive: boolean;
	collapsed: boolean;
}) {
	const Icon = item.icon;
	const base = cn(
		'flex h-[38px] items-center gap-2.5 rounded-[9px] px-2.5 text-sm',
		collapsed && 'justify-center px-0'
	);

	if (item.comingSoon) {
		return (
			<CollapsedTip
				collapsed={collapsed}
				label={
					<span className='flex flex-col'>
						{item.label}

						<span className='text-xs text-amber-400'>Coming Soon</span>
					</span>
				}
			>
				<span aria-disabled='true' className={cn(base, 'text-zinc-500')}>
					<Icon aria-hidden='true' className='size-4 shrink-0' />

					{!collapsed && (
						<>
							{item.label}

							<span className='ml-auto whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-px text-[11px] text-amber-400'>
								Coming Soon
							</span>
						</>
					)}
				</span>
			</CollapsedTip>
		);
	}

	return (
		<CollapsedTip collapsed={collapsed} label={item.label}>
			<Link
				aria-current={isActive ? 'page' : undefined}
				aria-label={collapsed ? item.label : undefined}
				href={item.href}
				className={cn(
					base,
					'transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
					isActive
						? 'bg-[#16171b] text-white'
						: 'text-zinc-400 [@media(hover:hover)]:hover:bg-white/[0.03] [@media(hover:hover)]:hover:text-white'
				)}
			>
				<Icon
					aria-hidden='true'
					className={cn('size-4 shrink-0', isActive && 'text-sky-400')}
				/>

				{!collapsed && item.label}
			</Link>
		</CollapsedTip>
	);
}

export function DashboardLayout({
	children,
	title = 'Home',
	headerSearch,
	onNewMap,
}: DashboardLayoutProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { state: sidebarState, isMobile } = useSidebar();
	// The mobile sheet always shows the full sidebar.
	const collapsed = sidebarState === 'collapsed' && !isMobile;
	const isTouchFirst = useTouchFirst();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [settingsTab, setSettingsTab] = useState<'account' | 'billing'>(
		'account'
	);
	const [showAnonymousUpgrade, setShowAnonymousUpgrade] = useState(false);
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		isLoggingOut,
		setPopoverOpen,
		popoverOpen,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			isLoggingOut: state.isLoggingOut,
			setPopoverOpen: state.setPopoverOpen,
			popoverOpen: state.popoverOpen,
		}))
	);
	const { currentSubscription, hasResolvedSubscription } =
		useEffectiveSubscriptionState();
	const isPro = isProSubscription(currentSubscription);
	const { maps } = useDashboardMaps();
	const recentMaps = maps.slice(0, RECENT_MAP_COUNT);

	// Load the profile once. Skip after an error (no retry loop) and during
	// logout (avoids a race that spammed toasts).
	useEffect(() => {
		if (!userProfile && !isLoadingProfile && !profileError && !isLoggingOut) {
			loadUserProfile();
		}
	}, [userProfile, isLoadingProfile, profileError, loadUserProfile, isLoggingOut]);

	const handleOpenSettings = useCallback(
		(tab: 'account' | 'billing' = 'account') => {
			setSettingsTab(tab);
			setIsSettingsOpen(true);
		},
		[]
	);

	// Handle URL param to open settings panel (e.g., /dashboard?settings=billing)
	useEffect(() => {
		const settingsParam = searchParams.get('settings');
		if (
			settingsParam === 'billing' ||
			settingsParam === 'settings' ||
			settingsParam === 'account'
		) {
			handleOpenSettings(settingsParam === 'billing' ? 'billing' : 'account');
			// Clean up URL without triggering navigation
			window.history.replaceState({}, '', pathname);
		}
	}, [searchParams, pathname, handleOpenSettings]);

	// Handle manual trigger of upgrade modal
	useEffect(() => {
		if (showAnonymousUpgrade) {
			setPopoverOpen({ upgradeUser: true });
		}
	}, [showAnonymousUpgrade, setPopoverOpen]);

	const handleUpgrade = () => {
		if (userProfile?.is_anonymous) {
			setShowAnonymousUpgrade(true);
			return;
		}

		setPopoverOpen({ upgradeUser: true });
	};

	const isItemActive = (href: string) =>
		href === '/dashboard' ? pathname === href : pathname.startsWith(href);

	const displayName =
		userProfile?.display_name || userProfile?.full_name || 'Account';
	const planLabel = userProfile?.is_anonymous
		? 'Guest'
		: !hasResolvedSubscription
			? ' '
			: isPro
				? 'Pro'
				: 'Free';

	const newMapClassName = cn(
		'flex h-10 items-center rounded-[10px] bg-[#005bc7] font-semibold text-white',
		'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#0a68d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]',
		collapsed ? 'size-10 justify-center self-center' : 'justify-between pl-3 pr-2.5'
	);
	const newMapContent = (
		<>
			<span className='flex items-center gap-2'>
				<Plus aria-hidden='true' className='size-[15px]' strokeWidth={2.25} />

				{!collapsed && 'New map'}
			</span>

			{!collapsed && !isTouchFirst && (
				<span className='font-mono text-[11px] font-medium text-white/70'>
					Ctrl N
				</span>
			)}
		</>
	);

	// fixed + inset-0 sizes the shell to the visible viewport; 100vh is taller or
	// shorter than the screen on phones with collapsing browser bars.
	return (
		<div className='group fixed inset-0 flex w-full bg-zinc-950 text-white'>
			<Sidebar className='border-[#16171b]' collapsible='icon'>
				<div
					className={cn(
						'flex h-full flex-col gap-5 overflow-y-auto overflow-x-hidden bg-[#0b0b0d] py-4',
						collapsed ? 'px-1.5' : 'px-3.5'
					)}
				>
					{/* Brand + collapse */}
					<div
						className={cn(
							'flex h-8 items-center',
							collapsed ? 'justify-center' : 'justify-between px-1'
						)}
					>
						{!collapsed && (
							<Link
								className='flex items-center gap-2.5 rounded-sm text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
								href='/dashboard'
							>
								<Image
									alt=''
									height={20}
									src='/images/shiko-logo.svg'
									width={20}
								/>
								Shiko
							</Link>
						)}

						<SidebarCollapseButton />
					</div>

					<CollapsedTip collapsed={collapsed} label='New map'>
						{onNewMap ? (
							<button
								aria-label={collapsed ? 'New map' : undefined}
								className={newMapClassName}
								onClick={onNewMap}
								type='button'
							>
								{newMapContent}
							</button>
						) : (
							<Link
								aria-label={collapsed ? 'New map' : undefined}
								className={newMapClassName}
								href='/dashboard?create=1'
							>
								{newMapContent}
							</Link>
						)}
					</CollapsedTip>

					<nav aria-label='Dashboard' className='flex flex-col gap-0.5'>
						{mainNavItems.map((item) => (
							<SidebarNavItem
								collapsed={collapsed}
								isActive={isItemActive(item.href)}
								item={item}
								key={item.id}
							/>
						))}
					</nav>

					{!collapsed && recentMaps.length > 0 && (
						<div>
							<p className='mb-1.5 px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500'>
								Recent
							</p>

							<ul className='flex flex-col gap-0.5 text-[13px]'>
								{recentMaps.map((map, index) => (
									<li key={map.id}>
										<Link
											className='flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-zinc-400 transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 [@media(hover:hover)]:hover:bg-white/[0.03] [@media(hover:hover)]:hover:text-white'
											href={`/mind-map/${map.id}`}
										>
											<span
												aria-hidden='true'
												className={cn(
													'size-1.5 shrink-0 rounded-[2px]',
													index === 0 ? 'bg-zinc-50' : 'bg-zinc-600'
												)}
											/>

											<span className='truncate'>{map.title}</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					)}

					<div className='mt-auto flex flex-col gap-3'>
						{!collapsed && (
							<DashboardPlanCard
								onManageBilling={() => handleOpenSettings('billing')}
								onUpgrade={handleUpgrade}
							/>
						)}

						{userProfile && (
							<div
								className={cn(
									'flex items-center gap-2.5 p-1',
									collapsed && 'justify-center p-0'
								)}
							>
								{collapsed ? (
									<UserMenu
										onOpenSettings={handleOpenSettings}
										side='top'
										user={userProfile}
										trigger={
											<button
												aria-label='Account menu'
												className='rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
												type='button'
											>
												<UserAvatar size='md' user={userProfile} />
											</button>
										}
									/>
								) : (
									<>
										<UserAvatar className='shrink-0' size='md' user={userProfile} />

										<span className='flex min-w-0 flex-auto flex-col leading-tight'>
											<span className='truncate text-sm font-medium'>
												{displayName}
											</span>

											<span className='text-xs text-zinc-500'>{planLabel}</span>
										</span>

										<UserMenu
											onOpenSettings={handleOpenSettings}
											side='top'
											user={userProfile}
											trigger={
												<button
													aria-label='Account settings'
													className='flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-200 ease hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
													type='button'
												>
													<SlidersHorizontal aria-hidden='true' className='size-4' />
												</button>
											}
										/>
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</Sidebar>

			<main className='flex min-h-0 grow flex-col overflow-hidden'>
				<DashboardHeader search={headerSearch} title={title} />

				<AnonymousUserBanner />

				<div className='flex-1 overflow-y-auto'>{children}</div>
			</main>

			<SettingsPanel
				defaultTab={settingsTab}
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
			/>

			{/* Consolidated upgrade prompt: auto-show after 5 min OR manual trigger */}
			<UpgradeAnonymousPrompt
				autoShowDelay={showAnonymousUpgrade ? 0 : 5 * 60 * 1000}
				isAnonymous={userProfile?.is_anonymous ?? false}
				userDisplayName={userProfile?.display_name || userProfile?.full_name}
				onDismiss={() => {
					setShowAnonymousUpgrade(false);
					setPopoverOpen({ upgradeUser: false });
				}}
				onUpgradeSuccess={() => {
					setShowAnonymousUpgrade(false);
					setPopoverOpen({ upgradeUser: false });
					router.refresh();
				}}
			/>

			{/* Upgrade modal for non-anonymous users (Pro subscription) */}
			{!userProfile?.is_anonymous && (
				<UpgradeModal
					onDismiss={() => setPopoverOpen({ upgradeUser: false })}
					onOpenChange={(open) => setPopoverOpen({ upgradeUser: open })}
					open={popoverOpen.upgradeUser}
					onSuccess={() => {
						setPopoverOpen({ upgradeUser: false });
						router.refresh();
					}}
				/>
			)}
		</div>
	);
}

function SidebarCollapseButton() {
	const { toggleSidebar, state, isMobile } = useSidebar();
	const label = isMobile
		? 'Close sidebar'
		: state === 'collapsed'
			? 'Expand sidebar'
			: 'Collapse sidebar';

	return (
		<button
			aria-label={label}
			className='flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-200 ease hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
			onClick={toggleSidebar}
			type='button'
		>
			<PanelLeft aria-hidden='true' className='size-4' />
		</button>
	);
}
