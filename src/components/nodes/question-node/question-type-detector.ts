export type QuestionType = 'binary' | 'multiple';

export function detectQuestionType(content: string): QuestionType {
	const lowerContent = content.toLowerCase();

	// Binary questions - decision-making questions
	const binaryPatterns = [
		'should', 'would', 'is it', 'are you', 'do you', 'can we',
		'will', 'does', 'have you', 'has', 'could', 'may',
		'yes/no', 'y/n', '[binary]', 'agree', 'confirm',
		'is this', 'are we', 'shall'
	];

	// Multiple choice indicators
	const multiplePatterns = [
		'which', 'choose', 'select', 'option', 'pick',
		'prefer', 'favorite', 'best', 'what type',
		'what kind', 'alternatives'
	];

	// Check for explicit options in brackets
	const hasOptions = /\[.*,.*\]/.test(content);

	if (hasOptions) {
		return 'multiple';
	}

	// Check for multiple choice patterns first (more specific)
	if (multiplePatterns.some(pattern => lowerContent.includes(pattern))) {
		return 'multiple';
	}

	// Check for binary patterns
	if (binaryPatterns.some(pattern => lowerContent.includes(pattern))) {
		return 'binary';
	}

	// Default to binary for decision-making
	return 'binary';
}

export function parseQuestionOptions(content: string): {
	questionType?: QuestionType;
	options?: string[];
} {
	const result: ReturnType<typeof parseQuestionOptions> = {};

	// Check for yes/no pattern
	if (/\[(yes\/no|y\/n|binary)\]/i.test(content)) {
		result.questionType = 'binary';
		return result;
	}

	// Check for multiple choice options [opt1,opt2,opt3]
	const optionsMatch = content.match(/\[([^\]]+)\]/);

	if (optionsMatch && optionsMatch[1].includes(',')) {
		result.questionType = 'multiple';
		result.options = optionsMatch[1].split(',').map(opt => opt.trim());
		return result;
	}

	return result;
}