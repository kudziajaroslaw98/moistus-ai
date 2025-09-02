/**
 * CodeMirror 6 language definition for mind map patterns
 * Provides syntax highlighting for tags, priorities, colors, dates, and assignees
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

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

// Create the language support with highlighting
export function mindmapLang(): LanguageSupport {
  return new LanguageSupport(mindmapLanguage);
}

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