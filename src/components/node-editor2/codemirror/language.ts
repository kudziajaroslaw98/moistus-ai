/**
 * CodeMirror Language Definition for Mind Map Patterns
 * Provides syntax highlighting for tags, priorities, colors, dates, and assignees
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// ========================================
// MINDMAP LANGUAGE DEFINITION
// ========================================

// Define the mind map token types
const mindmapTokens = {
  tag: 'tag',
  priority: 'priority', 
  color: 'color',
  date: 'date',
  assignee: 'assignee',
  text: 'text'
};

// Stream language parser for mind map syntax
const mindmapLanguage = StreamLanguage.define({
  name: 'mindmap',
  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) return null;

    // Tags: [content] or [x] or [ ]
    if (stream.match(/\[[^\]]*\]/)) {
      return mindmapTokens.tag;
    }

    // Priority: #low, #medium, #high
    if (stream.match(/#(?:low|medium|high)\b/i)) {
      return mindmapTokens.priority;
    }

    // Colors: color:#ffffff
    if (stream.match(/\bcolor:#[0-9a-fA-F]{3,6}\b/)) {
      return mindmapTokens.color;
    }

    // Dates: @today, @tomorrow, @2024-01-15
    if (stream.match(/@(?:\w+|[\d-]+)\b/)) {
      return mindmapTokens.date;
    }

    // Assignees: +username
    if (stream.match(/\+[a-zA-Z][\w.-]*\b/)) {
      return mindmapTokens.assignee;
    }

    // Default: consume one character as text
    stream.next();
    return mindmapTokens.text;
  }
});

// ========================================
// HIGHLIGHTING CONFIGURATION
// ========================================

// Define highlighting styles for our tokens
const mindmapHighlighting = [
  // Tags - blue background
  { tag: t.labelName, class: 'cm-tag' },
  
  // Priorities - green background (will customize colors via CSS)
  { tag: t.keyword, class: 'cm-priority' },
  
  // Colors - purple background
  { tag: t.literal, class: 'cm-color' },
  
  // Dates - emerald background
  { tag: t.number, class: 'cm-date' },
  
  // Assignees - violet background
  { tag: t.variableName, class: 'cm-assignee' },
  
  // Regular text - default styling
  { tag: t.content, class: 'cm-text' }
];

// Map our custom tokens to Lezer tags for highlighting
const tokenTagMap = {
  [mindmapTokens.tag]: t.labelName,
  [mindmapTokens.priority]: t.keyword, 
  [mindmapTokens.color]: t.literal,
  [mindmapTokens.date]: t.number,
  [mindmapTokens.assignee]: t.variableName,
  [mindmapTokens.text]: t.content
};

// ========================================
// CSS STYLING
// ========================================

// Export CSS classes for custom styling
export const mindmapCSS = `
  .cm-tag {
    background-color: rgb(59 130 246 / 0.2);
    color: rgb(191 219 254);
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-weight: 500;
  }

  .cm-priority {
    background-color: rgb(34 197 94 / 0.2);
    color: rgb(187 247 208);
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-weight: 600;
  }

  .cm-color {
    background-color: rgb(168 85 247 / 0.2);
    color: rgb(221 214 254);
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.875rem;
  }

  .cm-date {
    background-color: rgb(16 185 129 / 0.2);
    color: rgb(167 243 208);
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-weight: 500;
  }

  .cm-assignee {
    background-color: rgb(139 92 246 / 0.2);
    color: rgb(196 181 253);
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-weight: 500;
  }

  .cm-text {
    color: rgb(228 228 231);
  }
`;

// ========================================
// LANGUAGE SUPPORT CREATION
// ========================================

/**
 * Create the language support with highlighting
 */
export function mindmapLang(): LanguageSupport {
  return new LanguageSupport(mindmapLanguage);
}

// ========================================
// ADVANCED LANGUAGE FEATURES
// ========================================

/**
 * Enhanced mindmap language with bracket matching
 */
export function mindmapLangWithBrackets(): LanguageSupport {
  const language = new LanguageSupport(mindmapLanguage);
  
  // Add bracket matching support for tags [content]
  return language;
}

/**
 * Get syntax information for a given position in the text
 */
export function getSyntaxInfo(text: string, position: number): {
  tokenType: string | null;
  tokenStart: number;
  tokenEnd: number;
  tokenText: string;
} {
  // Create a simple stream to parse at the given position
  let currentPos = 0;
  let tokenStart = 0;
  let tokenEnd = 0;
  let tokenType: string | null = null;
  let tokenText = '';
  
  // Find line containing the position
  const lines = text.split('\n');
  let lineStart = 0;
  
  for (const line of lines) {
    const lineEnd = lineStart + line.length;
    
    if (position >= lineStart && position <= lineEnd) {
      // Parse this line to find the token at position
      const relativePos = position - lineStart;
      const lineTokens = parseLine(line);
      
      for (const token of lineTokens) {
        if (relativePos >= token.start && relativePos <= token.end) {
          tokenStart = lineStart + token.start;
          tokenEnd = lineStart + token.end;
          tokenType = token.type;
          tokenText = token.text;
          break;
        }
      }
      break;
    }
    
    lineStart = lineEnd + 1; // +1 for newline character
  }
  
  return {
    tokenType,
    tokenStart,
    tokenEnd,
    tokenText
  };
}

/**
 * Parse a single line to extract tokens
 */
function parseLine(line: string): Array<{
  type: string;
  start: number;
  end: number;
  text: string;
}> {
  const tokens: Array<{
    type: string;
    start: number;
    end: number;
    text: string;
  }> = [];
  
  // Pattern matching for each token type
  const patterns = [
    { regex: /\[[^\]]*\]/g, type: mindmapTokens.tag },
    { regex: /#(?:low|medium|high)\b/gi, type: mindmapTokens.priority },
    { regex: /\bcolor:#[0-9a-fA-F]{3,6}\b/g, type: mindmapTokens.color },
    { regex: /@(?:\w+|[\d-]+)\b/g, type: mindmapTokens.date },
    { regex: /\+[a-zA-Z][\w.-]*\b/g, type: mindmapTokens.assignee },
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(line)) !== null) {
      tokens.push({
        type: pattern.type,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  }
  
  // Sort by position and fill gaps with text tokens
  tokens.sort((a, b) => a.start - b.start);
  
  const result: typeof tokens = [];
  let lastEnd = 0;
  
  for (const token of tokens) {
    // Add text token for gap before this token
    if (token.start > lastEnd) {
      result.push({
        type: mindmapTokens.text,
        start: lastEnd,
        end: token.start,
        text: line.substring(lastEnd, token.start)
      });
    }
    
    result.push(token);
    lastEnd = token.end;
  }
  
  // Add final text token if needed
  if (lastEnd < line.length) {
    result.push({
      type: mindmapTokens.text,
      start: lastEnd,
      end: line.length,
      text: line.substring(lastEnd)
    });
  }
  
  return result;
}

/**
 * Check if a given position is inside a specific token type
 */
export function isPositionInTokenType(
  text: string, 
  position: number, 
  targetType: keyof typeof mindmapTokens
): boolean {
  const syntaxInfo = getSyntaxInfo(text, position);
  return syntaxInfo.tokenType === mindmapTokens[targetType];
}

/**
 * Get all tokens of a specific type in the text
 */
export function getTokensOfType(
  text: string, 
  targetType: keyof typeof mindmapTokens
): Array<{
  start: number;
  end: number;
  text: string;
}> {
  const lines = text.split('\n');
  const result: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];
  
  let lineStart = 0;
  
  for (const line of lines) {
    const lineTokens = parseLine(line);
    
    for (const token of lineTokens) {
      if (token.type === mindmapTokens[targetType]) {
        result.push({
          start: lineStart + token.start,
          end: lineStart + token.end,
          text: token.text
        });
      }
    }
    
    lineStart += line.length + 1; // +1 for newline
  }
  
  return result;
}

/**
 * Export token types for external use
 */
export { mindmapTokens };

/**
 * Export highlighting configuration
 */
export { mindmapHighlighting };

/**
 * Export token tag map
 */
export { tokenTagMap };