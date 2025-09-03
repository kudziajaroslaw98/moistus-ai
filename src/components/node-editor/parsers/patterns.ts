/**
 * Parser patterns and regex rules
 * Centralized pattern definitions for all parser functionality
 */

import type { PatternType } from '../utils';

// ============================================================================
// CORE PATTERN DEFINITIONS
// ============================================================================

/**
 * Pattern matchers for embedded content parsing
 * Used across all parsers for consistent pattern detection
 */
export const EMBEDDED_PATTERNS = {
  // Date patterns (@date) - must come first to avoid conflicts
  date: {
    regex: /@([^@\s#\[\]+]+)/g,
    type: 'date' as PatternType,
  },
  
  // Priority patterns (#priority)
  priority: {
    regex: /#([^#\s@\[\]+:]+)/g,
    type: 'priority' as PatternType,
  },
  
  // Color patterns (color:value) - must be before general text patterns
  color: {
    regex: /color:([^\s@\[\]]+)/g,
    type: 'color' as PatternType,
  },
  
  // Tag patterns ([tag]) - Enhanced to handle comma-separated tags, but exclude checkbox patterns
  tag: {
    regex: /\[([^\[\]@#+:]+)\]/g,
    type: 'tag' as PatternType,
    // Exclude checkbox patterns (empty, x, X, semicolon, comma, or just whitespace)
    exclusionPattern: /^[xX;,\s]*$/,
  },
  
  // Assignee patterns (+assignee)
  assignee: {
    regex: /\+([^+\s@#\[\]:]+)/g,
    type: 'assignee' as PatternType,
  },
} as const;

// ============================================================================
// NODE-SPECIFIC PATTERNS
// ============================================================================

/**
 * Task parsing patterns
 */
export const TASK_PATTERNS = {
  // Checkbox patterns for markdown tasks
  checkbox: /^\s*(?:[-*]\s*)?\[([xX;,\s]*)\]\s*(.*)$/,
  
  // Multiple checkbox detection
  multipleCheckbox: /^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/,
  
  // Completion status detection
  isComplete: /[xX;,]/,
} as const;

/**
 * Note parsing patterns
 */
export const NOTE_PATTERNS = {
  priority: /#(low|medium|high)/i,
  tags: /\[([\w,\s]+)\]/g,
} as const;

/**
 * Text formatting patterns
 */
export const TEXT_PATTERNS = {
  fontSize: /@(\d+)(px|rem|em)?/g,
  bold: /\*\*(.*?)\*\*/g,
  italic: /(?<!\*)\*([^*]+)\*(?!\*)|\b_([^_]+)_\b/g,
  alignment: /align:(left|center|right)/i,
  color: /color:([#\w-]+)/i,
} as const;

/**
 * Code parsing patterns
 */
export const CODE_PATTERNS = {
  codeBlock: /```(\w+)?\s*([\s\S]*?)```/,
  filePattern: /(\w+)\s+file:(\S+)/,
} as const;

/**
 * Language detection patterns for code
 */
export const LANGUAGE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(const|let|var|function|=>|async|await)\b/, 'javascript'],
  [/\b(interface|type|namespace|enum)\b/, 'typescript'],
  [/\b(def|import|from|class|if __name__)\b/, 'python'],
  [/\b(public|private|class|void|int|String)\b/, 'java'],
  [/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i, 'sql'],
  [/<[a-zA-Z]+.*?>.*?<\/[a-zA-Z]+>/, 'html'],
  [/\{[\s\S]*:\s*[\s\S]*\}/, 'json'],
];

/**
 * Image parsing patterns
 */
export const IMAGE_PATTERNS = {
  urlWithAlt: /^(.+?)\s+"([^"]+)"$/,
  urlWithCaption: /^(.+?)\s+caption:(.+)$/i,
} as const;

/**
 * Resource parsing patterns
 */
export const RESOURCE_PATTERNS = {
  urlWithTitle: /^(.+?)\s+"([^"]+)"$/,
  urlWithDescription: /^(.+?)\s+desc:(.+)$/i,
  
  // File type detection patterns
  document: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
  video: /youtube\.com|vimeo\.com|\.mp4|\.webm/i,
  
  // URL validation
  url: /^https?:\/\/|^www\./,
  
  // File extension extraction
  fileExtension: /\.([a-zA-Z0-9]+)(?:[?#]|$)/,
} as const;

/**
 * Question parsing patterns
 */
export const QUESTION_PATTERNS = {
  answerStart: /^(a:|answer:)/i,
} as const;

// ============================================================================
// NAMED COLOR MAPPING
// ============================================================================

/**
 * Named colors to hex conversion
 * Used for color formatting and display
 */
export const NAMED_COLORS: Record<string, string> = {
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  grey: '#808080'
} as const;

// ============================================================================
// DATE PARSING PATTERNS
// ============================================================================

/**
 * Date parsing utilities
 */
export const DATE_PATTERNS = {
  weekdays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
} as const;

// ============================================================================
// PRIORITY FORMATTING
// ============================================================================

/**
 * Priority display formatting
 */
export const PRIORITY_DISPLAY_MAP: Record<string, string> = {
  critical: '🔴 Critical',
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
  urgent: '⚡ Urgent',
  asap: '🚨 ASAP',
  blocked: '⛔ Blocked',
  waiting: '⏳ Waiting',
} as const;

// ============================================================================
// FILE TYPE CLASSIFICATION
// ============================================================================

/**
 * File extension to content type mapping
 */
export const FILE_TYPE_MAP = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  video: ['mp4', 'webm', 'mov', 'avi'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  code: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'],
} as const;

// ============================================================================
// PATTERN VALIDATION
// ============================================================================

/**
 * Check if a pattern type is valid
 */
export const isValidPatternType = (type: string): type is PatternType => {
  return ['date', 'priority', 'color', 'tag', 'assignee'].includes(type);
};

/**
 * Check if a string contains embedded patterns
 */
export const hasEmbeddedPatterns = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  return Object.values(EMBEDDED_PATTERNS).some(pattern => {
    pattern.regex.lastIndex = 0; // Reset regex state
    return pattern.regex.test(text);
  });
};

/**
 * Check if input contains checkbox syntax
 */
export const hasCheckboxSyntax = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  return TASK_PATTERNS.checkbox.test(input.trim());
};

/**
 * Check if input looks like a URL
 */
export const isValidUrl = (input: string): boolean => {
  try {
    new URL(input);
    return true;
  } catch {
    return RESOURCE_PATTERNS.url.test(input);
  }
};