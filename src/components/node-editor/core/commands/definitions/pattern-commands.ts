/**
 * Pattern Commands - Commands for inserting patterns and metadata
 */

import {
	Calendar,
	Flag,
	Hash,
	Palette,
	Tag,
	User,
} from 'lucide-react';
import type { Command } from '../command-types';
import { createPatternInsertAction, patternGenerators } from '../actions/action-factory';

/**
 * Pattern insertion command definitions
 * Uses / prefix for quick pattern insertion
 */
export const patternCommands: Command[] = [
	{
		id: 'pattern-date',
		trigger: '/date',
		label: 'Date',
		description: 'Insert current date',
		icon: Calendar,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(patternGenerators.currentDate),
		keywords: ['date', 'today', 'calendar'],
		examples: ['/date', '^tomorrow', '^2024-12-25'],
		priority: 10,
	},
	{
		id: 'pattern-time',
		trigger: '/time',
		label: 'Time',
		description: 'Insert current time',
		icon: Calendar,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(patternGenerators.currentTime),
		keywords: ['time', 'now', 'clock'],
		examples: ['/time'],
		priority: 11,
	},
	{
		id: 'pattern-datetime',
		trigger: '/datetime',
		label: 'Date & Time',
		description: 'Insert current date and time',
		icon: Calendar,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(patternGenerators.currentDateTime),
		keywords: ['datetime', 'timestamp', 'now'],
		examples: ['/datetime'],
		priority: 12,
	},
	{
		id: 'pattern-priority',
		trigger: '/priority',
		label: 'Priority',
		description: 'Insert priority marker',
		icon: Flag,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(() => patternGenerators.priority('medium')),
		keywords: ['priority', 'important', 'urgent', 'level'],
		examples: ['/priority', '#high', '#medium', '#low'],
		priority: 13,
	},
	{
		id: 'pattern-tag',
		trigger: '/tag',
		label: 'Tag',
		description: 'Insert tag marker',
		icon: Tag,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(() => patternGenerators.tag('tag')),
		keywords: ['tag', 'label', 'category', 'hashtag'],
		examples: ['/tag', '[meeting]', '[important]'],
		priority: 14,
	},
	{
		id: 'pattern-assignee',
		trigger: '/assignee',
		label: 'Assignee',
		description: 'Insert assignee marker',
		icon: User,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(() => patternGenerators.assignee('user')),
		keywords: ['assignee', 'assign', 'user', 'person', 'owner'],
		examples: ['/assignee', '@john', '@team'],
		priority: 15,
	},
	{
		id: 'pattern-color',
		trigger: '/color',
		label: 'Color',
		description: 'Insert color marker',
		icon: Palette,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(() => patternGenerators.color('blue')),
		keywords: ['color', 'highlight', 'style', 'theme'],
		examples: ['/color', 'color:red', 'color:#ff0000'],
		priority: 16,
	},
	{
		id: 'pattern-size',
		trigger: '/size',
		label: 'Font Size',
		description: 'Insert font size marker',
		icon: Hash,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(() => patternGenerators.fontSize('16px')),
		keywords: ['size', 'font', 'text', 'scale'],
		examples: ['/size', 'sz:24px', 'sz:2rem'],
		priority: 17,
	},
	{
		id: 'pattern-align',
		trigger: '/align',
		label: 'Alignment',
		description: 'Insert alignment marker',
		icon: Hash,
		category: 'pattern',
		triggerType: 'slash',
		action: createPatternInsertAction(() => patternGenerators.alignment('center')),
		keywords: ['align', 'alignment', 'position', 'justify'],
		examples: ['/align', 'align:left', 'align:center', 'align:right'],
		priority: 18,
	},
];

/**
 * Quick pattern insertion helpers
 */
export const quickPatterns = {
	high: '#high',
	medium: '#medium',
	low: '#low',
	today: `^${new Date().toLocaleDateString()}`,
	tomorrow: `^tomorrow`,
	nextWeek: `^next week`,
};