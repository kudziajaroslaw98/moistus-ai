import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from './chat-input'

// Define quick prompts for assertions (matching the component's QUICK_PROMPTS)
const QUICK_PROMPTS = [
	{ label: 'Suggest ideas', prompt: 'Suggest some new ideas to explore based on my current mind map' },
	{ label: 'Summarize', prompt: 'Summarize the main themes in my mind map' },
	{ label: 'Find connections', prompt: 'What connections or patterns do you see between my ideas?' },
	{ label: 'Expand on this', prompt: 'Help me expand on the selected nodes with more details' },
]

describe('ChatInput', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('rendering', () => {
		it('renders textarea with default placeholder', () => {
			render(<ChatInput onSend={jest.fn()} />)

			expect(
				screen.getByPlaceholderText('Ask anything about your mind map...')
			).toBeInTheDocument()
		})

		it('renders with custom placeholder', () => {
			render(<ChatInput onSend={jest.fn()} placeholder='Custom placeholder' />)

			expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
		})

		it('renders quick prompts toggle button', () => {
			render(<ChatInput onSend={jest.fn()} />)

			expect(screen.getByText('Quick prompts')).toBeInTheDocument()
		})

		it('renders send button', () => {
			render(<ChatInput onSend={jest.fn()} />)

			// There are 2 buttons: Quick prompts toggle and Send button
			const buttons = screen.getAllByRole('button')
			expect(buttons).toHaveLength(2)
			// Send button is the second one
			expect(buttons[1]).toBeInTheDocument()
		})

		it('shows character count', () => {
			render(<ChatInput onSend={jest.fn()} maxLength={100} />)

			expect(screen.getByText('0/100')).toBeInTheDocument()
		})

		it('shows keyboard shortcut hint', () => {
			render(<ChatInput onSend={jest.fn()} />)

			expect(screen.getByText('to send')).toBeInTheDocument()
		})
	})

	describe('text input', () => {
		it('updates textarea value when typing', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Hello world')

			expect(textarea).toHaveValue('Hello world')
		})

		it('updates character count when typing', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} maxLength={100} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Test')

			expect(screen.getByText('4/100')).toBeInTheDocument()
		})

		it('enforces maxLength limit', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} maxLength={10} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'This is a very long message')

			// Should be truncated to 10 characters
			expect(textarea).toHaveValue('This is a ')
		})

		it('uses default maxLength of 4000', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Test')

			expect(screen.getByText('4/4000')).toBeInTheDocument()
		})
	})

	describe('sending messages', () => {
		it('calls onSend with trimmed message when Ctrl+Enter pressed', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()
			render(<ChatInput onSend={onSend} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, '  Hello AI  ')
			await user.keyboard('{Control>}{Enter}{/Control}')

			expect(onSend).toHaveBeenCalledWith('Hello AI')
		})

		it('calls onSend with message when send button clicked', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()
			render(<ChatInput onSend={onSend} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Test message')

			// Send button is the second button (after Quick prompts toggle)
			const buttons = screen.getAllByRole('button')
			const sendButton = buttons[1]
			await user.click(sendButton)

			expect(onSend).toHaveBeenCalledWith('Test message')
		})

		it('clears textarea after sending', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Test message')
			await user.keyboard('{Control>}{Enter}{/Control}')

			expect(textarea).toHaveValue('')
		})

		it('does not send empty message', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()
			render(<ChatInput onSend={onSend} />)

			await user.keyboard('{Control>}{Enter}{/Control}')

			expect(onSend).not.toHaveBeenCalled()
		})

		it('does not send whitespace-only message', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()
			render(<ChatInput onSend={onSend} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, '   ')
			await user.keyboard('{Control>}{Enter}{/Control}')

			expect(onSend).not.toHaveBeenCalled()
		})
	})

	describe('quick prompts', () => {
		it('shows quick prompts when toggle clicked', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			await user.click(screen.getByText('Quick prompts'))

			// All quick prompts should be visible
			for (const { label } of QUICK_PROMPTS) {
				expect(screen.getByText(label)).toBeInTheDocument()
			}
		})

		it('hides quick prompts when toggle clicked again', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			// Open
			await user.click(screen.getByText('Quick prompts'))
			expect(screen.getByText('Suggest ideas')).toBeInTheDocument()

			// Close
			await user.click(screen.getByText('Quick prompts'))
			await waitFor(() => {
				expect(screen.queryByText('Suggest ideas')).not.toBeInTheDocument()
			})
		})

		it('sends quick prompt directly when clicked', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()
			render(<ChatInput onSend={onSend} />)

			await user.click(screen.getByText('Quick prompts'))
			await user.click(screen.getByText('Summarize'))

			expect(onSend).toHaveBeenCalledWith('Summarize the main themes in my mind map')
		})

		it('closes quick prompts after selection', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			await user.click(screen.getByText('Quick prompts'))
			await user.click(screen.getByText('Find connections'))

			await waitFor(() => {
				expect(screen.queryByText('Suggest ideas')).not.toBeInTheDocument()
			})
		})

		it('sends correct prompt for each quick prompt option', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()

			// Test each prompt one at a time with cleanup
			const { unmount } = render(<ChatInput onSend={onSend} />)

			await user.click(screen.getByText('Quick prompts'))
			await user.click(screen.getByText('Suggest ideas'))
			expect(onSend).toHaveBeenLastCalledWith(QUICK_PROMPTS[0].prompt)

			unmount()
			onSend.mockClear()

			// Test Summarize
			const { unmount: unmount2 } = render(<ChatInput onSend={onSend} />)
			await user.click(screen.getByText('Quick prompts'))
			await user.click(screen.getByText('Summarize'))
			expect(onSend).toHaveBeenLastCalledWith(QUICK_PROMPTS[1].prompt)

			unmount2()
		})
	})

	describe('disabled state', () => {
		it('disables textarea when disabled prop is true', () => {
			render(<ChatInput onSend={jest.fn()} disabled />)

			expect(screen.getByRole('textbox')).toBeDisabled()
		})

		it('disables textarea when streaming', () => {
			render(<ChatInput onSend={jest.fn()} isStreaming />)

			expect(screen.getByRole('textbox')).toBeDisabled()
		})

		it('disables send button when disabled', () => {
			render(<ChatInput onSend={jest.fn()} disabled />)

			const sendButton = screen.getAllByRole('button')[1]
			expect(sendButton).toBeDisabled()
		})

		it('disables send button when streaming', () => {
			render(<ChatInput onSend={jest.fn()} isStreaming />)

			const sendButton = screen.getAllByRole('button')[1]
			expect(sendButton).toBeDisabled()
		})

		it('disables send button when textarea is empty', () => {
			render(<ChatInput onSend={jest.fn()} />)

			const sendButton = screen.getAllByRole('button')[1]
			expect(sendButton).toBeDisabled()
		})

		it('enables send button when there is text', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Hello')

			const sendButton = screen.getAllByRole('button')[1]
			expect(sendButton).not.toBeDisabled()
		})

		it('disables quick prompts toggle when disabled', () => {
			render(<ChatInput onSend={jest.fn()} disabled />)

			const toggle = screen.getByText('Quick prompts').closest('button')
			expect(toggle).toBeDisabled()
		})

		it('disables quick prompts toggle when streaming', () => {
			render(<ChatInput onSend={jest.fn()} isStreaming />)

			const toggle = screen.getByText('Quick prompts').closest('button')
			expect(toggle).toBeDisabled()
		})

		it('does not send when disabled even with text', async () => {
			const user = userEvent.setup()
			const onSend = jest.fn()
			render(<ChatInput onSend={onSend} disabled />)

			// Can't type when disabled, but we test the click doesn't work
			const sendButton = screen.getAllByRole('button')[1]
			await user.click(sendButton)

			expect(onSend).not.toHaveBeenCalled()
		})
	})

	describe('streaming state', () => {
		it('shows loading spinner when streaming', () => {
			render(<ChatInput onSend={jest.fn()} isStreaming />)

			// The send button (second button) should have an SVG with animate-spin class
			const sendButton = screen.getAllByRole('button')[1]
			const spinner = sendButton.querySelector('.animate-spin')
			expect(spinner).toBeInTheDocument()
		})

		it('shows arrow icon when not streaming', () => {
			render(<ChatInput onSend={jest.fn()} />)

			const sendButton = screen.getAllByRole('button')[1]
			const spinner = sendButton.querySelector('.animate-spin')
			expect(spinner).not.toBeInTheDocument()
		})
	})

	describe('character limit warning', () => {
		it('changes color when near limit (90%+)', async () => {
			const user = userEvent.setup()
			// Use maxLength=10, isNearLimit = count > 10 * 0.9 = count > 9
			// So we need at least 10 characters to trigger warning
			render(<ChatInput onSend={jest.fn()} maxLength={10} />)

			const textarea = screen.getByRole('textbox')
			// Type exactly 10 characters (100% - triggers warning since 10 > 9)
			await user.type(textarea, '1234567890')

			// The character count should have warning color class
			const charCount = screen.getByText('10/10')
			// Check that the className includes text-amber-400
			expect(charCount.className).toContain('text-amber-400')
		})

		it('does not show warning when below 90%', async () => {
			const user = userEvent.setup()
			render(<ChatInput onSend={jest.fn()} maxLength={100} />)

			const textarea = screen.getByRole('textbox')
			await user.type(textarea, 'Short')

			const charCount = screen.getByText('5/100')
			expect(charCount.className).not.toContain('text-amber-400')
		})
	})

	describe('ref forwarding', () => {
		it('forwards ref to textarea', () => {
			const ref = { current: null as HTMLTextAreaElement | null }
			render(<ChatInput ref={ref} onSend={jest.fn()} />)

			expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
		})
	})
})
