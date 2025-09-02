/**
 * Parser transformers and data processing utilities
 * Contains all data transformation logic extracted from the original parsers
 */

import { nanoid } from 'nanoid';
import type { PatternType } from '../utils';
import type { 
  ParsedTaskData, 
  ParsedNoteData, 
  ParsedTextData, 
  ParsedAnnotationData, 
  ParsedQuestionData,
  ParsedCodeData,
  ParsedImageData,
  ParsedResourceData
} from '../types';
import {
  EMBEDDED_PATTERNS,
  TASK_PATTERNS,
  TEXT_PATTERNS,
  CODE_PATTERNS,
  LANGUAGE_PATTERNS,
  IMAGE_PATTERNS,
  RESOURCE_PATTERNS,
  QUESTION_PATTERNS,
  NAMED_COLORS,
  DATE_PATTERNS,
  PRIORITY_DISPLAY_MAP,
  FILE_TYPE_MAP,
} from './patterns';

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Parse date strings including natural language dates
 * Supports: today, tomorrow, yesterday, weekday names, ISO dates
 */
export const parseDateString = (dateStr: string): Date | undefined => {
  const lowerDate = dateStr.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (lowerDate) {
    case 'today':
      return today;
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    default:
      // Try parsing weekday names
      const weekdayIndex = (DATE_PATTERNS.weekdays as readonly string[]).indexOf(lowerDate);

      if (weekdayIndex !== -1) {
        const targetDate = new Date(today);
        const currentDay = today.getDay();
        const daysUntilTarget = (weekdayIndex - currentDay + 7) % 7 || 7;
        targetDate.setDate(targetDate.getDate() + daysUntilTarget);
        return targetDate;
      }

      // Try parsing as a date
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? undefined : parsed;
  }
};

/**
 * Check if a string represents a valid date
 */
export const isValidDateString = (dateStr: string): boolean => {
  return parseDateString(dateStr) !== undefined;
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format color values for display
 * Converts named colors to hex and normalizes format
 */
export const formatColorForDisplay = (color: string): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    return color.toUpperCase();
  }
  
  // Handle RGB/RGBA colors
  if (color.startsWith('rgb')) {
    return color;
  }
  
  // Handle named colors
  const normalized = color.toLowerCase();
  if (NAMED_COLORS[normalized]) {
    return NAMED_COLORS[normalized];
  }
  
  return color;
};

/**
 * Format date for display with relative descriptions
 * Returns human-friendly date strings like "Today", "Tomorrow", "In 3 days"
 */
export const formatDateForDisplay = (date: Date, original: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  // For named dates like 'monday', 'friday', etc., keep original if it's a weekday name
  if ((DATE_PATTERNS.weekdays as readonly string[]).includes(original.toLowerCase())) {
    return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
  }
  
  // Default to formatted date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Format priority values for display with emoji indicators
 */
export const formatPriorityForDisplay = (priority: string): string => {
  const displayValue = PRIORITY_DISPLAY_MAP[priority.toLowerCase()];
  return displayValue || priority.charAt(0).toUpperCase() + priority.slice(1);
};

// ============================================================================
// EMBEDDED PATTERN PARSING
// ============================================================================

/**
 * Extract all embedded patterns from text
 * Parses @dates, #priority, [tags], +assignee, color:value patterns
 */
export const parseEmbeddedPatterns = (text: string): { 
  cleanText: string; 
  patterns: Array<{type: PatternType, value: string, display: string, position: number}> 
} => {
  if (!text || typeof text !== 'string') {
    return { cleanText: text || '', patterns: [] };
  }
  
  const patterns: Array<{type: PatternType, value: string, display: string, position: number}> = [];
  let cleanText = text;
  
  // Extract all patterns with their positions
  const allMatches: Array<{
    match: RegExpExecArray, 
    type: PatternType, 
    extractFn: (match: RegExpExecArray) => {value: string, display: string} | null
  }> = [];
  
  // Process each pattern type
  Object.entries(EMBEDDED_PATTERNS).forEach(([key, pattern]) => {
    pattern.regex.lastIndex = 0; // Reset regex state
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const extractFn = createPatternExtractor(pattern.type, key);
      allMatches.push({
        match,
        type: pattern.type,
        extractFn
      });
      // Prevent infinite loop
      if (pattern.regex.lastIndex === match.index) {
        pattern.regex.lastIndex++;
      }
    }
  });
  
  // Sort matches by position (descending) to replace from end to start
  allMatches.sort((a, b) => b.match.index - a.match.index);
  
  // Extract patterns and clean text
  for (const { match, type, extractFn } of allMatches) {
    const extracted = extractFn(match);
    if (extracted) {
      patterns.unshift({
        type,
        value: extracted.value,
        display: extracted.display,
        position: match.index
      });
      
      // Remove the pattern from clean text
      cleanText = cleanText.slice(0, match.index) + cleanText.slice(match.index + match[0].length);
    }
  }
  
  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return { cleanText, patterns };
};

/**
 * Create pattern extractor function for a specific pattern type
 */
const createPatternExtractor = (type: PatternType, key: string) => {
  return (match: RegExpExecArray): {value: string, display: string} | null => {
    switch (type) {
      case 'date': {
        const dateStr = match[1];
        const parsedDate = parseDateString(dateStr);
        return {
          value: dateStr,
          display: parsedDate ? formatDateForDisplay(parsedDate, dateStr) : dateStr
        };
      }
      case 'priority': {
        const priority = match[1].toLowerCase();
        return {
          value: priority,
          display: formatPriorityForDisplay(priority)
        };
      }
      case 'color': {
        const colorValue = match[1];
        return {
          value: colorValue,
          display: formatColorForDisplay(colorValue)
        };
      }
      case 'tag': {
        const tagContent = match[1].trim();
        
        // Exclude checkbox patterns from being treated as tags
        if (key === 'tag' && EMBEDDED_PATTERNS.tag.exclusionPattern?.test(tagContent)) {
          return null; // Skip this match - it's a checkbox, not a tag
        }
        
        return {
          value: tagContent,
          display: tagContent
        };
      }
      case 'assignee': {
        const assignee = match[1];
        return {
          value: assignee,
          display: assignee
        };
      }
      default:
        return null;
    }
  };
};

/**
 * Extract only patterns of a specific type from text
 */
export const extractPatternsByType = (text: string, patternType: PatternType): Array<{value: string, display: string, position: number}> => {
  const result = parseEmbeddedPatterns(text);
  return result.patterns.filter(pattern => pattern.type === patternType);
};

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extract metadata from patterns and apply to task data
 */
export const extractTaskMetadataFromPatterns = (patterns: Array<{type: string, value: string}>, result: ParsedTaskData): void => {
  for (const pattern of patterns) {
    switch (pattern.type) {
      case 'date':
        if (!result.dueDate) {
          result.dueDate = parseDateString(pattern.value);
        }
        break;
      case 'priority':
        if (!result.priority && ['low', 'medium', 'high'].includes(pattern.value)) {
          result.priority = pattern.value as 'low' | 'medium' | 'high';
        }
        break;
      case 'assignee':
        if (!result.assignee) {
          result.assignee = pattern.value;
        }
        break;
      case 'tag':
        if (!result.tags) {
          result.tags = [];
        }
        // Handle comma-separated tags in the value
        if (pattern.value.includes(',')) {
          const splitTags = pattern.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
          splitTags.forEach(tag => {
            if (!result.tags!.includes(tag)) {
              result.tags!.push(tag);
            }
          });
        } else {
          if (!result.tags.includes(pattern.value)) {
            result.tags.push(pattern.value);
          }
        }
        break;
    }
  }
};

/**
 * Extract tag metadata from patterns
 */
export const extractTagsFromPatterns = (patterns: Array<{type: string, value: string}>): string[] => {
  const tags: string[] = [];
  
  for (const pattern of patterns) {
    if (pattern.type === 'tag') {
      if (pattern.value.includes(',')) {
        const splitTags = pattern.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
        splitTags.forEach(tag => {
          if (!tags.includes(tag)) {
            tags.push(tag);
          }
        });
      } else {
        if (!tags.includes(pattern.value)) {
          tags.push(pattern.value);
        }
      }
    }
  }
  
  return tags;
};

/**
 * Extract priority from patterns
 */
export const extractPriorityFromPatterns = (patterns: Array<{type: string, value: string}>): 'low' | 'medium' | 'high' | undefined => {
  for (const pattern of patterns) {
    if (pattern.type === 'priority' && ['low', 'medium', 'high'].includes(pattern.value)) {
      return pattern.value as 'low' | 'medium' | 'high';
    }
  }
  return undefined;
};

// ============================================================================
// FILE AND MEDIA UTILITIES
// ============================================================================

/**
 * Extract file extension from URL or filename
 */
export const getFileExtension = (url: string): string => {
  const match = url.match(RESOURCE_PATTERNS.fileExtension);
  return match ? match[1].toLowerCase() : '';
};

/**
 * Detect content type from URL
 */
export const detectContentType = (url: string): 'image' | 'video' | 'document' | 'code' | 'other' => {
  const extension = getFileExtension(url);
  
  if ((FILE_TYPE_MAP.image as readonly string[]).includes(extension)) {
    return 'image';
  }
  
  if ((FILE_TYPE_MAP.video as readonly string[]).includes(extension)) {
    return 'video';
  }
  
  if ((FILE_TYPE_MAP.document as readonly string[]).includes(extension)) {
    return 'document';
  }
  
  if ((FILE_TYPE_MAP.code as readonly string[]).includes(extension)) {
    return 'code';
  }
  
  return 'other';
};

/**
 * Detect programming language from code content
 */
export const detectLanguageFromContent = (content: string): string => {
  for (const [pattern, language] of LANGUAGE_PATTERNS) {
    if (pattern.test(content)) {
      return language;
    }
  }
  return 'plaintext';
};

// ============================================================================
// TASK PARSING UTILITIES
// ============================================================================

/**
 * Parse a single checkbox line into a task
 */
export const parseCheckboxLine = (line: string): {
  id: string;
  text: string;
  isComplete: boolean;
  patterns?: any[];
} | null => {
  const trimmedLine = line.trim();
  const match = TASK_PATTERNS.checkbox.exec(trimmedLine);
  
  if (match) {
    const checkboxChar = match[1] || '';
    const isComplete = TASK_PATTERNS.isComplete.test(checkboxChar);
    const taskText = match[2].trim();
    
    // Parse patterns from the task text for node-level aggregation
    const parsedPatterns = parseEmbeddedPatterns(taskText);
    
    return {
      id: nanoid(),
      text: parsedPatterns.cleanText || taskText,
      isComplete,
      // Store patterns temporarily for aggregation
      _tempPatterns: parsedPatterns.patterns,
    } as any;
  }
  
  // Fallback for malformed lines
  return {
    id: nanoid(),
    text: trimmedLine,
    isComplete: false,
    patterns: [],
  };
};

/**
 * Count the number of tasks in input
 */
export const countTasks = (input: string): number => {
  if (!input || typeof input !== 'string') return 1;
  
  const lines = input.split('\n');
  const checkboxLines = lines.filter(line => {
    const trimmedLine = line.trim();
    return TASK_PATTERNS.multipleCheckbox.test(trimmedLine);
  });
  
  return Math.max(1, checkboxLines.length);
};

// ============================================================================
// TEXT PROCESSING UTILITIES
// ============================================================================

/**
 * Process text formatting (bold, italic)
 */
export const processTextFormatting = (content: string): string => {
  let processed = content;
  
  // Process bold formatting
  processed = processed.replace(TEXT_PATTERNS.bold, '<strong>$1</strong>');
  
  // Process italic formatting
  processed = processed.replace(TEXT_PATTERNS.italic, (match, group1, group2) => {
    const text = group1 || group2;
    return `<em>${text}</em>`;
  });
  
  return processed;
};

/**
 * Parse Q&A structure from text
 */
export const parseQuestionStructure = (input: string): { questionText: string, answerText: string } => {
  const lines = input.split('\n');
  let questionText = '';
  let answerText = '';
  let isAnswerSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (QUESTION_PATTERNS.answerStart.test(trimmedLine)) {
      isAnswerSection = true;
      answerText += trimmedLine.replace(QUESTION_PATTERNS.answerStart, '').trim() + ' ';
    } else if (isAnswerSection) {
      answerText += trimmedLine + ' ';
    } else {
      questionText += trimmedLine + ' ';
    }
  }

  return {
    questionText: questionText.trim(),
    answerText: answerText.trim()
  };
};

// ============================================================================
// DEFAULT CREATORS
// ============================================================================

/**
 * Create a default task when input is invalid
 */
export const createDefaultTask = (): ParsedTaskData => ({
  tasks: [{
    id: nanoid(),
    text: 'New task',
    isComplete: false,
    patterns: [],
  }],
});

/**
 * Create default parsed data for various node types
 */
export const createDefaultParsedData = {
  note: (): ParsedNoteData => ({ content: '' }),
  task: createDefaultTask,
  text: (): ParsedTextData => ({ content: '', metadata: {} }),
  annotation: (): ParsedAnnotationData => ({ text: '' }),
  question: (): ParsedQuestionData => ({ question: 'New question', answer: '' }),
  code: (): ParsedCodeData => ({ language: 'plaintext', code: '' }),
  image: (): ParsedImageData => ({ url: '' }),
  resource: (): ParsedResourceData => ({ url: '', type: 'link' }),
};