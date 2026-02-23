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
	/** User's role (owner, editor, commentator, viewer) */
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
 * - Commentator: View + comment (can_comment, can_view)
 * - Viewer: View only (can_view)
 */
export function usePermissions(): PermissionState {
	const {
		currentUser,
		mindMap,
		loadingStates,
		permissions,
		isPermissionsLoading,
	} = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
			mindMap: state.mindMap,
			loadingStates: state.loadingStates,
			permissions: state.permissions,
			isPermissionsLoading: state.isPermissionsLoading,
		}))
	);

	return useMemo(() => {
		const isLoading =
			Boolean(loadingStates?.isStateLoading) || Boolean(isPermissionsLoading);

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
				isLoading,
			};
		}

		if (isLoading && !permissions.role) {
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

		if (permissions.role) {
			return {
				canEdit: Boolean(permissions.can_edit),
				canComment: Boolean(permissions.can_comment),
				canView: Boolean(permissions.can_view),
				isOwner: false,
				isCollaborator: true,
				role: permissions.role,
				isLoading: false,
			};
		}

		return {
			canEdit: false,
			canComment: false,
			canView: true,
			isOwner: false,
			isCollaborator: false,
			role: null,
			isLoading: false,
		};
	}, [
		currentUser,
		mindMap,
		permissions,
		loadingStates?.isStateLoading,
		isPermissionsLoading,
	]);
}
