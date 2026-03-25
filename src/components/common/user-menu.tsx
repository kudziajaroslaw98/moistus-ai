'use client';

import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import {
	type AccountMenuUser,
	useAccountMenuActions,
} from '@/components/common/use-account-menu-actions';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
	ChevronDown,
	CreditCard,
	LogOut,
	RefreshCw,
	Settings,
	Sparkles,
	User,
} from 'lucide-react';

interface UserMenuProps {
	user: AccountMenuUser;
	showBackToDashboard?: boolean;
	showRestartWalkthrough?: boolean;
	onOpenSettings?: (tab: 'account' | 'billing') => void;
}

export function UserMenu({
	user,
	showRestartWalkthrough = false,
	onOpenSettings,
}: UserMenuProps) {
	const {
		name,
		isAnonymous,
		subtitle,
		isPro,
		isLoggingOut,
		showUpgradeAnonymous,
		handleRestartOnboarding,
		handleUpgradeToPro,
		handleLogout,
		openUpgradeAnonymousPrompt,
		closeUpgradeAnonymousPrompt,
		handleAnonymousUpgradeSuccess,
	} = useAccountMenuActions(user);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						className='flex items-center space-x-3 hover:bg-elevated focus:bg-elevated'
						disabled={isLoggingOut}
						variant='ghost'
					>
						{/* User Avatar */}
						<UserAvatar className='size-6' size='md' user={user} />

						{/* User Info - Hidden on mobile, visible on larger screens if not in compact mode */}
						<div className='hidden sm:block text-left'>
							<div className='text-sm font-medium text-text-primary'>{name}</div>
						</div>

						{/* Chevron */}
						<ChevronDown className='h-4 w-4 text-text-tertiary' />
					</Button>
				}
			/>

			<DropdownMenuContent align='end' className='w-56'>
				{/* User Info Header */}
				<div className='flex gap-4 items-center px-3 py-2'>
					<UserAvatar className='size-10' size='md' user={user} />

					<div>
						<div className='text-sm font-medium text-text-primary'>{name}</div>

						<div className='text-xs text-text-secondary'>{subtitle}</div>

						{isAnonymous && (
							<div className='mt-1 text-xs text-warning-400'>
								⚠️ Anonymous account
							</div>
						)}
					</div>
				</div>

				<DropdownMenuSeparator />

				{/* Menu Items */}
				<DropdownMenuItem
					className='cursor-pointer'
					onClick={() => onOpenSettings?.('account')}
				>
					<Settings className='mr-2 h-4 w-4' />
					Account
				</DropdownMenuItem>

				<DropdownMenuItem
					className='cursor-pointer'
					onClick={() => onOpenSettings?.('billing')}
				>
					<CreditCard className='mr-2 h-4 w-4' />
					Billing
				</DropdownMenuItem>

				{isAnonymous && (
					<>
						<DropdownMenuSeparator />

						<DropdownMenuItem
							className='cursor-pointer text-primary-400 data-[highlighted]:text-primary-300'
							onClick={openUpgradeAnonymousPrompt}
						>
							<User className='mr-2 h-4 w-4' />
							Upgrade Account
						</DropdownMenuItem>
					</>
				)}

				{!isPro && !isAnonymous && (
					<DropdownMenuItem
						className='cursor-pointer text-warning-400 data-[highlighted]:text-warning-300'
						onClick={handleUpgradeToPro}
					>
						<Sparkles className='mr-2 h-4 w-4' />
						Upgrade to Pro
					</DropdownMenuItem>
				)}

				{showRestartWalkthrough && !isAnonymous && (
					<>
						<DropdownMenuSeparator />

						<DropdownMenuItem
							className='cursor-pointer'
							onClick={handleRestartOnboarding}
						>
							<RefreshCw className='mr-2 h-4 w-4' />
							Restart walkthrough
						</DropdownMenuItem>
					</>
				)}

				<DropdownMenuSeparator />

				{/* Logout */}
				<DropdownMenuItem
					className='cursor-pointer'
					disabled={isLoggingOut}
					onClick={handleLogout}
					variant='destructive'
				>
					<LogOut className='mr-2 h-4 w-4' />

					{isLoggingOut ? 'Signing out...' : 'Sign out'}
				</DropdownMenuItem>
			</DropdownMenuContent>

			{/* Upgrade Anonymous Modal */}
			{showUpgradeAnonymous && (
				<UpgradeAnonymousPrompt
					isAnonymous={true}
					userDisplayName={user?.display_name || user?.full_name}
					onDismiss={closeUpgradeAnonymousPrompt}
					onUpgradeSuccess={handleAnonymousUpgradeSuccess}
					autoShowDelay={0}
				/>
			)}
		</DropdownMenu>
	);
}
