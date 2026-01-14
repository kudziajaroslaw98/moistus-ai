'use client';

import { AnonymousUserBanner } from '@/components/auth/anonymous-user-banner';
import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Archive, Home, Star, Users } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarTrigger,
	useSidebar,
} from '../ui/sidebar';
import { SidebarItem } from '../ui/sidebar-item';
import { SidebarSection } from '../ui/sidebar-section';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { DashboardHeader } from './dashboard-header';
import { SettingsPanel } from './settings-panel';

interface DashboardLayoutProps {
	children: ReactNode;
}

interface NavItem {
	id: string;
	label: string;
	icon: ReactNode;
	href: string;
	badge?: number | string;
	isActive?: boolean;
	subItems?: NavItem[];
	disabled?: boolean;
	comingSoon?: boolean;
}

const mainNavItems: NavItem[] = [
	{
		id: 'home',
		label: 'Home',
		icon: <Home className='h-4 w-4' />,
		href: '/dashboard',
	},
	{
		id: 'teams',
		label: 'Teams',
		icon: <Users className='h-4 w-4' />,
		href: '/dashboard/teams',
		disabled: true,
		comingSoon: true,
	},
	{
		id: 'templates',
		label: 'Templates',
		icon: <Star className='h-4 w-4' />,
		href: '/dashboard/templates',
	},
	{
		id: 'archive',
		label: 'Archive',
		icon: <Archive className='h-4 w-4' />,
		href: '/dashboard/archive',
		disabled: true,
		comingSoon: true,
	},
];

const bottomNavItems: NavItem[] = [];

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { open: sidebarOpen } = useSidebar();
	const sidebarCollapsed = !sidebarOpen;
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [settingsTab, setSettingsTab] = useState<'settings' | 'billing'>(
		'settings'
	);
	const [showAnonymousUpgrade, setShowAnonymousUpgrade] = useState(false);
	const userProfile = useAppStore((state) => state.userProfile);
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);

	const handleOpenSettings = (tab: 'settings' | 'billing' = 'settings') => {
		setSettingsTab(tab);
		setIsSettingsOpen(true);
	};

	// Handle manual trigger of upgrade modal
	useEffect(() => {
		if (showAnonymousUpgrade) {
			setPopoverOpen({ upgradeUser: true });
		}
	}, [showAnonymousUpgrade, setPopoverOpen]);

	const isItemActive = (href: string) => {
		if (href === '/dashboard') {
			return pathname === href;
		}

		return pathname.startsWith(href);
	};

	const NavItemComponent = ({ item }: { item: NavItem }) => {
		const isActive = isItemActive(item.href);

		const renderBadge = () => {
			if (item.comingSoon) {
				return (
					<motion.div
						animate={{ scale: 1 }}
						className='px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30'
						initial={{ scale: 0 }}
					>
						Coming Soon
					</motion.div>
				);
			}

			if (item.badge) {
				return (
					<motion.div
						animate={{ scale: 1 }}
						initial={{ scale: 0 }}
						className={cn(
							'px-2 py-0.5 rounded-full text-xs font-medium',
							'bg-zinc-700 text-zinc-300'
						)}
					>
						{item.badge}
					</motion.div>
				);
			}

			return undefined;
		};

		if (item.disabled) {
			const content = (
				<SidebarItem
					badge={renderBadge()}
					className='cursor-not-allowed opacity-70'
					collapsed={sidebarCollapsed}
					isActive={false}
					label={item.label}
					onClick={() => {}}
					icon={
						<div className={cn('shrink-0 text-zinc-500')}>{item.icon}</div>
					}
				/>
			);

			if (sidebarCollapsed) {
				return (
					<Tooltip>
						<TooltipTrigger className='w-full flex'>{content}</TooltipTrigger>

						<TooltipContent>
							<div className='flex flex-col gap-1'>
								<span>{item.label}</span>

								{item.comingSoon && (
									<span className='text-xs text-amber-400'>Coming Soon</span>
								)}
							</div>
						</TooltipContent>
					</Tooltip>
				);
			}

			return content;
		}

		if (sidebarCollapsed) {
			return (
				<Link href={item.href}>
					<Tooltip>
						<TooltipTrigger className='w-full flex'>
							<SidebarItem
								collapsed={true}
								isActive={isActive}
								label={item.label}
								onClick={() => {}}
								icon={
									<div
										className={cn('shrink-0', isActive && 'text-sky-400')}
									>
										{item.icon}
									</div>
								}
							/>
						</TooltipTrigger>

						<TooltipContent>
							<span>{item.label}</span>
						</TooltipContent>
					</Tooltip>
				</Link>
			);
		}

		// Regular nav items use Link for navigation
		return (
			<Link href={item.href}>
				<SidebarItem
					badge={renderBadge()}
					isActive={isActive}
					label={item.label}
					onClick={() => {}}
					icon={
						<div className={cn('shrink-0', isActive && 'text-sky-400')}>
							{item.icon}
						</div>
					}
				/>
			</Link>
		);
	};

	return (
		<div
			className='flex h-screen w-full bg-zinc-950 group'
			data-collapsed={sidebarCollapsed}
		>
			{/* Sidebar */}
			<Sidebar collapsible='icon'>
				<SidebarHeader className='border-b border-zinc-800'>
					{/* Header with Logo and Trigger */}
					<div
						className={cn([
							'flex items-center',
							!sidebarCollapsed
								? 'justify-between p-0.5'
								: 'justify-center p-0.5',
						])}
					>
						{/* Logo/Brand */}
						{!sidebarCollapsed && (
							<div className='flex items-center'>
								<Link className='flex items-center gap-2' href='/dashboard'>
									<Image
										alt='Shiko Logo'
										height={80}
										src='/images/shiko.svg'
										width={120}
									/>
								</Link>
							</div>
						)}

						{/* Collapse Button */}
						<SidebarTrigger className={cn([sidebarCollapsed && 'px-2'])} />
					</div>
				</SidebarHeader>

				<SidebarContent className='w-full'>
					<SidebarGroup
						className={cn(['w-full', !sidebarCollapsed ? 'p-2' : 'p-2'])}
					>
						<SidebarSection showDivider={false}>
							{mainNavItems.map((item) => (
								<NavItemComponent item={item} key={item.id} />
							))}
						</SidebarSection>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>

			{/* Main Content */}
			<main className='grow flex flex-col h-screen overflow-hidden'>
				<DashboardHeader onOpenSettings={handleOpenSettings} />
				<AnonymousUserBanner />

				<div className='flex-1 overflow-y-auto'>{children}</div>
			</main>

			<SettingsPanel
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				defaultTab={settingsTab}
			/>

			{/* Consolidated upgrade prompt: auto-show after 5 min OR manual trigger */}
			<UpgradeAnonymousPrompt
				isAnonymous={userProfile?.is_anonymous ?? false}
				userDisplayName={userProfile?.display_name || userProfile?.full_name}
				autoShowDelay={showAnonymousUpgrade ? 0 : 5 * 60 * 1000}
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
		</div>
	);
}
