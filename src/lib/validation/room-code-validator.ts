export class RoomCodeValidator {
	private static readonly VALID_PATTERN = /^[A-Z0-9]{6}$/;
	private static readonly BLOCKED_PATTERNS = [
		// Offensive words and patterns
		/ASS/,
		/FUCK/,
		/SHIT/,
		/DAMN/,
		/HELL/,
		/BITCH/,
		/CUNT/,
		/DICK/,
		/COCK/,
		/PUSSY/,
		/FAG/,
		/GAY/,
		/NAZI/,
		/RAPE/,
		/KILL/,
		/DEATH/,
		/DEAD/,
		/DIE/,
		/666/,
		/420/,
		/69/,
		// Add more patterns as needed
	];

	private static readonly AMBIGUOUS_CHARS = {
		'0': 'O',
		'1': 'I',
		'5': 'S',
		'8': 'B',
	};

	static validate(code: string): {
		isValid: boolean;
		error?: string;
		sanitized?: string;
	} {
		if (!code) {
			return {
				isValid: false,
				error: 'Room code is required',
			};
		}

		// Sanitize the code
		const sanitized = this.sanitize(code);

		// Check length
		if (sanitized.length !== 6) {
			return {
				isValid: false,
				error: 'Room code must be exactly 6 characters',
				sanitized,
			};
		}

		// Check pattern
		if (!this.VALID_PATTERN.test(sanitized)) {
			return {
				isValid: false,
				error: 'Room code must contain only letters and numbers',
				sanitized,
			};
		}

		// Check for blocked patterns
		for (const pattern of this.BLOCKED_PATTERNS) {
			if (pattern.test(sanitized)) {
				return {
					isValid: false,
					error: 'This room code is not allowed',
					sanitized,
				};
			}
		}

		// Check for sequential patterns
		if (this.hasSequentialPattern(sanitized)) {
			return {
				isValid: false,
				error: 'Room code contains invalid sequential pattern',
				sanitized,
			};
		}

		// Check for repeated characters
		if (this.hasExcessiveRepeats(sanitized)) {
			return {
				isValid: false,
				error: 'Room code contains too many repeated characters',
				sanitized,
			};
		}

		return {
			isValid: true,
			sanitized,
		};
	}

	static sanitize(code: string): string {
		if (!code) return '';

		// Convert to uppercase
		let sanitized = code.toUpperCase();

		// Remove spaces and hyphens
		sanitized = sanitized.replace(/[\s-]/g, '');

		// Replace ambiguous characters
		for (const [ambiguous, replacement] of Object.entries(
			this.AMBIGUOUS_CHARS
		)) {
			sanitized = sanitized.replace(new RegExp(ambiguous, 'g'), replacement);
		}

		// Remove non-alphanumeric characters
		sanitized = sanitized.replace(/[^A-Z0-9]/g, '');

		// Limit to 6 characters
		return sanitized.substring(0, 6);
	}

	private static hasSequentialPattern(code: string): boolean {
		// Check for sequential numbers (e.g., 123, 234, 345)
		for (let i = 0; i < code.length - 2; i++) {
			const char1 = code.charCodeAt(i);
			const char2 = code.charCodeAt(i + 1);
			const char3 = code.charCodeAt(i + 2);

			if (char2 === char1 + 1 && char3 === char2 + 1) {
				return true;
			}

			if (char2 === char1 - 1 && char3 === char2 - 1) {
				return true;
			}
		}

		// Check for keyboard patterns (e.g., QWE, ASD, ZXC)
		const keyboardPatterns = [
			'QWERTY',
			'ASDFGH',
			'ZXCVBN',
			'QAZWSX',
			'WSXEDC',
			'EDCRFV',
			'RFVTGB',
			'TGBYHN',
			'YHNUJM',
			'UJMIKL',
		];

		for (const pattern of keyboardPatterns) {
			for (let i = 0; i < pattern.length - 2; i++) {
				const substring = pattern.substring(i, i + 3);

				if (
					code.includes(substring) ||
					code.includes(substring.split('').reverse().join(''))
				) {
					return true;
				}
			}
		}

		return false;
	}

	private static hasExcessiveRepeats(code: string): boolean {
		// Check for 3 or more consecutive repeated characters
		for (let i = 0; i < code.length - 2; i++) {
			if (code[i] === code[i + 1] && code[i] === code[i + 2]) {
				return true;
			}
		}

		// Check if more than half the characters are the same
		const charCounts = new Map<string, number>();

		for (const char of code) {
			charCounts.set(char, (charCounts.get(char) || 0) + 1);
		}

		for (const count of charCounts.values()) {
			if (count > code.length / 2) {
				return true;
			}
		}

		return false;
	}

	// Generate a safe room code
	static generateSafeCode(): string {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
		let attempts = 0;
		const maxAttempts = 100;

		while (attempts < maxAttempts) {
			let code = '';

			for (let i = 0; i < 6; i++) {
				code += chars[Math.floor(Math.random() * chars.length)];
			}

			const validation = this.validate(code);

			if (validation.isValid) {
				return code;
			}

			attempts++;
		}

		// Fallback to a simple pattern if we can't generate a valid code
		return (
			'ROOM' +
			Math.floor(Math.random() * 100)
				.toString()
				.padStart(2, '0')
		);
	}

	// Format code for display (e.g., ABC-123)
	static formatForDisplay(code: string): string {
		const sanitized = this.sanitize(code);
		if (sanitized.length !== 6) return sanitized;

		return `${sanitized.slice(0, 3)}-${sanitized.slice(3)}`;
	}

	// Check if a code is about to expire (for warning users)
	static isExpiringSoon(
		expiresAt: string | Date,
		thresholdMinutes: number = 5
	): boolean {
		const expiry =
			typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
		const now = new Date();
		const remainingMs = expiry.getTime() - now.getTime();
		const remainingMinutes = remainingMs / (1000 * 60);

		return remainingMinutes > 0 && remainingMinutes <= thresholdMinutes;
	}

	// Get remaining time in human-readable format
	static getTimeRemaining(expiresAt: string | Date): string {
		const expiry =
			typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
		const now = new Date();
		const remainingMs = expiry.getTime() - now.getTime();

		if (remainingMs <= 0) return 'Expired';

		const minutes = Math.floor(remainingMs / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days} day${days > 1 ? 's' : ''}`;
		}

		if (hours > 0) {
			return `${hours} hour${hours > 1 ? 's' : ''}`;
		}

		if (minutes > 0) {
			return `${minutes} minute${minutes > 1 ? 's' : ''}`;
		}

		return 'Less than a minute';
	}
}

// Export validation result type
export interface RoomCodeValidationResult {
	isValid: boolean;
	error?: string;
	sanitized?: string;
}
