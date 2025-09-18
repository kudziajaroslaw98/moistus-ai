'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { Archive, Home, Plus, Settings, Star, Users } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarTrigger,
	useSidebar,
} from '../ui/sidebar';
import { SidebarItem } from '../ui/sidebar-item';
import { SidebarSection } from '../ui/sidebar-section';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';

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
		disabled: true,
		comingSoon: true,
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

const bottomNavItems: NavItem[] = [
	{
		id: 'settings',
		label: 'Settings',
		icon: <Settings className='h-4 w-4' />,
		href: '/dashboard/settings',
	},
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const pathname = usePathname();
	const { open: sidebarOpen } = useSidebar();
	const sidebarCollapsed = !sidebarOpen;

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
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						className='px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30'
					>
						Coming Soon
					</motion.div>
				);
			}

			if (item.badge) {
				return (
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
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
					icon={
						<div className={cn('flex-shrink-0 text-zinc-500')}>
							{item.icon}
						</div>
					}
					label={item.label}
					isActive={false}
					onClick={() => {}}
					collapsed={sidebarCollapsed}
					badge={renderBadge()}
					className='cursor-not-allowed opacity-70'
				/>
			);

			if (sidebarCollapsed) {
				return (
					<Tooltip>
						<TooltipTrigger className='w-full flex'>
							{content}
						</TooltipTrigger>

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
								icon={
									<div
										className={cn('flex-shrink-0', isActive && 'text-sky-400')}
									>
										{item.icon}
									</div>
								}
								label={item.label}
								isActive={isActive}
								onClick={() => {}}
								collapsed={true}
							/>
						</TooltipTrigger>

						<TooltipContent>
							<span>{item.label}</span>
						</TooltipContent>
					</Tooltip>
				</Link>
			);
		}

		return (
			<Link href={item.href}>
				<SidebarItem
					icon={
						<div className={cn('flex-shrink-0', isActive && 'text-sky-400')}>
							{item.icon}
						</div>
					}
					label={item.label}
					isActive={isActive}
					onClick={() => {}}
					badge={renderBadge()}
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
								<Link href='/dashboard' className='flex items-center gap-2'>
									<Image
										src='/images/moistus.svg'
										alt='Moistus Logo'
										width={120}
										height={80}
									/>
								</Link>
							</div>
						)}

						{/* Collapse Button */}
						<SidebarTrigger className={cn([sidebarCollapsed && 'px-2'])} />
					</div>
				</SidebarHeader>

				{/* New Map Button */}
				<SidebarContent className='w-full'>
					<SidebarSection className={cn(['w-full h-16 p-4 px-2'])}>
						<Button
							className={cn(
								'w-full bg-sky-600 hover:bg-sky-700 text-white',
								'shadow-lg hover:shadow-sky-600/25',
								!sidebarCollapsed && 'px-0'
							)}
							size={sidebarCollapsed ? 'icon' : 'default'}
						>
							<Plus className='h-4 w-4' />

							{!sidebarCollapsed && <span className='ml-2'>New Map</span>}
						</Button>
					</SidebarSection>

					<SidebarGroup
						className={cn(['w-full', !sidebarCollapsed ? 'p-2' : 'p-2'])}
					>
						<SidebarSection showDivider={false}>
							{mainNavItems.map((item) => (
								<NavItemComponent key={item.id} item={item} />
							))}
						</SidebarSection>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className='border-t border-zinc-800'>
					<SidebarSection showDivider={false}>
						{bottomNavItems.map((item) => (
							<NavItemComponent key={item.id} item={item} />
						))}
					</SidebarSection>
				</SidebarFooter>
			</Sidebar>

			{/* Main Content */}
			<main className='flex-grow'>{children}</main>
		</div>
	);
}
