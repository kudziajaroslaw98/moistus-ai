import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UseNotificationsResult } from '@/components/notifications/use-notifications'
import type { ComponentProps, ReactNode } from 'react'

import { MobileMenu } from './mobile-menu'

const pushMock = jest.fn()

let mockStoreState = {
	currentShares: [
		{
			user_id: 'user-2',
			avatar_url: null,
			name: 'Anna',
			profile: { display_name: 'Anna' },
		},
	],
	currentUser: { id: 'user-1' },
	getCurrentShareUsers: jest.fn().mockResolvedValue(undefined),
}

let mockAccountActions = {
	name: 'Jordan',
	subtitle: 'jordan@shiko.ai',
	isAnonymous: false,
	isPro: false,
	isLoggingOut: false,
	showUpgradeAnonymous: false,
	handleRestartOnboarding: jest.fn(),
	handleUpgradeToPro: jest.fn(),
	handleLogout: jest.fn().mockResolvedValue(undefined),
	openUpgradeAnonymousPrompt: jest.fn(),
	closeUpgradeAnonymousPrompt: jest.fn(),
	handleAnonymousUpgradeSuccess: jest.fn(),
}

jest.mock('@/components/auth/upgrade-anonymous', () => ({
	UpgradeAnonymousPrompt: () => <div data-testid='upgrade-anonymous-prompt' />,
}))

jest.mock('@/components/common/use-account-menu-actions', () => ({
	useAccountMenuActions: () => mockAccountActions,
}))

jest.mock('@/components/notifications/use-notifications', () => ({
	formatRelativeNotificationTime: () => '1h ago',
}))

jest.mock('@/components/realtime/realtime-avatar-stack', () => ({
	RealtimeAvatarStack: () => <div data-testid='realtime-avatar-stack' />,
}))

jest.mock('@/components/ui/sheet', () => ({
	Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SheetClose: ({
		children,
		className,
		...props
	}: {
		children: ReactNode
		className?: string
	}) => (
		<button className={className} {...props}>
			{children}
		</button>
	),
	SheetContent: ({
		children,
		className,
		...props
	}: {
		children: ReactNode
		className?: string
	}) => (
		<div className={className} {...props}>
			{children}
		</div>
	),
	SheetTitle: ({
		children,
		className,
		...props
	}: {
		children: ReactNode
		className?: string
	}) => (
		<div className={className} {...props}>
			{children}
		</div>
	),
}))

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) => selector(mockStoreState)),
}))

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: pushMock,
	}),
}))

function createNotifications(
	overrides: Partial<UseNotificationsResult> = {}
): UseNotificationsResult {
	return {
		notifications: [],
		visibleNotifications: [
			{
				id: 'notification-1',
				recipient_user_id: 'user-1',
				actor_user_id: 'user-2',
				map_id: 'map-2',
				event_type: 'node_mention',
				title: 'Anna mentioned you',
				body: 'In Backend planning',
				metadata: {},
				dedupe_key: null,
				is_read: false,
				read_at: null,
				email_status: 'pending',
				email_error: null,
				emailed_at: null,
				created_at: '2026-03-18T10:00:00.000Z',
				updated_at: '2026-03-18T10:00:00.000Z',
			},
			{
				id: 'notification-2',
				recipient_user_id: 'user-1',
				actor_user_id: 'user-3',
				map_id: 'map-1',
				event_type: 'comment_reply',
				title: 'Sam replied to your node',
				body: 'Looks good to me',
				metadata: {},
				dedupe_key: null,
				is_read: true,
				read_at: '2026-03-18T09:00:00.000Z',
				email_status: 'pending',
				email_error: null,
				emailed_at: null,
				created_at: '2026-03-18T09:00:00.000Z',
				updated_at: '2026-03-18T09:00:00.000Z',
			},
			{
				id: 'notification-3',
				recipient_user_id: 'user-1',
				actor_user_id: 'user-4',
				map_id: 'map-1',
				event_type: 'access_changed',
				title: 'Access updated',
				body: 'Permissions were refreshed',
				metadata: {},
				dedupe_key: null,
				is_read: true,
				read_at: '2026-03-18T08:00:00.000Z',
				email_status: 'pending',
				email_error: null,
				emailed_at: null,
				created_at: '2026-03-18T08:00:00.000Z',
				updated_at: '2026-03-18T08:00:00.000Z',
			},
		],
		visibleUnreadCount: 1,
		isLoading: false,
		error: null,
		refreshNotifications: jest.fn().mockResolvedValue(undefined),
		markAllAsRead: jest.fn().mockResolvedValue(undefined),
		markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
		...overrides,
	}
}

function renderMobileMenu(
	overrides: Partial<ComponentProps<typeof MobileMenu>> = {}
) {
	const onOpenChange = jest.fn()
	const onToggleHistory = jest.fn()
	const onToggleSettings = jest.fn()
	const onToggleSharePanel = jest.fn()
	const onOpenSettings = jest.fn()
	const notifications = createNotifications()

	render(
		<MobileMenu
			activityState='viewing'
			canEdit
			isMapOwner
			isSettingsActive={false}
			mapId='map-1'
			mapOwnerId='user-1'
			mapTitle='Dump'
			notifications={notifications}
			onOpenChange={onOpenChange}
			onOpenSettings={onOpenSettings}
			onToggleHistory={onToggleHistory}
			onToggleSettings={onToggleSettings}
			onToggleSharePanel={onToggleSharePanel}
			open
			user={{
				id: 'profile-1',
				user_id: 'user-1',
				full_name: 'Jordan Smith',
				display_name: 'Jordan',
				created_at: '2026-03-18T00:00:00.000Z',
				email: 'jordan@shiko.ai',
			}}
			{...overrides}
		/>
	)

	return {
		onOpenChange,
		onToggleHistory,
		onToggleSettings,
		onToggleSharePanel,
		onOpenSettings,
		notifications,
	}
}

describe('MobileMenu', () => {
	beforeEach(() => {
		pushMock.mockReset()
		mockStoreState = {
			currentShares: [
				{
					user_id: 'user-2',
					avatar_url: null,
					name: 'Anna',
					profile: { display_name: 'Anna' },
				},
			],
			currentUser: { id: 'user-1' },
			getCurrentShareUsers: jest.fn().mockResolvedValue(undefined),
		}
		mockAccountActions = {
			name: 'Jordan',
			subtitle: 'jordan@shiko.ai',
			isAnonymous: false,
			isPro: false,
			isLoggingOut: false,
			showUpgradeAnonymous: false,
			handleRestartOnboarding: jest.fn(),
			handleUpgradeToPro: jest.fn(),
			handleLogout: jest.fn().mockResolvedValue(undefined),
			openUpgradeAnonymousPrompt: jest.fn(),
			closeUpgradeAnonymousPrompt: jest.fn(),
			handleAnonymousUpgradeSuccess: jest.fn(),
		}
	})

	it('shows owner workspace actions, notifications preview, and closes after sharing', async () => {
		const { onOpenChange, onToggleSharePanel, notifications } = renderMobileMenu()
		const closeMenuButton = screen.getByRole('button', { name: 'Close menu' })

		expect(
			screen.queryByText('Everything that supports the canvas lives here.')
		).not.toBeInTheDocument()
		expect(closeMenuButton).toBeInTheDocument()
		expect(closeMenuButton.className).toContain('bg-transparent')
		expect(closeMenuButton.className).not.toContain('rounded-2xl')
		expect(screen.getByTitle('Dump')).toHaveTextContent('Dump')
		expect(screen.getByText('Collaboration')).toBeInTheDocument()
		expect(screen.getByText('Share map')).toBeInTheDocument()
		expect(screen.getByText('1 collaborator on this map')).toBeInTheDocument()
		expect(screen.getByText('View history')).toBeInTheDocument()
		expect(screen.getByText('Map settings')).toBeInTheDocument()
		expect(screen.getByText('Billing')).toBeInTheDocument()
		expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
		expect(screen.getByText('Anna mentioned you')).toBeInTheDocument()
		expect(screen.getByText('Sam replied to your node')).toBeInTheDocument()
		expect(screen.queryByText('Access updated')).not.toBeInTheDocument()
		expect(screen.getByText('Mark all as read')).toBeInTheDocument()
		expect(screen.queryByText('Collaborators')).not.toBeInTheDocument()
		expect(
			screen.queryByText(
				'See who is in the map before you open sharing or presentation tools.'
			)
		).not.toBeInTheDocument()

		fireEvent.click(screen.getByText('Share map'))
		expect(onToggleSharePanel).toHaveBeenCalledTimes(1)
		expect(onOpenChange).toHaveBeenCalledWith(false)

		fireEvent.click(screen.getByText('Anna mentioned you'))
		expect(notifications.markNotificationAsRead).toHaveBeenCalledWith(
			'notification-1'
		)
		await waitFor(() => {
			expect(pushMock).toHaveBeenCalledWith('/mind-map/map-2')
		})
	})

	it('truncates long drawer titles to 24 characters', () => {
		renderMobileMenu({
			mapTitle: 'This title is definitely longer than twenty four characters',
		})

		expect(
			screen.getByTitle('This title is definitely longer than twenty four characters')
		).toHaveTextContent('This title is definit...')
	})

	it('hides owner/editor-only actions for anonymous collaborators and shows upgrade account', () => {
		mockAccountActions = {
			...mockAccountActions,
			isAnonymous: true,
			subtitle: 'Anonymous User',
		}

		const { onOpenChange } = renderMobileMenu({
			canEdit: false,
			isMapOwner: false,
			user: {
				id: 'profile-1',
				user_id: 'user-1',
				full_name: 'Jordan Smith',
				display_name: 'Jordan',
				created_at: '2026-03-18T00:00:00.000Z',
				is_anonymous: true,
			},
		})

		expect(screen.queryByText('Share map')).not.toBeInTheDocument()
		expect(screen.queryByText('View history')).not.toBeInTheDocument()
		expect(screen.queryByText('Map settings')).not.toBeInTheDocument()
		expect(screen.queryByText('Billing')).not.toBeInTheDocument()
		expect(screen.getByText('Upgrade Account')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Upgrade Account'))
		expect(mockAccountActions.openUpgradeAnonymousPrompt).toHaveBeenCalledTimes(1)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
