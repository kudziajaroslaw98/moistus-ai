import { createClient } from '@/helpers/supabase/client';

export interface AuditLogEntry {
	id?: string;
	timestamp: Date;
	userId: string;
	userType: 'user' | 'guest';
	action: string;
	resourceType: 'map' | 'node' | 'share' | 'room' | 'session';
	resourceId: string;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, any>;
	success: boolean;
	errorMessage?: string;
}

export class AuditLogger {
	private static supabase = createClient();
	private static batchQueue: AuditLogEntry[] = [];
	private static batchTimeout: NodeJS.Timeout | null = null;
	private static readonly BATCH_SIZE = 50;
	private static readonly BATCH_DELAY = 5000; // 5 seconds

	static async log(
		entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
	): Promise<void> {
		const logEntry: AuditLogEntry = {
			...entry,
			timestamp: new Date(),
			ipAddress: entry.ipAddress
				? this.anonymizeIp(entry.ipAddress)
				: undefined,
		};

		// Add to batch queue
		this.batchQueue.push(logEntry);

		// If batch is full, flush immediately
		if (this.batchQueue.length >= this.BATCH_SIZE) {
			await this.flushBatch();
		} else {
			// Otherwise, schedule batch flush
			this.scheduleBatchFlush();
		}

		// For critical actions, log immediately
		if (this.isCriticalAction(entry.action)) {
			await this.logImmediate(logEntry);
		}
	}

	static async logBatch(
		entries: Omit<AuditLogEntry, 'id' | 'timestamp'>[]
	): Promise<void> {
		const logEntries = entries.map((entry) => ({
			...entry,
			timestamp: new Date(),
			ipAddress: entry.ipAddress
				? this.anonymizeIp(entry.ipAddress)
				: undefined,
		}));

		try {
			const { error } = await this.supabase
				.from('audit_logs')
				.insert(logEntries.map(this.formatForDatabase));

			if (error) {
				console.error('Failed to insert audit logs:', error);
			}
		} catch (error) {
			console.error('Error logging audit batch:', error);
		}
	}

	private static anonymizeIp(ip: string): string {
		// Check if IPv4 or IPv6
		if (ip.includes(':')) {
			// IPv6 - keep first 3 segments
			const segments = ip.split(':');
			return segments.slice(0, 3).join(':') + '::/48';
		} else {
			// IPv4 - zero out last octet
			const octets = ip.split('.');

			if (octets.length === 4) {
				octets[3] = '0';
				return octets.join('.');
			}
		}

		return 'unknown';
	}

	private static formatForDatabase(entry: AuditLogEntry): any {
		return {
			user_id: entry.userId,
			user_type: entry.userType,
			action: entry.action,
			resource_type: entry.resourceType,
			resource_id: entry.resourceId,
			ip_address: entry.ipAddress,
			user_agent: entry.userAgent,
			metadata: entry.metadata,
			success: entry.success,
			error_message: entry.errorMessage,
			created_at: entry.timestamp.toISOString(),
		};
	}

	private static isCriticalAction(action: string): boolean {
		const criticalActions = [
			AuditEvents.SECURITY.UNAUTHORIZED_ACCESS,
			AuditEvents.SECURITY.SUSPICIOUS_ACTIVITY,
			AuditEvents.SHARE.PERMISSION_ESCALATION,
			AuditEvents.USER.ACCOUNT_TAKEOVER_ATTEMPT,
			AuditEvents.SECURITY.RATE_LIMIT_EXCEEDED,
		];

		return criticalActions.includes(action);
	}

	private static scheduleBatchFlush(): void {
		if (this.batchTimeout) {
			return; // Already scheduled
		}

		this.batchTimeout = setTimeout(() => {
			this.flushBatch();
		}, this.BATCH_DELAY);
	}

	private static async flushBatch(): Promise<void> {
		if (this.batchQueue.length === 0) {
			return;
		}

		// Clear timeout
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}

		// Get entries to flush
		const entriesToFlush = [...this.batchQueue];
		this.batchQueue = [];

		// Insert batch
		try {
			const { error } = await this.supabase
				.from('audit_logs')
				.insert(entriesToFlush.map(this.formatForDatabase));

			if (error) {
				console.error('Failed to flush audit batch:', error);
				// Re-add failed entries to queue
				this.batchQueue.unshift(...entriesToFlush);
			}
		} catch (error) {
			console.error('Error flushing audit batch:', error);
			// Re-add failed entries to queue
			this.batchQueue.unshift(...entriesToFlush);
		}
	}

	private static async logImmediate(entry: AuditLogEntry): Promise<void> {
		try {
			const { error } = await this.supabase
				.from('audit_logs')
				.insert(this.formatForDatabase(entry));

			if (error) {
				console.error('Failed to log critical audit entry:', error);
			}
		} catch (error) {
			console.error('Error logging critical audit entry:', error);
		}
	}

	// Helper methods for common logging scenarios
	static async logMapAccess(
		userId: string,
		userType: 'user' | 'guest',
		mapId: string,
		success: boolean,
		metadata?: Record<string, any>
	): Promise<void> {
		await this.log({
			userId,
			userType,
			action: AuditEvents.MAP.ACCESS,
			resourceType: 'map',
			resourceId: mapId,
			success,
			metadata,
		});
	}

	static async logShareCreation(
		userId: string,
		shareType: 'room_code' | 'direct',
		mapId: string,
		shareId: string,
		metadata?: Record<string, any>
	): Promise<void> {
		await this.log({
			userId,
			userType: 'user',
			action:
				shareType === 'room_code'
					? AuditEvents.SHARE.ROOM_CODE_CREATED
					: AuditEvents.SHARE.DIRECT_SHARE_CREATED,
			resourceType: 'share',
			resourceId: shareId,
			success: true,
			metadata: {
				...metadata,
				map_id: mapId,
			},
		});
	}

	static async logSecurityEvent(
		userId: string,
		action: string,
		resourceType: AuditLogEntry['resourceType'],
		resourceId: string,
		ipAddress?: string,
		userAgent?: string,
		metadata?: Record<string, any>
	): Promise<void> {
		await this.log({
			userId,
			userType: 'user',
			action,
			resourceType,
			resourceId,
			ipAddress,
			userAgent,
			success: false,
			metadata,
		});
	}

	// Query methods
	static async getRecentLogs(filters: {
		userId?: string;
		resourceId?: string;
		action?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
	}): Promise<AuditLogEntry[]> {
		let query = this.supabase
			.from('audit_logs')
			.select('*')
			.order('created_at', { ascending: false });

		if (filters.userId) {
			query = query.eq('user_id', filters.userId);
		}

		if (filters.resourceId) {
			query = query.eq('resource_id', filters.resourceId);
		}

		if (filters.action) {
			query = query.eq('action', filters.action);
		}

		if (filters.startDate) {
			query = query.gte('created_at', filters.startDate.toISOString());
		}

		if (filters.endDate) {
			query = query.lte('created_at', filters.endDate.toISOString());
		}

		if (filters.limit) {
			query = query.limit(filters.limit);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Failed to fetch audit logs:', error);
			return [];
		}

		return data.map((row) => ({
			id: row.id,
			timestamp: new Date(row.created_at),
			userId: row.user_id,
			userType: row.user_type,
			action: row.action,
			resourceType: row.resource_type,
			resourceId: row.resource_id,
			ipAddress: row.ip_address,
			userAgent: row.user_agent,
			metadata: row.metadata,
			success: row.success,
			errorMessage: row.error_message,
		}));
	}

	// Cleanup old logs (GDPR compliance)
	static async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

		try {
			const { error } = await this.supabase
				.from('audit_logs')
				.delete()
				.lt('created_at', cutoffDate.toISOString());

			if (error) {
				console.error('Failed to cleanup old audit logs:', error);
			}
		} catch (error) {
			console.error('Error cleaning up audit logs:', error);
		}
	}
}

// Audit event constants
export const AuditEvents = {
	// User events
	USER: {
		LOGIN: 'user.login',
		LOGOUT: 'user.logout',
		REGISTER: 'user.register',
		UPDATE_PROFILE: 'user.update_profile',
		DELETE_ACCOUNT: 'user.delete_account',
		ACCOUNT_TAKEOVER_ATTEMPT: 'user.account_takeover_attempt',
	},

	// Map events
	MAP: {
		CREATE: 'map.create',
		UPDATE: 'map.update',
		DELETE: 'map.delete',
		ACCESS: 'map.access',
		EXPORT: 'map.export',
		IMPORT: 'map.import',
	},

	// Share events
	SHARE: {
		ROOM_CODE_CREATED: 'share.room_code_created',
		ROOM_CODE_USED: 'share.room_code_used',
		ROOM_CODE_EXPIRED: 'share.room_code_expired',
		ROOM_CODE_REVOKED: 'share.room_code_revoked',
		DIRECT_SHARE_CREATED: 'share.direct_share_created',
		DIRECT_SHARE_ACCEPTED: 'share.direct_share_accepted',
		DIRECT_SHARE_REJECTED: 'share.direct_share_rejected',
		PERMISSION_CHANGED: 'share.permission_changed',
		PERMISSION_ESCALATION: 'share.permission_escalation',
	},

	// Collaboration events
	COLLABORATION: {
		JOIN_SESSION: 'collab.join_session',
		LEAVE_SESSION: 'collab.leave_session',
		EDIT_NODE: 'collab.edit_node',
		ADD_COMMENT: 'collab.add_comment',
		CURSOR_SHARE: 'collab.cursor_share',
		LOCK_NODE: 'collab.lock_node',
		UNLOCK_NODE: 'collab.unlock_node',
		CONFLICT_RESOLUTION: 'collab.conflict_resolution',
	},

	// Security events
	SECURITY: {
		UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
		RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
		SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
		BRUTE_FORCE_ATTEMPT: 'security.brute_force_attempt',
		SESSION_HIJACK_ATTEMPT: 'security.session_hijack_attempt',
	},

	// Guest events
	GUEST: {
		SESSION_CREATED: 'guest.session_created',
		SESSION_CONVERTED: 'guest.session_converted',
		SESSION_EXPIRED: 'guest.session_expired',
	},
};

// Export helper for creating audit context
export interface AuditContext {
	userId: string;
	userType: 'user' | 'guest';
	ipAddress?: string;
	userAgent?: string;
}

export function createAuditContext(req: Request): AuditContext {
	// Extract user info from request (implement based on your auth system)
	return {
		userId: 'unknown', // Extract from auth
		userType: 'user',
		ipAddress:
			req.headers.get('x-forwarded-for') ||
			req.headers.get('x-real-ip') ||
			undefined,
		userAgent: req.headers.get('user-agent') || undefined,
	};
}
