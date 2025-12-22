/**
 * Shared Node Content Components
 *
 * Pure rendering components used by both canvas nodes and preview system.
 * These components have NO dependencies on React Flow or Zustand stores.
 */

// Code
export { CodeContent, type CodeContentProps } from './code-content';
export {
	codeSyntaxTheme,
	getLanguageIcon,
	LANGUAGE_ICONS,
} from './code-syntax-theme';

// Markdown
export {
	MarkdownContent,
	type MarkdownContentProps,
} from './markdown-content';
