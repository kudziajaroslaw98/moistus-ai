'use client';

import { cn } from '@/utils/cn';
import {
	CreditCard,
	Palette,
	Settings,
	Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface SettingsLayoutProps {
	children: ReactNode;
}

interface SettingsNavItem {
	id: string;
	label: string;
	icon: ReactNode;
	href: string;
	description: string;
}

const settingsNavItems: SettingsNavItem[] = [
	{
		id: 'general',
		label: 'General',
		icon: <Settings className='h-4 w-4' />,
		href: '/dashboard/settings',
		description: 'Account and profile settings',
	},
	{
		id: 'appearance',
		label: 'Appearance',
		icon: <Palette className='h-4 w-4' />,
		href: '/dashboard/settings/appearance',
		description: 'Theme and accessibility',
	},
	{
		id: 'account',
		label: 'Account',
		icon: <Shield className='h-4 w-4' />,
		href: '/dashboard/settings/account',
		description: 'Privacy and security',
	},
	{
		id: 'billing',
		label: 'Billing',
		icon: <CreditCard className='h-4 w-4' />,
		href: '/dashboard/settings/billing',
		description: 'Subscription and payments',
	},
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
	const pathname = usePathname();

	const isItemActive = (href: string) => {
		if (href === '/dashboard/settings') {
			return pathname === href;
		}

		return pathname === href;
	};

	return (
		<div className='container mx-auto p-6 max-w-7xl h-auto min-h-screen pb-48'>
			{/* Header */}
			<div className='mb-8'>
				<h1 className='text-3xl font-bold text-white mb-2'>Settings</h1>

				<p className='text-zinc-400'>
					Manage your account settings and application preferences
				</p>
			</div>

			{/* Content */}
			<div className='flex gap-8'>
				{/* Settings Navigation Sidebar */}
				<aside className='w-64 flex-shrink-0'>
					<nav className='space-y-1'>
						{settingsNavItems.map((item) => {
							const isActive = isItemActive(item.href);
							return (
								<Link
									href={item.href}
									key={item.id}
									className={cn(
										'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group',
										isActive
											? 'bg-sky-600/10 text-sky-400 border border-sky-500/20'
											: 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
									)}
								>
									<div
										className={cn(
											'mt-0.5 transition-colors',
											isActive
												? 'text-sky-400'
												: 'text-zinc-400 group-hover:text-white'
										)}
									>
										{item.icon}
									</div>

									<div className='min-w-0'>
										<div
											className={cn(
												'font-medium',
												isActive ? 'text-sky-400' : 'text-white'
											)}
										>
											{item.label}
										</div>

										<div
											className={cn(
												'text-xs mt-0.5',
												isActive
													? 'text-sky-400/70'
													: 'text-zinc-500 group-hover:text-zinc-400'
											)}
										>
											{item.description}
										</div>
									</div>
								</Link>
							);
						})}
					</nav>
				</aside>

				{/* Main Content */}
				<main className='flex-1 min-w-0 h-auto'>{children}</main>
			</div>
		</div>
	);
}
