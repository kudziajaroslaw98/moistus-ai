import { Filter } from 'bad-words';

export class DisplayNameValidator {
	private static filter = new Filter();
	private static readonly MAX_LENGTH = 50;
	private static readonly MIN_LENGTH = 2;

	// Common spam patterns
	private static readonly SPAM_PATTERNS = [
		/^(test|user|guest|admin|root|bot)\d*$/i,
		/^[0-9]+$/,
		/^(.)\1+$/, // All same character
		/https?:\/\//i, // URLs
		/\.(com|net|org|io|xyz|tk)/i, // Domain extensions
		/@.*\.(com|net|org)/i, // Email patterns
		/(\$|€|£|¥|₹|₽|¢)/, // Currency symbols
		/\b(buy|sell|cheap|discount|offer|deal|click|free|win|winner|congratulations|prize)\b/i,
		/\b(viagra|cialis|pills|drugs|pharma|casino|poker|betting|lottery|bitcoin|crypto|nft)\b/i,
		/\b(xxx|porn|sex|nude|hot|sexy|dating|singles|meet)\b/i,
		/[🚀💰💵💸🤑💳💎🎰🎲]/, // Spam emoji patterns
		/(.)\1{3,}/, // More than 3 repeated characters
	];

	private static readonly BLOCKED_NAMES = [
		'admin',
		'administrator',
		'moderator',
		'mod',
		'owner',
		'system',
		'bot',
		'ai',
		'moistus',
		'moistusai',
		'staff',
		'support',
		'help',
		'info',
		'noreply',
		'no-reply',
		'donotreply',
		'do-not-reply',
		'null',
		'undefined',
		'anonymous',
		'deleted',
		'[deleted]',
		'[removed]',
	];

	static validate(name: string): {
		isValid: boolean;
		error?: string;
		sanitized?: string;
	} {
		if (!name || typeof name !== 'string') {
			return {
				isValid: false,
				error: 'Display name is required',
			};
		}

		// Sanitize first
		const sanitized = this.sanitize(name);

		// Check length after sanitization
		if (sanitized.length < this.MIN_LENGTH) {
			return {
				isValid: false,
				error: `Display name must be at least ${this.MIN_LENGTH} characters`,
				sanitized,
			};
		}

		if (sanitized.length > this.MAX_LENGTH) {
			return {
				isValid: false,
				error: `Display name must be less than ${this.MAX_LENGTH} characters`,
				sanitized,
			};
		}

		// Check for profanity
		if (this.containsProfanity(sanitized)) {
			return {
				isValid: false,
				error: 'Display name contains inappropriate language',
				sanitized,
			};
		}

		// Check for blocked names
		if (this.isBlockedName(sanitized)) {
			return {
				isValid: false,
				error: 'This display name is not allowed',
				sanitized,
			};
		}

		// Check for spam patterns
		if (this.isSpamName(sanitized)) {
			return {
				isValid: false,
				error: 'Display name appears to be spam',
				sanitized,
			};
		}

		// Check for valid characters (letters, numbers, spaces, common punctuation)
		const validPattern = /^[a-zA-Z0-9\s\-_'.]+$/;

		if (!validPattern.test(sanitized)) {
			return {
				isValid: false,
				error: 'Display name contains invalid characters',
				sanitized,
			};
		}

		// Check if name is just whitespace
		if (sanitized.trim().length === 0) {
			return {
				isValid: false,
				error: 'Display name cannot be empty',
				sanitized,
			};
		}

		return {
			isValid: true,
			sanitized,
		};
	}

	static sanitize(name: string): string {
		if (!name || typeof name !== 'string') return '';

		// Trim whitespace
		let sanitized = name.trim();

		// Replace multiple spaces with single space
		sanitized = sanitized.replace(/\s+/g, ' ');

		// Remove zero-width characters and other invisible unicode
		sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

		// Remove control characters
		sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

		// Normalize unicode (e.g., convert fancy letters to normal)
		sanitized = sanitized.normalize('NFKC');

		// Remove excessive punctuation
		sanitized = sanitized.replace(/([!?.]){2,}/g, '$1');

		// Remove leading/trailing punctuation except for apostrophes
		sanitized = sanitized.replace(/^[^\w']+|[^\w']+$/g, '');

		// Limit length
		if (sanitized.length > this.MAX_LENGTH) {
			sanitized = sanitized.substring(0, this.MAX_LENGTH);
		}

		return sanitized;
	}

	private static containsProfanity(name: string): boolean {
		try {
			return this.filter.isProfane(name);
		} catch {
			// If the filter fails, check manually against common words
			const commonProfanity = [
				'fuck',
				'shit',
				'ass',
				'damn',
				'hell',
				'bitch',
				'bastard',
				'cunt',
				'dick',
				'cock',
				'pussy',
				'fag',
				'gay',
				'nazi',
				'rape',
			];

			const lowerName = name.toLowerCase();
			return commonProfanity.some((word) => {
				const regex = new RegExp(`\\b${word}\\b`, 'i');
				return regex.test(lowerName);
			});
		}
	}

	private static isBlockedName(name: string): boolean {
		const lowerName = name.toLowerCase().trim();

		// Check exact matches
		if (this.BLOCKED_NAMES.includes(lowerName)) {
			return true;
		}

		// Check if name starts with blocked name followed by numbers
		for (const blocked of this.BLOCKED_NAMES) {
			const pattern = new RegExp(`^${blocked}\\d*$`, 'i');

			if (pattern.test(lowerName)) {
				return true;
			}
		}

		return false;
	}

	private static isSpamName(name: string): boolean {
		// Check against spam patterns
		for (const pattern of this.SPAM_PATTERNS) {
			if (pattern.test(name)) {
				return true;
			}
		}

		// Check for excessive uppercase (SHOUTING)
		const upperCount = (name.match(/[A-Z]/g) || []).length;
		const letterCount = (name.match(/[a-zA-Z]/g) || []).length;

		if (letterCount > 5 && upperCount / letterCount > 0.7) {
			return true;
		}

		// Check for excessive numbers
		const numberCount = (name.match(/[0-9]/g) || []).length;

		if (numberCount > name.length / 2) {
			return true;
		}

		// Check for excessive special characters
		const specialCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;

		if (specialCount > name.length / 3) {
			return true;
		}

		return false;
	}

	// Generate a suggested name from email or other input
	static generateFromEmail(email: string): string {
		if (!email || !email.includes('@')) {
			return '';
		}

		const [localPart] = email.split('@');

		// Remove numbers and special characters
		let suggested = localPart.replace(/[0-9_.-]/g, ' ');

		// Convert to title case
		suggested = suggested
			.split(' ')
			.filter((word) => word.length > 0)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');

		// Validate and sanitize
		const validation = this.validate(suggested);

		return validation.sanitized || '';
	}

	// Generate anonymous name
	static generateAnonymousName(): string {
		const adjectives = [
			'Happy',
			'Clever',
			'Bright',
			'Swift',
			'Calm',
			'Wise',
			'Kind',
			'Brave',
			'Noble',
			'Gentle',
		];

		const nouns = [
			'Panda',
			'Eagle',
			'Tiger',
			'Dragon',
			'Phoenix',
			'Wolf',
			'Fox',
			'Bear',
			'Lion',
			'Hawk',
		];

		const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
		const noun = nouns[Math.floor(Math.random() * nouns.length)];
		const number = Math.floor(Math.random() * 100);

		return `${adjective}${noun}${number}`;
	}

	// Check if name appears to be auto-generated
	static isAutoGenerated(name: string): boolean {
		// Common auto-generated patterns
		const autoPatterns = [
			/^user\d+$/i,
			/^guest\d+$/i,
			/^anonymous\d+$/i,
			/^[a-z]+[A-Z][a-z]+\d+$/, // camelCase with numbers
			/^[A-Z][a-z]+[A-Z][a-z]+\d+$/, // PascalCase with numbers
		];

		return autoPatterns.some((pattern) => pattern.test(name));
	}

	// Get display name with fallback
	static getDisplayName(name?: string | null, email?: string | null): string {
		if (name) {
			const validation = this.validate(name);

			if (validation.isValid && validation.sanitized) {
				return validation.sanitized;
			}
		}

		if (email) {
			const suggested = this.generateFromEmail(email);

			if (suggested) {
				return suggested;
			}
		}

		return this.generateAnonymousName();
	}
}

// Export validation result type
export interface DisplayNameValidationResult {
	isValid: boolean;
	error?: string;
	sanitized?: string;
}
