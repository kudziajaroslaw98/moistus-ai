'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { Archive, Home, Plus, Settings, Star, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from '../ui/sidebar';
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

	const handleTooltipOpenChange = () => {
		if (sidebarCollapsed) {
			console.log(sidebarCollapsed, true);
			return true;
		}

		console.log(sidebarCollapsed, false);

		return false;
	};

	const NavItemComponent = ({ item }: { item: NavItem }) => {
		const isActive = isItemActive(item.href);

		return (
			<Link href={item.href}>
				<Tooltip
					onOpenChange={handleTooltipOpenChange}
					disabled={!sidebarCollapsed}
				>
					<TooltipTrigger className='w-full flex'>
						<motion.div
							className={cn(
								'relative flex items-center gap-4 w-full rounded-lg transition-all',
								'hover:bg-zinc-800/50',
								isActive && 'bg-zinc-800 text-white',
								!isActive && 'text-zinc-400 hover:text-white',
								sidebarCollapsed ? 'p-2' : 'px-3 py-2.5'
							)}
						>
							{/* Active Indicator */}
							{isActive && (
								<motion.div
									layoutId='activeIndicator'
									className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-500 rounded-r-full'
									initial={{ opacity: 0, x: -4 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.2 }}
								/>
							)}

							{/* Icon */}
							<div className={cn('flex-shrink-0', isActive && 'text-sky-400')}>
								{item.icon}
							</div>

							{/* Label */}
							<AnimatePresence mode='wait'>
								{!sidebarCollapsed && (
									<motion.span
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -10 }}
										transition={{ duration: 0.2 }}
										className='text-sm font-medium'
									>
										{item.label}
									</motion.span>
								)}
							</AnimatePresence>

							{/* Badge */}
							{item.badge && !sidebarCollapsed && (
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
							)}
						</motion.div>
					</TooltipTrigger>

					<TooltipContent>
						<span>{item.label}</span>
					</TooltipContent>
				</Tooltip>
			</Link>
		);
	};

	return (
		<div
			className='flex h-screen w-full bg-zinc-950 group'
			data-collapsed={sidebarCollapsed}
		>
			{/* Sidebar */}
			<Sidebar variant='floating' collapsible='icon'>
				<SidebarHeader className='border-b border-zinc-800'>
					{/* Header with Logo and Trigger */}
					<div
						className={cn([
							'flex items-center',
							!sidebarCollapsed ? ' justify-between p-4' : 'justify-center p-0',
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
						<SidebarTrigger />
					</div>
				</SidebarHeader>

				{/* New Map Button */}
				<SidebarContent className='w-full'>
					<SidebarGroup
						className={cn(['w-full', !sidebarCollapsed ? 'p-4 pb-2' : ''])}
					>
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
					</SidebarGroup>

					<SidebarSeparator />

					<SidebarGroup
						className={cn(['w-full', !sidebarCollapsed ? 'p-4' : ''])}
					>
						<nav className='flex-grow overflow-clip '>
							<div className='flex gap-1 flex-col'>
								{mainNavItems.map((item) => (
									<NavItemComponent key={item.id} item={item} />
								))}
							</div>
						</nav>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<div
						className={cn([
							'border-t border-zinc-800 ',
							!sidebarCollapsed ? 'p-3' : '',
						])}
					>
						<div className='space-y-1'>
							{bottomNavItems.map((item) => (
								<NavItemComponent key={item.id} item={item} />
							))}
						</div>
					</div>
				</SidebarFooter>
			</Sidebar>

			{/* Main Content */}
			<main className='flex-grow'>{children}</main>
		</div>
	);
}
