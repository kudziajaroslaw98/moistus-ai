// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// ============================================
// Global Mocks for Component Testing
// ============================================

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}))

// Mock IntersectionObserver (for lazy loading, visibility detection)
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
	root: null,
	rootMargin: '',
	thresholds: [],
}))

// Mock matchMedia (for responsive/media query testing)
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
		forward: jest.fn(),
		refresh: jest.fn(),
		prefetch: jest.fn(),
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({}),
}))

// Mock motion/react (Framer Motion) - prevent animation issues in tests
jest.mock('motion/react', () => {
	const React = require('react')
	const createMotionComponent = (tag) =>
		React.forwardRef((props, ref) => {
			const { children, ...rest } = props
			// Filter out motion-specific props
			const filteredProps = Object.fromEntries(
				Object.entries(rest).filter(
					([key]) =>
						!key.startsWith('while') &&
						!key.startsWith('animate') &&
						!key.startsWith('initial') &&
						!key.startsWith('exit') &&
						!key.startsWith('transition') &&
						!key.startsWith('variants') &&
						key !== 'layout' &&
						key !== 'layoutId'
				)
			)
			return React.createElement(tag, { ...filteredProps, ref }, children)
		})

	return {
		motion: {
			div: createMotionComponent('div'),
			span: createMotionComponent('span'),
			button: createMotionComponent('button'),
			p: createMotionComponent('p'),
			ul: createMotionComponent('ul'),
			li: createMotionComponent('li'),
			a: createMotionComponent('a'),
			form: createMotionComponent('form'),
			input: createMotionComponent('input'),
			section: createMotionComponent('section'),
			article: createMotionComponent('article'),
			header: createMotionComponent('header'),
			footer: createMotionComponent('footer'),
			nav: createMotionComponent('nav'),
			aside: createMotionComponent('aside'),
			main: createMotionComponent('main'),
		},
		AnimatePresence: ({ children }) => children,
		useReducedMotion: () => false,
		useInView: () => true,
		useScroll: () => ({ scrollY: { get: () => 0 }, scrollX: { get: () => 0 } }),
		useSpring: (value) => value,
		useTransform: (value) => value,
		useMotionValue: (initial) => ({ get: () => initial, set: jest.fn() }),
		useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
	}
})

// ============================================
// Console Configuration
// ============================================

// Suppress noisy console output during tests (uncomment specific levels as needed)
global.console = {
	...console,
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
}