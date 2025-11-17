/**
 * Language Detector - Detect programming language from code content
 */

/**
 * Language patterns and indicators
 */
interface LanguagePattern {
	language: string;
	patterns: RegExp[];
	keywords?: string[];
	fileExtensions?: string[];
	weight?: number;
}

/**
 * Language detection patterns
 */
const LANGUAGE_PATTERNS: LanguagePattern[] = [
	{
		language: 'javascript',
		patterns: [
			/\b(const|let|var)\s+\w+\s*=/,
			/function\s*\w*\s*\(/,
			/\w+\s*=>\s*/,
			/console\.(log|error|warn)/,
			/\b(async|await)\b/,
			/\b(require|module\.exports)\b/,
		],
		keywords: [
			'const',
			'let',
			'var',
			'function',
			'return',
			'if',
			'else',
			'for',
			'while',
		],
		fileExtensions: ['.js', '.jsx', '.mjs'],
		weight: 1,
	},
	{
		language: 'typescript',
		patterns: [
			/\b(interface|type|enum)\s+\w+/,
			/:\s*(string|number|boolean|any|void)/,
			/\b(public|private|protected)\s+/,
			/<\w+>/,
			/\b(implements|extends)\s+/,
			/\b(namespace|declare)\b/,
		],
		keywords: ['interface', 'type', 'enum', 'implements', 'extends'],
		fileExtensions: ['.ts', '.tsx'],
		weight: 2,
	},
	{
		language: 'python',
		patterns: [
			/\bdef\s+\w+\s*\(/,
			/\bclass\s+\w+[\(:]/,
			/\bimport\s+\w+/,
			/\bfrom\s+\w+\s+import/,
			/\bif\s+.*:/,
			/\bfor\s+\w+\s+in\s+/,
			/print\s*\(/,
			/\b(self|__init__|__name__)\b/,
		],
		keywords: [
			'def',
			'class',
			'import',
			'from',
			'if',
			'elif',
			'else',
			'for',
			'while',
		],
		fileExtensions: ['.py'],
		weight: 1,
	},
	{
		language: 'java',
		patterns: [
			/\b(public|private|protected)\s+(class|interface)/,
			/\b(public|private|protected)\s+(static\s+)?void\s+\w+/,
			/System\.out\.(println|print)/,
			/\b(import\s+java\.|package\s+)/,
			/\b(extends|implements)\s+/,
			/\bnew\s+\w+\(/,
		],
		keywords: [
			'public',
			'private',
			'class',
			'interface',
			'void',
			'static',
			'final',
		],
		fileExtensions: ['.java'],
		weight: 1,
	},
	{
		language: 'csharp',
		patterns: [
			/\b(namespace|using)\s+/,
			/\b(public|private|internal)\s+(class|interface)/,
			/Console\.(WriteLine|Write)/,
			/\b(async\s+)?Task/,
			/\b(var|string|int|bool)\s+\w+\s*=/,
		],
		keywords: ['namespace', 'using', 'class', 'interface', 'public', 'private'],
		fileExtensions: ['.cs'],
		weight: 1,
	},
	{
		language: 'cpp',
		patterns: [
			/#include\s*[<"]/,
			/\b(std::)?cout\s*<</,
			/\b(int|void|char|float|double)\s+\w+\s*\(/,
			/\b(class|struct)\s+\w+\s*{/,
			/\b(public|private|protected):/,
			/\busing\s+namespace\s+/,
		],
		keywords: ['#include', 'cout', 'cin', 'class', 'struct', 'namespace'],
		fileExtensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
		weight: 1,
	},
	{
		language: 'go',
		patterns: [
			/\bpackage\s+\w+/,
			/\bfunc\s+(\(\w+\s+\w+\)\s+)?\w+\(/,
			/\b(import\s+\(|import\s+")/,
			/fmt\.(Print|Println)/,
			/\b(type\s+\w+\s+(struct|interface))/,
			/:=\s*/,
		],
		keywords: ['package', 'func', 'import', 'type', 'struct', 'interface'],
		fileExtensions: ['.go'],
		weight: 1,
	},
	{
		language: 'rust',
		patterns: [
			/\bfn\s+\w+\s*\(/,
			/\b(let|let\s+mut)\s+\w+/,
			/\b(impl|trait|struct|enum)\s+/,
			/println!\s*\(/,
			/\b(use|mod|pub)\s+/,
			/\b(match|if\s+let)\s+/,
		],
		keywords: ['fn', 'let', 'mut', 'impl', 'trait', 'struct', 'enum'],
		fileExtensions: ['.rs'],
		weight: 1,
	},
	{
		language: 'ruby',
		patterns: [
			/\bdef\s+\w+/,
			/\bclass\s+\w+/,
			/\b(require|require_relative)\s+/,
			/puts\s+/,
			/\b(do|end)\b/,
			/\b(attr_accessor|attr_reader|attr_writer)\b/,
		],
		keywords: ['def', 'class', 'module', 'require', 'end', 'do'],
		fileExtensions: ['.rb'],
		weight: 1,
	},
	{
		language: 'php',
		patterns: [
			/<\?php/,
			/\$\w+\s*=/,
			/\b(function|class)\s+\w+/,
			/echo\s+/,
			/\b(require|include)(_once)?\s+/,
			/->/,
		],
		keywords: ['<?php', 'function', 'class', 'echo', 'return'],
		fileExtensions: ['.php'],
		weight: 1,
	},
	{
		language: 'swift',
		patterns: [
			/\b(func|class|struct|enum|protocol)\s+\w+/,
			/\b(var|let)\s+\w+\s*:/,
			/\bimport\s+\w+/,
			/print\s*\(/,
			/\b(if|guard)\s+let\s+/,
		],
		keywords: ['func', 'class', 'struct', 'var', 'let', 'import'],
		fileExtensions: ['.swift'],
		weight: 1,
	},
	{
		language: 'kotlin',
		patterns: [
			/\bfun\s+\w+\s*\(/,
			/\b(val|var)\s+\w+\s*[:=]/,
			/\b(class|object|interface)\s+\w+/,
			/println\s*\(/,
			/\bimport\s+/,
		],
		keywords: ['fun', 'val', 'var', 'class', 'object', 'interface'],
		fileExtensions: ['.kt', '.kts'],
		weight: 1,
	},
	{
		language: 'sql',
		patterns: [
			/\b(SELECT|FROM|WHERE|JOIN|INSERT|UPDATE|DELETE)\b/i,
			/\b(CREATE|ALTER|DROP)\s+(TABLE|DATABASE|INDEX)/i,
			/\b(GROUP BY|ORDER BY|HAVING)\b/i,
			/\b(AND|OR|NOT|IN|EXISTS)\b/i,
		],
		keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE'],
		fileExtensions: ['.sql'],
		weight: 1,
	},
	{
		language: 'html',
		patterns: [
			/<(html|head|body|div|span|p|a|img|script|style)/i,
			/<\/\w+>/,
			/\bclass="[^"]*"/,
			/\bid="[^"]*"/,
			/<!DOCTYPE/i,
		],
		keywords: ['<html>', '<body>', '<div>', '<script>', '<style>'],
		fileExtensions: ['.html', '.htm'],
		weight: 1,
	},
	{
		language: 'css',
		patterns: [
			/[.#]\w+\s*{/,
			/\w+\s*:\s*[^;]+;/,
			/@(media|keyframes|import)/,
			/\b(margin|padding|color|background|border)\s*:/,
		],
		keywords: ['margin', 'padding', 'color', 'background', 'display'],
		fileExtensions: ['.css', '.scss', '.sass', '.less'],
		weight: 1,
	},
	{
		language: 'json',
		patterns: [
			/^\s*{[\s\S]*}\s*$/,
			/^\s*\[[\s\S]*\]\s*$/,
			/"[^"]*"\s*:\s*["{[\d]/,
		],
		fileExtensions: ['.json'],
		weight: 0.5,
	},
	{
		language: 'yaml',
		patterns: [/^[\s]*[\w]+:\s*$/m, /^[\s]*-\s+/m, /^[\s]*[\w]+:\s*[|>]/m],
		fileExtensions: ['.yaml', '.yml'],
		weight: 0.5,
	},
	{
		language: 'markdown',
		patterns: [
			/^#{1,6}\s+/m,
			/\[.*\]\(.*\)/,
			/```\w*/,
			/^\s*[-*+]\s+/m,
			/^\s*\d+\.\s+/m,
		],
		fileExtensions: ['.md', '.markdown'],
		weight: 0.5,
	},
	{
		language: 'shell',
		patterns: [
			/^#!/,
			/\b(echo|cd|ls|mkdir|rm|cp|mv)\b/,
			/\$\w+/,
			/\b(if|then|else|fi|for|while|do|done)\b/,
		],
		keywords: ['echo', 'cd', 'ls', 'if', 'then', 'else', 'fi'],
		fileExtensions: ['.sh', '.bash'],
		weight: 1,
	},
];

/**
 * Detect language from code content
 */
export function detectLanguage(code: string, fileName?: string): string {
	if (!code || code.trim().length === 0) {
		return 'plaintext';
	}

	// Check file extension first if provided
	if (fileName) {
		const ext = getFileExtension(fileName);

		for (const lang of LANGUAGE_PATTERNS) {
			if (lang.fileExtensions?.includes(ext)) {
				return lang.language;
			}
		}
	}

	// Score each language based on pattern matches
	const scores = new Map<string, number>();

	for (const lang of LANGUAGE_PATTERNS) {
		let score = 0;

		// Check patterns
		for (const pattern of lang.patterns) {
			const matches = code.match(pattern);

			if (matches) {
				score += matches.length * (lang.weight || 1);
			}
		}

		// Check keywords
		if (lang.keywords) {
			for (const keyword of lang.keywords) {
				const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
				const matches = code.match(keywordRegex);

				if (matches) {
					score += matches.length * 0.5;
				}
			}
		}

		if (score > 0) {
			scores.set(lang.language, score);
		}
	}

	// Return language with highest score
	if (scores.size > 0) {
		const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
		return sorted[0][0];
	}

	return 'plaintext';
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf('.');
	if (lastDot === -1) return '';
	return fileName.substring(lastDot).toLowerCase();
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(fileName: string): string | null {
	const ext = getFileExtension(fileName);
	if (!ext) return null;

	for (const lang of LANGUAGE_PATTERNS) {
		if (lang.fileExtensions?.includes(ext)) {
			return lang.language;
		}
	}

	// Additional common mappings
	const extensionMap: Record<string, string> = {
		'.txt': 'plaintext',
		'.log': 'plaintext',
		'.xml': 'xml',
		'.jsx': 'javascript',
		'.tsx': 'typescript',
		'.vue': 'vue',
		'.svelte': 'svelte',
	};

	return extensionMap[ext] || null;
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: string): string {
	const displayNames: Record<string, string> = {
		javascript: 'JavaScript',
		typescript: 'TypeScript',
		python: 'Python',
		java: 'Java',
		csharp: 'C#',
		cpp: 'C++',
		go: 'Go',
		rust: 'Rust',
		ruby: 'Ruby',
		php: 'PHP',
		swift: 'Swift',
		kotlin: 'Kotlin',
		sql: 'SQL',
		html: 'HTML',
		css: 'CSS',
		json: 'JSON',
		yaml: 'YAML',
		markdown: 'Markdown',
		shell: 'Shell',
		plaintext: 'Plain Text',
	};

	return displayNames[language] || language;
}

/**
 * Get supported languages list
 */
export function getSupportedLanguages(): string[] {
	return LANGUAGE_PATTERNS.map((lang) => lang.language);
}

/**
 * Validate if a language is supported
 */
export function isValidLanguage(language: string): boolean {
	return LANGUAGE_PATTERNS.some(
		(lang) => lang.language === language.toLowerCase()
	);
}
