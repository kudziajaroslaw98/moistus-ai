/**
 * Template Commands - Commands for inserting pre-defined templates
 */

import {
	Calendar,
	CheckSquare,
	FileText,
	GitBranch,
	List,
	Target,
} from 'lucide-react';
import type { Command } from '../command-types';
import { createTemplateAction, templateGenerators } from '../actions/action-factory';

/**
 * Template insertion command definitions
 * Uses / prefix for quick template insertion
 */
export const templateCommands: Command[] = [
	{
		id: 'template-meeting',
		trigger: '/meeting',
		label: 'Meeting Notes',
		description: 'Insert meeting notes template',
		icon: Calendar,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(templateGenerators.meetingNotes),
		keywords: ['meeting', 'notes', 'agenda', 'minutes'],
		examples: ['/meeting'],
		priority: 30,
	},
	{
		id: 'template-standup',
		trigger: '/standup',
		label: 'Daily Standup',
		description: 'Insert daily standup template',
		icon: Calendar,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(templateGenerators.dailyStandup),
		keywords: ['standup', 'daily', 'scrum', 'update'],
		examples: ['/standup'],
		priority: 31,
	},
	{
		id: 'template-checklist',
		trigger: '/checklist',
		label: 'Checklist',
		description: 'Insert a basic checklist template',
		icon: CheckSquare,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(`- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
- [ ] Task 4
- [ ] Task 5`),
		keywords: ['checklist', 'todo', 'tasks', 'list'],
		examples: ['/checklist'],
		priority: 32,
	},
	{
		id: 'template-project',
		trigger: '/project',
		label: 'Project Checklist',
		description: 'Insert project planning checklist',
		icon: Target,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(() => templateGenerators.projectChecklist('New Project')),
		keywords: ['project', 'planning', 'checklist', 'roadmap'],
		examples: ['/project'],
		priority: 33,
	},
	{
		id: 'template-bug',
		trigger: '/bug',
		label: 'Bug Report',
		description: 'Insert bug report template',
		icon: GitBranch,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(templateGenerators.bugReport),
		keywords: ['bug', 'issue', 'report', 'problem'],
		examples: ['/bug'],
		priority: 34,
	},
	{
		id: 'template-pros-cons',
		trigger: '/proscons',
		label: 'Pros & Cons',
		description: 'Insert pros and cons comparison template',
		icon: List,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(`## Pros & Cons

### Pros ✅
-
-
-

### Cons ❌
-
-
-

### Decision
`),
		keywords: ['pros', 'cons', 'comparison', 'decision', 'analysis'],
		examples: ['/proscons'],
		priority: 35,
	},
	{
		id: 'template-outline',
		trigger: '/outline',
		label: 'Document Outline',
		description: 'Insert document outline template',
		icon: FileText,
		category: 'template',
		triggerType: 'slash',
		action: createTemplateAction(`# Document Title

## 1. Introduction

## 2. Background

## 3. Main Content
### 3.1 Section One
### 3.2 Section Two
### 3.3 Section Three

## 4. Analysis

## 5. Recommendations

## 6. Conclusion

## References`),
		keywords: ['outline', 'document', 'structure', 'framework'],
		examples: ['/outline'],
		priority: 36,
	},
];

/**
 * Quick template snippets for common structures
 */
export const quickTemplates = {
	todo: '- [ ] ',
	bullet: '- ',
	numbered: '1. ',
	heading: '# ',
	subheading: '## ',
	divider: '---',
};