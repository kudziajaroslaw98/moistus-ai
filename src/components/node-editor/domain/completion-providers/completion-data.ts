/**
 * Completion data and utility functions for the universal completion system
 * Provides pattern detection, completion data, and fuzzy search functionality
 */

import { 
    PatternType, 
    PatternContext, 
    CompletionItem, 
    ScoredCompletionItem,
    PATTERN_REGISTRY, 
    DEFAULT_FUZZY_SEARCH_CONFIG,
    PartialDatePattern,
    DatePatternSubtype 
} from "../../utils/completion-types"

// Static completion data for each pattern type
const DATE_COMPLETIONS: CompletionItem[] = [
    { value: 'today', label: '@today', description: 'Today\'s date', category: 'Quick' },
    { value: 'tomorrow', label: '@tomorrow', description: 'Tomorrow\'s date', category: 'Quick' },
    { value: 'yesterday', label: '@yesterday', description: 'Yesterday\'s date', category: 'Quick' },
    { value: 'monday', label: '@monday', description: 'Next Monday', category: 'Weekdays' },
    { value: 'tuesday', label: '@tuesday', description: 'Next Tuesday', category: 'Weekdays' },
    { value: 'wednesday', label: '@wednesday', description: 'Next Wednesday', category: 'Weekdays' },
    { value: 'thursday', label: '@thursday', description: 'Next Thursday', category: 'Weekdays' },
    { value: 'friday', label: '@friday', description: 'Next Friday', category: 'Weekdays' },
    { value: 'saturday', label: '@saturday', description: 'Next Saturday', category: 'Weekdays' },
    { value: 'sunday', label: '@sunday', description: 'Next Sunday', category: 'Weekdays' },
    { value: 'next week', label: '@next week', description: 'Next week', category: 'Relative' },
    { value: 'next month', label: '@next month', description: 'Next month', category: 'Relative' },
    { value: 'end of week', label: '@end of week', description: 'End of this week', category: 'Relative' },
    { value: 'end of month', label: '@end of month', description: 'End of this month', category: 'Relative' },
]

const PRIORITY_COMPLETIONS: CompletionItem[] = [
    { value: 'critical', label: '#critical', description: 'Critical priority', category: 'Priority' },
    { value: 'high', label: '#high', description: 'High priority', category: 'Priority' },
    { value: 'medium', label: '#medium', description: 'Medium priority', category: 'Priority' },
    { value: 'low', label: '#low', description: 'Low priority', category: 'Priority' },
    { value: 'urgent', label: '#urgent', description: 'Urgent status', category: 'Status' },
    { value: 'blocked', label: '#blocked', description: 'Blocked status', category: 'Status' },
    { value: 'waiting', label: '#waiting', description: 'Waiting status', category: 'Status' },
]

const COLOR_COMPLETIONS: CompletionItem[] = [
    { value: '#ff4444', label: 'red', description: 'Red color', category: 'Basic' },
    { value: '#44ff44', label: 'green', description: 'Green color', category: 'Basic' },
    { value: '#4444ff', label: 'blue', description: 'Blue color', category: 'Basic' },
    { value: '#ffff44', label: 'yellow', description: 'Yellow color', category: 'Basic' },
    { value: '#ff44ff', label: 'magenta', description: 'Magenta color', category: 'Basic' },
    { value: '#44ffff', label: 'cyan', description: 'Cyan color', category: 'Basic' },
    { value: '#ffa500', label: 'orange', description: 'Orange color', category: 'Basic' },
    { value: '#800080', label: 'purple', description: 'Purple color', category: 'Basic' },
    { value: '#333333', label: 'dark gray', description: 'Dark gray', category: 'Grays' },
    { value: '#666666', label: 'gray', description: 'Gray color', category: 'Grays' },
    { value: '#999999', label: 'light gray', description: 'Light gray', category: 'Grays' },
    { value: '#cccccc', label: 'silver', description: 'Silver color', category: 'Grays' },
]

const TAG_COMPLETIONS: CompletionItem[] = [
    { value: 'todo', label: '[todo]', description: 'To-do item', category: 'Status' },
    { value: 'done', label: '[done]', description: 'Completed item', category: 'Status' },
    { value: 'urgent', label: '[urgent]', description: 'Urgent item', category: 'Status' },
    { value: 'meeting', label: '[meeting]', description: 'Meeting related', category: 'Work' },
    { value: 'project', label: '[project]', description: 'Project related', category: 'Work' },
    { value: 'task', label: '[task]', description: 'Task item', category: 'Work' },
    { value: 'idea', label: '[idea]', description: 'Idea or concept', category: 'Content' },
    { value: 'note', label: '[note]', description: 'General note', category: 'Content' },
    { value: 'question', label: '[question]', description: 'Question or inquiry', category: 'Content' },
    { value: 'personal', label: '[personal]', description: 'Personal item', category: 'Personal' },
    { value: 'health', label: '[health]', description: 'Health related', category: 'Personal' },
    { value: 'family', label: '[family]', description: 'Family related', category: 'Personal' },
    { value: 'bug', label: '[bug]', description: 'Bug report', category: 'Tech' },
    { value: 'feature', label: '[feature]', description: 'Feature request', category: 'Tech' },
    { value: 'testing', label: '[testing]', description: 'Testing related', category: 'Tech' },
]

const ASSIGNEE_COMPLETIONS: CompletionItem[] = [
    { value: 'me', label: '+me', description: 'Assigned to me', category: 'Special' },
    { value: 'team', label: '+team', description: 'Assigned to team', category: 'Special' },
    { value: 'unassigned', label: '+unassigned', description: 'No assignee', category: 'Special' },
    { value: 'manager', label: '+manager', description: 'Team manager', category: 'Roles' },
    { value: 'developer', label: '+developer', description: 'Developer', category: 'Roles' },
    { value: 'designer', label: '+designer', description: 'Designer', category: 'Roles' },
    { value: 'frontend', label: '+frontend', description: 'Frontend team', category: 'Teams' },
    { value: 'backend', label: '+backend', description: 'Backend team', category: 'Teams' },
    { value: 'devops', label: '+devops', description: 'DevOps team', category: 'Teams' },
]

// Pattern completion data registry
const COMPLETION_DATA: Record<PatternType, CompletionItem[]> = {
    date: DATE_COMPLETIONS,
    priority: PRIORITY_COMPLETIONS,
    color: COLOR_COMPLETIONS,
    tag: TAG_COMPLETIONS,
    assignee: ASSIGNEE_COMPLETIONS,
}

/**
 * Detect pattern context from text input
 * Enhanced to handle multi-pattern scenarios and partial matches
 */
export const detectPatternContext = (textBefore: string): PatternContext | null => {
    // Try each pattern type starting from the end of the text (cursor position)
    // This ensures we get the pattern closest to the cursor for multi-pattern support
    for (const [patternType, config] of Object.entries(PATTERN_REGISTRY)) {
        const match = textBefore.match(config.regex)
        if (match) {
            const fullMatch = match[0]
            const query = match[1] || ''
            const matchStart = textBefore.length - fullMatch.length
            const matchEnd = textBefore.length

            // Enhanced date pattern detection with partial date support
            if (patternType === 'date') {
                const dateSubtype = detectDateSubtype(query)
                const partialDate = dateSubtype === 'partial-date' ? parsePartialDate(query) : undefined

                return {
                    type: patternType as PatternType,
                    pattern: fullMatch,
                    query,
                    matchStart,
                    matchEnd,
                    fullMatch,
                    dateSubtype,
                    partialDate
                }
            }

            return {
                type: patternType as PatternType,
                pattern: fullMatch,
                query,
                matchStart,
                matchEnd,
                fullMatch
            }
        }
    }

    return null
}

/**
 * Detect date pattern subtype for enhanced completion
 */
const detectDateSubtype = (query: string): DatePatternSubtype => {
    // Check if it's a partial date pattern like "2025", "2025-01", "2025-01-1"
    if (/^\d{4}(-\d{1,2}(-\d{1,2})?)?$/.test(query)) {
        return 'partial-date'
    }
    
    // Check if it's a full date pattern
    if (/^\d{4}-\d{2}-\d{2}$/.test(query)) {
        return 'full-date'
    }
    
    // Default to word-based pattern
    return 'word'
}

/**
 * Parse partial date for validation and completion
 */
const parsePartialDate = (query: string): PartialDatePattern => {
    const parts = query.split('-')
    const year = parts[0]
    const month = parts[1] || ''
    const partialDay = parts[2] || ''
    
    const isValidYear = /^\d{4}$/.test(year) && parseInt(year) >= 1900 && parseInt(year) <= 2100
    const isValidMonth = !month || (/^\d{1,2}$/.test(month) && parseInt(month) >= 1 && parseInt(month) <= 12)
    const monthNum = parseInt(month) || 1
    const daysInMonth = getDaysInMonth(parseInt(year), monthNum)
    const isValidDay = !partialDay || (/^\d{1,2}$/.test(partialDay) && parseInt(partialDay) >= 1 && parseInt(partialDay) <= daysInMonth)
    
    return {
        year,
        month,
        partialDay,
        isComplete: parts.length === 3 && partialDay.length === 2,
        isValid: isValidYear && isValidMonth && isValidDay,
        daysInMonth
    }
}

/**
 * Get number of days in a given month/year
 */
const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate()
}

/**
 * Get completion items for a specific pattern type
 */
export const getCompletionItemsForPattern = (
    patternType: PatternType, 
    context?: PatternContext
): CompletionItem[] => {
    const baseItems = COMPLETION_DATA[patternType] || []
    
    // For date patterns with partial dates, add dynamic date completions
    if (patternType === 'date' && context?.partialDate) {
        const dynamicItems = getDynamicDateCompletions(context.partialDate)
        return [...dynamicItems, ...baseItems]
    }
    
    return baseItems
}

/**
 * Generate dynamic date completions for partial dates
 */
const getDynamicDateCompletions = (partialDate: PartialDatePattern): CompletionItem[] => {
    const items: CompletionItem[] = []
    
    if (!partialDate.isValid) {
        return items
    }
    
    const year = parseInt(partialDate.year)
    const month = parseInt(partialDate.month) || 1
    
    // If we have year and month but incomplete day, suggest days
    if (partialDate.month && partialDate.partialDay && partialDate.daysInMonth) {
        const partialDayNum = parseInt(partialDate.partialDay)
        const daysToShow = Math.min(10, partialDate.daysInMonth - partialDayNum + 1)
        
        for (let i = 0; i < daysToShow; i++) {
            const day = partialDayNum + i
            if (day <= partialDate.daysInMonth) {
                const dateStr = `${partialDate.year}-${partialDate.month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                items.push({
                    value: dateStr,
                    label: `@${dateStr}`,
                    description: formatDateDescription(year, month, day),
                    category: 'Generated'
                })
            }
        }
    }
    // If we have year but incomplete month, suggest months
    else if (partialDate.year && !partialDate.month) {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        monthNames.forEach((monthName, index) => {
            const monthNum = (index + 1).toString().padStart(2, '0')
            const dateStr = `${partialDate.year}-${monthNum}`
            items.push({
                value: dateStr,
                label: `@${dateStr}`,
                description: `${monthName} ${partialDate.year}`,
                category: 'Generated'
            })
        })
    }
    
    return items
}

/**
 * Format date description for display
 */
const formatDateDescription = (year: number, month: number, day: number): string => {
    const date = new Date(year, month - 1, day)
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    return `${dayNames[date.getDay()]}, ${monthNames[month - 1]} ${day}, ${year}`
}

/**
 * Enhanced fuzzy search with pattern-specific scoring
 */
export const fuzzySearchWithPatternScoring = (
    query: string,
    items: CompletionItem[],
    patternType: PatternType,
    limit: number = 15,
    context?: PatternContext
): ScoredCompletionItem[] => {
    if (!query.trim()) {
        return items.slice(0, limit).map(item => ({ ...item, score: 1, matchType: 'exact' as const }))
    }

    const lowerQuery = query.toLowerCase()
    const scoredItems: ScoredCompletionItem[] = []

    for (const item of items) {
        const lowerValue = item.value.toLowerCase()
        const lowerLabel = item.label.toLowerCase()
        
        let score = 0
        let matchType: ScoredCompletionItem['matchType'] = 'fuzzy'
        let matchIndices: number[] = []

        // Exact match (highest priority)
        if (lowerValue === lowerQuery || lowerLabel === lowerQuery) {
            score = DEFAULT_FUZZY_SEARCH_CONFIG.exactMatchScore
            matchType = 'exact'
            matchIndices = Array.from({ length: query.length }, (_, i) => i)
        }
        // Starts with match
        else if (lowerValue.startsWith(lowerQuery) || lowerLabel.startsWith(lowerQuery)) {
            score = DEFAULT_FUZZY_SEARCH_CONFIG.startsWithScore
            matchType = 'starts-with'
            matchIndices = Array.from({ length: query.length }, (_, i) => i)
        }
        // Contains match
        else if (lowerValue.includes(lowerQuery) || lowerLabel.includes(lowerQuery)) {
            score = DEFAULT_FUZZY_SEARCH_CONFIG.containsScore
            matchType = 'contains'
            const startIndex = lowerValue.includes(lowerQuery) 
                ? lowerValue.indexOf(lowerQuery)
                : lowerLabel.indexOf(lowerQuery)
            matchIndices = Array.from({ length: query.length }, (_, i) => startIndex + i)
        }
        // Fuzzy match
        else {
            const fuzzyResult = calculateFuzzyMatch(lowerQuery, lowerValue)
            if (fuzzyResult.score > 0) {
                score = fuzzyResult.score * DEFAULT_FUZZY_SEARCH_CONFIG.fuzzyMatchScore
                matchType = 'fuzzy'
                matchIndices = fuzzyResult.matchIndices
            }
        }

        if (score > 0) {
            // Apply category boosts
            if (item.category && DEFAULT_FUZZY_SEARCH_CONFIG.categoryBoosts[item.category]) {
                score += DEFAULT_FUZZY_SEARCH_CONFIG.categoryBoosts[item.category]
            }

            // Apply pattern-specific boosts
            const patternBoosts = DEFAULT_FUZZY_SEARCH_CONFIG.patternBoosts[patternType]
            if (patternBoosts && patternBoosts[item.value]) {
                score += patternBoosts[item.value]
            }

            scoredItems.push({
                ...item,
                score,
                matchType,
                matchIndices
            })
        }
    }

    // Sort by score descending and return limited results
    return scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
}

/**
 * Calculate fuzzy match score and indices
 */
const calculateFuzzyMatch = (query: string, value: string): { score: number; matchIndices: number[] } => {
    const queryChars = query.split('')
    const valueChars = value.split('')
    const matchIndices: number[] = []
    
    let queryIndex = 0
    let score = 0
    let consecutiveMatches = 0
    
    for (let valueIndex = 0; valueIndex < valueChars.length && queryIndex < queryChars.length; valueIndex++) {
        if (valueChars[valueIndex] === queryChars[queryIndex]) {
            matchIndices.push(valueIndex)
            queryIndex++
            consecutiveMatches++
            
            // Bonus for consecutive matches
            score += consecutiveMatches > 1 ? 2 : 1
        } else {
            consecutiveMatches = 0
        }
    }
    
    // Only count as a match if all query characters were found
    if (queryIndex === queryChars.length) {
        // Bonus for shorter strings (more relevant)
        const lengthBonus = Math.max(0, 50 - value.length)
        score += lengthBonus
        
        // Penalty for gaps between matches
        const totalGaps = matchIndices.length > 1 
            ? matchIndices[matchIndices.length - 1] - matchIndices[0] - matchIndices.length + 1
            : 0
        score = Math.max(1, score - totalGaps * 0.5)
        
        return { score, matchIndices }
    }
    
    return { score: 0, matchIndices: [] }
}