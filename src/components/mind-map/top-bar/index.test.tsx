import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { MindMapTopBar } from './index'

let mockIsMobile = true

jest.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => mockIsMobile,
}))

jest.mock('@/components/common/user-menu', () => ({
	UserMenu: () => <div data-testid='user-menu' />,
}))

jest.mock('@/components/notifications/notification-bell', () => ({
	NotificationBell: () => <div data-testid='notification-bell' />,
}))

jest.mock('@/components/realtime/realtime-avatar-stack', () => ({
	RealtimeAvatarStack: () => <div data-testid='avatar-stack' />,
}))

jest.mock('./top-bar-actions', () => ({
	TopBarActions: () => <div data-testid='top-bar-actions' />,
}))

jest.mock('./mobile-menu', () => ({
	MobileMenu: () => null,
}))

jest.mock('./top-bar-breadcrumb', () => ({
	TopBarBreadcrumb: ({ title }: { title?: string }) => (
		<div data-testid='breadcrumb'>{title}</div>
	),
}))

jest.mock('@xyflow/react', () => ({
	Panel: ({
		children,
		className,
	}: {
		children: ReactNode
		className?: string
	}) => <div className={className}>{children}</div>,
}))

function renderTopBar({ isMapReady = true }: { isMapReady?: boolean } = {}) {
	return render(
		<MindMapTopBar
			activityState='viewing'
			canEdit
			currentUser={{ id: 'user-1' }}
			handleOpenSettings={jest.fn()}
			handleToggleHistorySidebar={jest.fn()}
			handleToggleMapSettings={jest.fn()}
			handleToggleSharePanel={jest.fn()}
			isMapReady={isMapReady}
			mapId='map-1'
			mindMap={{ title: 'Dump', user_id: 'user-1' }}
			mobileMenuOpen={false}
			mobileUnreadCount={3}
			popoverOpen={{ mapSettings: false, sharePanel: false }}
			setMobileMenuOpen={jest.fn()}
			userProfile={{
				id: 'profile-1',
				user_id: 'user-1',
				full_name: 'Jordan Smith',
				display_name: 'Jordan',
				created_at: '2026-03-18T00:00:00.000Z',
				email: 'jordan@shiko.ai',
			}}
		/>
	)
}

describe('MindMapTopBar mobile header', () => {
	beforeEach(() => {
		mockIsMobile = true
	})

	it('renders only the hamburger trigger on mobile and shows the unread badge there', () => {
		renderTopBar()

		expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument()
		expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument()
		expect(screen.queryByTestId('share-button')).not.toBeInTheDocument()

		const openMenuButton = screen.getByRole('button', { name: 'Open menu' })
		expect(openMenuButton).toHaveAttribute(
			'data-onboarding-target',
			'mobile-menu'
		)
		expect(openMenuButton).toHaveAttribute('aria-expanded', 'false')
		expect(openMenuButton).toHaveAttribute(
			'aria-describedby',
			'mobile-menu-unread-count'
		)
		expect(screen.getByText('3 unread notifications')).toHaveClass('sr-only')
		expect(openMenuButton.className).toContain('bg-transparent')
		expect(openMenuButton.className).not.toContain('rounded-2xl')
		expect(screen.getByText('3')).toBeInTheDocument()
	})

	it('keeps the desktop controls unchanged when not mobile', () => {
		mockIsMobile = false

		renderTopBar()

		expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
		expect(screen.getByTestId('user-menu')).toBeInTheDocument()
		expect(screen.getByTestId('avatar-stack')).toBeInTheDocument()
		expect(screen.getByTestId('top-bar-actions')).toBeInTheDocument()
		expect(screen.getByTestId('share-button')).toBeInTheDocument()
		expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument()
	})

	it('streams account controls first and hides map-dependent controls before map is ready', () => {
		mockIsMobile = false

		renderTopBar({ isMapReady: false })

		expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
		expect(screen.getByTestId('user-menu')).toBeInTheDocument()
		expect(screen.queryByTestId('top-bar-actions')).not.toBeInTheDocument()
		expect(screen.queryByTestId('share-button')).not.toBeInTheDocument()
	})
})
