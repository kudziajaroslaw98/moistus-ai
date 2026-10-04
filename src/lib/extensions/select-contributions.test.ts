import type { AppState } from '@/store/app-state';
import type { Contribution, ContributionContext } from '@/types/extensions';
import { Puzzle } from 'lucide-react';
import {
	matchesPaletteQuery,
	resolveContributionDescription,
	selectContributions,
	selectPaletteEntries,
} from './select-contributions';

const entry = (overrides: Partial<Contribution>): Contribution => ({
	id: 'entry',
	title: 'Entry',
	icon: Puzzle,
	owner: 'builtin',
	scopes: ['node', 'map'],
	placements: ['aiMenu', 'contextMenu', 'commandPalette'],
	run: jest.fn(),
	...overrides,
});

const ctx = (
	overrides: Partial<ContributionContext> = {}
): ContributionContext => ({
	getState: () => ({}) as AppState,
	scope: 'map',
	nodeId: null,
	canEdit: true,
	isMapReady: true,
	...overrides,
});

const ids = (list: Contribution[]) => list.map((c) => c.id);

describe('selectContributions', () => {
	it('filters by placement and scope', () => {
		const list = [
			entry({ id: 'palette-only', placements: ['commandPalette'] }),
			entry({ id: 'node-only', scopes: ['node'] }),
			entry({ id: 'both' }),
		];

		expect(ids(selectContributions(list, 'aiMenu', ctx()))).toEqual(['both']);
		expect(
			ids(
				selectContributions(
					list,
					'aiMenu',
					ctx({ scope: 'node', nodeId: 'n1' })
				)
			)
		).toEqual(['node-only', 'both']);
	});

	it('hides node-scoped entries without a target node', () => {
		expect(
			selectContributions([entry({})], 'aiMenu', ctx({ scope: 'node' }))
		).toEqual([]);
	});

	it('hides edit-only entries from read-only users', () => {
		const list = [
			entry({ id: 'edit', requiresEdit: true }),
			entry({ id: 'view' }),
		];

		expect(
			ids(selectContributions(list, 'aiMenu', ctx({ canEdit: false })))
		).toEqual(['view']);
	});

	it('respects when()', () => {
		const list = [entry({ id: 'ready', when: (c) => c.isMapReady })];

		expect(
			selectContributions(list, 'aiMenu', ctx({ isMapReady: false }))
		).toEqual([]);
		expect(ids(selectContributions(list, 'aiMenu', ctx()))).toEqual(['ready']);
	});
});

describe('resolveContributionDescription', () => {
	it('supports static and context-dependent descriptions', () => {
		expect(
			resolveContributionDescription(entry({ description: 'Fixed' }), ctx())
		).toBe('Fixed');
		expect(
			resolveContributionDescription(
				entry({ description: (c) => `Scope: ${c.scope}` }),
				ctx({ scope: 'node', nodeId: 'n1' })
			)
		).toBe('Scope: node');
	});
});

describe('selectPaletteEntries', () => {
	const createContext = (
		scope: ContributionContext['scope'],
		nodeId: string | null
	) => ctx({ scope, nodeId });

	it('lists each entry once, on the selected node when it supports node scope', () => {
		const list = [
			entry({ id: 'both' }),
			entry({ id: 'map-only', scopes: ['map'] }),
			entry({ id: 'node-only', scopes: ['node'] }),
			entry({ id: 'menu-only', placements: ['aiMenu'] }),
		];

		const entries = selectPaletteEntries(list, createContext, 'n1');

		expect(entries.map((e) => [e.contribution.id, e.ctx.scope])).toEqual([
			['both', 'node'],
			['map-only', 'map'],
			['node-only', 'node'],
		]);
	});

	it('falls back to map scope without a selected node', () => {
		const list = [
			entry({ id: 'both' }),
			entry({ id: 'node-only', scopes: ['node'] }),
		];

		const entries = selectPaletteEntries(list, createContext, null);

		expect(entries.map((e) => [e.contribution.id, e.ctx.scope])).toEqual([
			['both', 'map'],
		]);
	});
});

describe('matchesPaletteQuery', () => {
	const paletteEntry = {
		contribution: entry({
			title: 'Find similar',
			description: 'Find mergeable nodes',
			keywords: ['duplicates'],
		}),
		ctx: ctx(),
	};

	it('matches title, description and keywords case-insensitively', () => {
		expect(matchesPaletteQuery(paletteEntry, '')).toBe(true);
		expect(matchesPaletteQuery(paletteEntry, 'SIMILAR')).toBe(true);
		expect(matchesPaletteQuery(paletteEntry, 'mergeable')).toBe(true);
		expect(matchesPaletteQuery(paletteEntry, 'dupl')).toBe(true);
		expect(matchesPaletteQuery(paletteEntry, 'expand')).toBe(false);
	});

	it('requires every word to match', () => {
		expect(matchesPaletteQuery(paletteEntry, 'find nodes')).toBe(true);
		expect(matchesPaletteQuery(paletteEntry, 'find history')).toBe(false);
	});
});
