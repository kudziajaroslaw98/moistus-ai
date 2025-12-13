'use client';

import useAppStore from '@/store/mind-map-store';
import type { ShareRole } from '@/types/sharing-types';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

/**
 * Permission state for collaborative features.
 * Used to control what actions users can perform based on their role.
 */
export interface PermissionState {
	/** User can edit nodes, edges, and map content */
	canEdit: boolean;
	/** User can add/view comments */
	canComment: boolean;
	/** User can view the map */
	canView: boolean;

	/** User is the owner of this map */
	isOwner: boolean;
	/** User joined via a share link/room code */
	isCollaborator: boolean;
	/** User's role (owner, editor, commenter, viewer) */
	role: ShareRole | null;

	/** Permissions are still loading */
	isLoading: boolean;
}

/**
 * Central hook for permission checks in collaborative features.
 *
 * Permission hierarchy:
 * - Owner: Full access (can_edit, can_comment, can_view)
 * - Editor: Full edit access (can_edit, can_comment, can_view)
 * - Commenter: View + comment (can_comment, can_view)
 * - Viewer: View only (can_view)
 *
 * Usage:
 * ```tsx
 * const { canEdit, canComment } = usePermissions();
 *
 * // Hide edit button for non-editors
 * {canEdit && <EditButton />}
 *
 * // Show comment button for commenters and above
 * {canComment && <CommentButton />}
 * ```
 */
export function usePermissions(): PermissionState {
	const { currentUser, mindMap, lastJoinResult, loadingStates } = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
			mindMap: state.mindMap,
			lastJoinResult: state.lastJoinResult,
			loadingStates: state.loadingStates,
		}))
	);

	return useMemo(() => {
		const isLoading = loadingStates?.isStateLoading ?? false;

		// Check owner FIRST - owners always have access regardless of loading state
		// This prevents blocking owner access during map data fetch
		const isOwner = Boolean(
			currentUser && mindMap && mindMap.user_id === currentUser.id
		);

		if (isOwner) {
			return {
				canEdit: true,
				canComment: true,
				canView: true,
				isOwner: true,
				isCollaborator: false,
				role: 'owner',
				isLoading, // Still track loading, but don't block owner
			};
		}

		// For non-owners, be restrictive during loading
		if (isLoading) {
			return {
				canEdit: false,
				canComment: false,
				canView: true,
				isOwner: false,
				isCollaborator: false,
				role: null,
				isLoading: true,
			};
		}

		// No mind map loaded yet - default to view-only
		if (!mindMap) {
			return {
				canEdit: false,
				canComment: false,
				canView: true,
				isOwner: false,
				isCollaborator: false,
				role: null,
				isLoading: false,
			};
		}

		// Collaborator - use permissions from join result
		const permissions = lastJoinResult?.permissions;
		const isCollaborator = Boolean(lastJoinResult);

		if (permissions) {
			return {
				canEdit: Boolean(permissions.can_edit),
				canComment: Boolean(permissions.can_comment),
				canView: Boolean(permissions.can_view),
				isOwner: false,
				isCollaborator: true,
				role: (permissions.role as ShareRole) ?? null,
				isLoading: false,
			};
		}

		// Default: view-only as safety fallback for unknown state
		// This handles edge cases like:
		// - User not authenticated but viewing a public map
		// - State not yet fully initialized
		return {
			canEdit: false,
			canComment: false,
			canView: true,
			isOwner: false,
			isCollaborator,
			role: null,
			isLoading: false,
		};
	}, [currentUser, mindMap, lastJoinResult, loadingStates?.isStateLoading]);
}
