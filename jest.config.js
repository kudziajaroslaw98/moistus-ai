import nextJest from 'next/jest';

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files
	dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
	// Add more setup options before each test is run
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

	// if using TypeScript with a baseUrl set to the root directory then you need the below for alias to work
	moduleDirectories: ['node_modules', '<rootDir>/'],

	// Module name mapping for absolute imports
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},

	// Test environment
	testEnvironment: 'jest-environment-jsdom',

	// Patterns for test files
	testMatch: [
		'<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
		'<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
	],

	// Coverage configuration
	collectCoverageFrom: [
		'src/**/*.{js,jsx,ts,tsx}',
		'!src/**/*.d.ts',
		'!src/pages/api/**',
		'!src/pages/_app.tsx',
		'!src/pages/_document.tsx',
	],

	// Transform configuration
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
	},

	// Module file extensions
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

	// Clear mocks automatically between every test
	clearMocks: true,

	// Restore mocks automatically between every test
	restoreMocks: true,

	// Transform ignore patterns
	transformIgnorePatterns: ['node_modules/'],

	// Verbose output for debugging
	verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
