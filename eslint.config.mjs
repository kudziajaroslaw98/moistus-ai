import { FlatCompat } from '@eslint/eslintrc';
import stylistic from '@stylistic/eslint-plugin';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript'),
	{
		ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'globals.css'],
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	stylistic.configs['disable-legacy'],
	{
		files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'@stylistic/jsx-newline': ['error', { prevent: false }],
			'@stylistic/lines-between-class-members': ['error', 'always'],
			'@stylistic/rest-spread-spacing': ['error', 'never'],
			'@stylistic/jsx-first-prop-new-line': ['error', 'multiline'],
			'@stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
			'@stylistic/jsx-sort-props': [
				'error',
				{
					noSortAlphabetically: true,
					shorthandFirst: true,
					multiline: 'last',
					ignoreCase: true,
				},
			],
		},
	},
];

export default eslintConfig;
