import { render, screen } from '@testing-library/react'
import { MarkdownContent } from './markdown-content'

// Mock the theme
jest.mock('@/components/nodes/themes/glassmorphism-theme', () => ({
	GlassmorphismTheme: {
		text: {
			high: 'rgba(255, 255, 255, 0.87)',
			medium: 'rgba(255, 255, 255, 0.6)',
			disabled: 'rgba(255, 255, 255, 0.38)',
		},
		borders: {
			default: 'rgba(255, 255, 255, 0.1)',
			hover: 'rgba(255, 255, 255, 0.2)',
		},
		elevation: ['rgba(0, 0, 0, 0.2)'],
	},
}))

// Mock react-markdown to avoid ESM issues
jest.mock('react-markdown', () => {
	return function MockReactMarkdown({ children, components }: { children: string; components: Record<string, unknown> }) {
		// Simple parsing to test that component renders markdown elements
		const content = children || ''

		// Handle headings
		if (content.startsWith('# ')) {
			const C = (components?.h1 as React.ComponentType<{ children: string }>) || 'h1'
			return <C>{content.slice(2)}</C>
		}
		if (content.startsWith('## ')) {
			const C = (components?.h2 as React.ComponentType<{ children: string }>) || 'h2'
			return <C>{content.slice(3)}</C>
		}
		if (content.startsWith('### ')) {
			const C = (components?.h3 as React.ComponentType<{ children: string }>) || 'h3'
			return <C>{content.slice(4)}</C>
		}

		// Handle lists
		if (content.includes('- ')) {
			const items = content.split('\n').filter((line: string) => line.startsWith('- '))
			const Ul = (components?.ul as React.ComponentType<{ children: React.ReactNode }>) || 'ul'
			const Li = (components?.li as React.ComponentType<{ children: string }>) || 'li'
			return (
				<Ul>
					{items.map((item: string, i: number) => (
						<Li key={i}>{item.slice(2)}</Li>
					))}
				</Ul>
			)
		}

		// Handle inline code
		if (content.includes('`')) {
			const match = content.match(/`([^`]+)`/)
			if (match) {
				const Code = (components?.code as React.ComponentType<{ children: string }>) || 'code'
				const P = (components?.p as React.ComponentType<{ children: React.ReactNode }>) || 'p'
				const parts = content.split(/`[^`]+`/)
				return (
					<P>
						{parts[0]}
						<Code>{match[1]}</Code>
						{parts[1]}
					</P>
				)
			}
		}

		// Handle links
		if (content.includes('[') && content.includes('](')) {
			const match = content.match(/\[([^\]]+)\]\(([^)]+)\)/)
			if (match) {
				const A = (components?.a as React.ComponentType<{ children: string; href: string }>) || 'a'
				const P = (components?.p as React.ComponentType<{ children: React.ReactNode }>) || 'p'
				const parts = content.split(/\[[^\]]+\]\([^)]+\)/)
				return (
					<P>
						{parts[0]}
						<A href={match[2]}>{match[1]}</A>
						{parts[1]}
					</P>
				)
			}
		}

		// Handle blockquotes
		if (content.startsWith('> ')) {
			const Blockquote = (components?.blockquote as React.ComponentType<{ children: string }>) || 'blockquote'
			return <Blockquote>{content.slice(2)}</Blockquote>
		}

		// Handle bold
		if (content.includes('**')) {
			const match = content.match(/\*\*([^*]+)\*\*/)
			if (match) {
				const Strong = (components?.strong as React.ComponentType<{ children: string }>) || 'strong'
				const P = (components?.p as React.ComponentType<{ children: React.ReactNode }>) || 'p'
				const parts = content.split(/\*\*[^*]+\*\*/)
				return (
					<P>
						{parts[0]}
						<Strong>{match[1]}</Strong>
						{parts[1]}
					</P>
				)
			}
		}

		// Handle italic
		if (content.includes('*') && !content.includes('**')) {
			const match = content.match(/\*([^*]+)\*/)
			if (match) {
				const Em = (components?.em as React.ComponentType<{ children: string }>) || 'em'
				const P = (components?.p as React.ComponentType<{ children: React.ReactNode }>) || 'p'
				const parts = content.split(/\*[^*]+\*/)
				return (
					<P>
						{parts[0]}
						<Em>{match[1]}</Em>
						{parts[1]}
					</P>
				)
			}
		}

		// Default: wrap in paragraph
		const P = (components?.p as React.ComponentType<{ children: string }>) || 'p'
		return <P>{content}</P>
	}
})

describe('MarkdownContent', () => {
	describe('placeholder behavior', () => {
		it('shows default placeholder when content is null', () => {
			render(<MarkdownContent content={null} />)

			expect(screen.getByText('Add content...')).toBeInTheDocument()
		})

		it('shows default placeholder when content is undefined', () => {
			render(<MarkdownContent content={undefined} />)

			expect(screen.getByText('Add content...')).toBeInTheDocument()
		})

		it('shows default placeholder when content is empty string', () => {
			render(<MarkdownContent content="" />)

			expect(screen.getByText('Add content...')).toBeInTheDocument()
		})

		it('shows custom placeholder when provided', () => {
			render(<MarkdownContent content={null} placeholder="Custom placeholder text" />)

			expect(screen.getByText('Custom placeholder text')).toBeInTheDocument()
		})
	})

	describe('markdown rendering', () => {
		it('renders heading 1', () => {
			render(<MarkdownContent content="# Heading 1" />)

			const heading = screen.getByRole('heading', { level: 1 })
			expect(heading).toHaveTextContent('Heading 1')
		})

		it('renders heading 2', () => {
			render(<MarkdownContent content="## Heading 2" />)

			const heading = screen.getByRole('heading', { level: 2 })
			expect(heading).toHaveTextContent('Heading 2')
		})

		it('renders heading 3', () => {
			render(<MarkdownContent content="### Heading 3" />)

			const heading = screen.getByRole('heading', { level: 3 })
			expect(heading).toHaveTextContent('Heading 3')
		})

		it('renders paragraphs', () => {
			render(<MarkdownContent content="This is a paragraph." />)

			expect(screen.getByText('This is a paragraph.')).toBeInTheDocument()
		})

		it('renders unordered lists', () => {
			render(
				<MarkdownContent
					content={`- Item 1
- Item 2
- Item 3`}
				/>
			)

			expect(screen.getByText('Item 1')).toBeInTheDocument()
			expect(screen.getByText('Item 2')).toBeInTheDocument()
			expect(screen.getByText('Item 3')).toBeInTheDocument()
		})

		it('renders inline code', () => {
			render(<MarkdownContent content="Use `const x = 1` for variables" />)

			const codeElement = screen.getByText('const x = 1')
			expect(codeElement.tagName).toBe('CODE')
		})

		it('renders links', () => {
			render(<MarkdownContent content="Check out [this link](https://example.com)" />)

			const link = screen.getByRole('link', { name: 'this link' })
			expect(link).toHaveAttribute('href', 'https://example.com')
			expect(link).toHaveAttribute('target', '_blank')
			expect(link).toHaveAttribute('rel', 'noopener noreferrer')
		})

		it('renders blockquotes', () => {
			render(<MarkdownContent content="> This is a quote" />)

			const blockquote = screen.getByText('This is a quote')
			expect(blockquote.closest('blockquote')).toBeInTheDocument()
		})

		it('renders bold text', () => {
			render(<MarkdownContent content="This is **bold** text" />)

			const strongElement = screen.getByText('bold')
			expect(strongElement.tagName).toBe('STRONG')
		})

		it('renders italic text', () => {
			render(<MarkdownContent content="This is *italic* text" />)

			const emElement = screen.getByText('italic')
			expect(emElement.tagName).toBe('EM')
		})
	})

	describe('custom className', () => {
		it('applies custom className to container', () => {
			const { container } = render(
				<MarkdownContent content="Some content" className="custom-class" />
			)

			expect(container.querySelector('.custom-class')).toBeInTheDocument()
		})
	})

	describe('display name', () => {
		it('has correct display name', () => {
			expect(MarkdownContent.displayName).toBe('MarkdownContent')
		})
	})
})
