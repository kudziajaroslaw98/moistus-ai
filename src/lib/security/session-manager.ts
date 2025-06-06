import crypto from 'crypto';
import { JWTPayload, SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface SessionData {
	sessionId: string;
	userId?: string;
	fingerprint: string;
	createdAt: number;
	expiresAt: number;
	isGuest: boolean;
	metadata?: Record<string, any>;
}

export interface GuestSession {
	sessionId: string;
	fingerprint: string;
	displayName: string;
	email?: string;
	createdAt: Date;
	lastActivity: Date;
}

export class SessionManager {
	private static readonly SESSION_SECRET =
		process.env.SESSION_SECRET || 'dev-secret-key';
	private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
	private static readonly GUEST_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
	private static readonly COOKIE_NAME = 'moistus_session';
	private static readonly FINGERPRINT_COOKIE = 'moistus_fp';

	// In-memory session store (replace with Redis in production)
	private static sessions = new Map<string, SessionData>();
	private static guestSessions = new Map<string, GuestSession>();

	static generateSessionId(): string {
		// Generate cryptographically secure session ID
		const timestamp = Date.now().toString(36);
		const randomBytes = crypto.randomBytes(16).toString('base64url');
		return `${timestamp}_${randomBytes}`;
	}

	static generateFingerprint(req: NextRequest): string {
		// Collect browser fingerprint components
		const components = {
			userAgent: req.headers.get('user-agent') || '',
			acceptLanguage: req.headers.get('accept-language') || '',
			acceptEncoding: req.headers.get('accept-encoding') || '',
			accept: req.headers.get('accept') || '',
			// Add more stable headers but avoid those that change frequently
			platform: this.extractPlatform(req.headers.get('user-agent') || ''),
			// Don't use IP as it can change
		};

		// Create a stable hash of the components
		const fingerprintData = JSON.stringify(components);
		const hash = crypto
			.createHash('sha256')
			.update(fingerprintData)
			.digest('hex');

		return hash;
	}

	private static extractPlatform(userAgent: string): string {
		if (userAgent.includes('Windows')) return 'windows';
		if (userAgent.includes('Mac')) return 'mac';
		if (userAgent.includes('Linux')) return 'linux';
		if (userAgent.includes('Android')) return 'android';
		if (
			userAgent.includes('iOS') ||
			userAgent.includes('iPhone') ||
			userAgent.includes('iPad')
		)
			return 'ios';
		return 'unknown';
	}

	static async createSecureToken(payload: any): Promise<string> {
		const secret = new TextEncoder().encode(this.SESSION_SECRET);

		const jwt = await new SignJWT(payload)
			.setProtectedHeader({ alg: 'HS256' })
			.setIssuedAt()
			.setExpirationTime('24h')
			.setJti(crypto.randomBytes(8).toString('hex')) // Add unique ID
			.sign(secret);

		return jwt;
	}

	static async verifySecureToken(token: string): Promise<JWTPayload | null> {
		try {
			const secret = new TextEncoder().encode(this.SESSION_SECRET);
			const { payload } = await jwtVerify(token, secret);

			// Additional validation
			if (!payload.exp || payload.exp * 1000 < Date.now()) {
				return null; // Token expired
			}

			return payload;
		} catch (error) {
			console.error('Token verification failed:', error);
			return null;
		}
	}

	static async createSession(
		userId: string | null,
		fingerprint: string,
		isGuest: boolean = false,
		metadata?: Record<string, any>
	): Promise<SessionData> {
		const sessionId = this.generateSessionId();
		const now = Date.now();

		const sessionData: SessionData = {
			sessionId,
			userId: userId || undefined,
			fingerprint,
			createdAt: now,
			expiresAt:
				now + (isGuest ? this.GUEST_SESSION_DURATION : this.SESSION_DURATION),
			isGuest,
			metadata,
		};

		// Store session
		this.sessions.set(sessionId, sessionData);

		// Create secure token
		const token = await this.createSecureToken({
			sid: sessionId,
			uid: userId,
			fp: fingerprint,
			guest: isGuest,
		});

		// Set cookie
		const cookieStore = await cookies();
		cookieStore.set(this.COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: isGuest
				? this.GUEST_SESSION_DURATION / 1000
				: this.SESSION_DURATION / 1000,
			path: '/',
		});

		// Set fingerprint cookie (client-readable)
		cookieStore.set(this.FINGERPRINT_COOKIE, fingerprint, {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 365 * 24 * 60 * 60, // 1 year
			path: '/',
		});

		return sessionData;
	}

	static async validateSession(req: NextRequest): Promise<SessionData | null> {
		const cookieStore = await cookies();
		const token = cookieStore.get(this.COOKIE_NAME)?.value;

		if (!token) {
			return null;
		}

		// Verify token
		const payload = await this.verifySecureToken(token);

		if (!payload) {
			return null;
		}

		// Get session data
		const sessionId = payload.sid as string;
		const session = this.sessions.get(sessionId);

		if (!session) {
			return null;
		}

		// Check expiration
		if (session.expiresAt < Date.now()) {
			this.sessions.delete(sessionId);
			return null;
		}

		// Validate fingerprint
		const currentFingerprint = this.generateFingerprint(req);

		if (session.fingerprint !== currentFingerprint) {
			// Log suspicious activity
			console.warn('Fingerprint mismatch for session:', sessionId);
			// You might want to be more lenient here depending on your security requirements
		}

		return session;
	}

	static validateGuestSession(sessionId: string, fingerprint: string): boolean {
		const session = this.sessions.get(sessionId);

		if (!session || !session.isGuest) {
			return false;
		}

		// Check expiration
		if (session.expiresAt < Date.now()) {
			this.sessions.delete(sessionId);
			return false;
		}

		// Validate fingerprint with some tolerance
		// Guest sessions might have less strict fingerprint matching
		const fingerprintMatch = session.fingerprint === fingerprint;

		if (!fingerprintMatch) {
			// For guests, we might allow some fingerprint changes
			// but log them for security monitoring
			console.warn('Guest fingerprint mismatch:', {
				sessionId,
				expected: session.fingerprint,
				actual: fingerprint,
			});
		}

		return true;
	}

	static async createGuestSession(
		displayName: string,
		email: string | undefined,
		fingerprint: string
	): Promise<GuestSession> {
		const sessionId = this.generateSessionId();
		const now = new Date();

		const guestSession: GuestSession = {
			sessionId,
			fingerprint,
			displayName,
			email,
			createdAt: now,
			lastActivity: now,
		};

		// Store guest session
		this.guestSessions.set(sessionId, guestSession);

		// Also create a regular session
		await this.createSession(null, fingerprint, true, {
			displayName,
			email,
		});

		return guestSession;
	}

	static updateGuestActivity(sessionId: string): void {
		const guestSession = this.guestSessions.get(sessionId);

		if (guestSession) {
			guestSession.lastActivity = new Date();
		}
	}

	static async convertGuestToUser(
		guestSessionId: string,
		userId: string
	): Promise<SessionData | null> {
		const guestSession = this.guestSessions.get(guestSessionId);
		const session = this.sessions.get(guestSessionId);

		if (!guestSession || !session) {
			return null;
		}

		// Create new user session
		const newSession = await this.createSession(
			userId,
			session.fingerprint,
			false,
			{
				convertedFrom: guestSessionId,
				originalDisplayName: guestSession.displayName,
			}
		);

		// Clean up guest session
		this.guestSessions.delete(guestSessionId);
		this.sessions.delete(guestSessionId);

		return newSession;
	}

	static async destroySession(sessionId: string): Promise<void> {
		this.sessions.delete(sessionId);
		this.guestSessions.delete(sessionId);

		// Clear cookie
		const cookieStore = await cookies();
		cookieStore.delete(this.COOKIE_NAME);
	}

	static async rotateSession(sessionId: string): Promise<SessionData | null> {
		const session = this.sessions.get(sessionId);

		if (!session) {
			return null;
		}

		// Create new session with same data
		const newSession = await this.createSession(
			session.userId || null,
			session.fingerprint,
			session.isGuest,
			session.metadata
		);

		// Delete old session
		this.sessions.delete(sessionId);

		return newSession;
	}

	// Cleanup expired sessions (should be called periodically)
	static cleanupExpiredSessions(): void {
		const now = Date.now();

		// Clean regular sessions
		for (const [sessionId, session] of this.sessions.entries()) {
			if (session.expiresAt < now) {
				this.sessions.delete(sessionId);
			}
		}

		// Clean guest sessions
		const guestExpiry = now - this.GUEST_SESSION_DURATION;

		for (const [sessionId, guestSession] of this.guestSessions.entries()) {
			if (guestSession.lastActivity.getTime() < guestExpiry) {
				this.guestSessions.delete(sessionId);
			}
		}
	}

	// Get session stats (for monitoring)
	static getSessionStats(): {
		totalSessions: number;
		guestSessions: number;
		userSessions: number;
		expiredSessions: number;
	} {
		const now = Date.now();
		let expiredCount = 0;
		let guestCount = 0;
		let userCount = 0;

		for (const session of this.sessions.values()) {
			if (session.expiresAt < now) {
				expiredCount++;
			} else if (session.isGuest) {
				guestCount++;
			} else {
				userCount++;
			}
		}

		return {
			totalSessions: this.sessions.size,
			guestSessions: guestCount,
			userSessions: userCount,
			expiredSessions: expiredCount,
		};
	}
}

// Export helper functions for middleware
export async function validateRequest(
	req: NextRequest
): Promise<SessionData | null> {
	return SessionManager.validateSession(req);
}

export async function createGuestSession(
	displayName: string,
	email: string | undefined,
	req: NextRequest
): Promise<GuestSession> {
	const fingerprint = SessionManager.generateFingerprint(req);
	return SessionManager.createGuestSession(displayName, email, fingerprint);
}

export async function createUserSession(
	userId: string,
	req: NextRequest
): Promise<SessionData> {
	const fingerprint = SessionManager.generateFingerprint(req);
	return SessionManager.createSession(userId, fingerprint, false);
}
