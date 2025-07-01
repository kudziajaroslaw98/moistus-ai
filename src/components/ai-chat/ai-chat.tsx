import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import useAppStore from '@/store/mind-map-store';
import { Settings } from 'lucide-react';
import { memo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useShallow } from 'zustand/shallow';
import { SidePanel } from '../side-panel';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Message } from './message';

interface MessageFormData {
	message: string;
	responseStyle: 'concise' | 'detailed' | 'creative';
	includeContext: boolean;
	autoSuggestNodes: boolean;
}

function AiChatComponent() {
	const { popoverOpen, setPopoverOpen, aiContext, messages } = useAppStore(
		useShallow((state) => ({
			messages: state.messages,
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			aiContext: state.aiContext,
		}))
	);
	const chatEndRef = useRef(null);

	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors, isSubmitting },
	} = useForm<MessageFormData>({
		defaultValues: {
			message: '',
			responseStyle: aiContext?.userPreferences.responseStyle,
			includeContext: aiContext?.userPreferences.includeContext,
			autoSuggestNodes: aiContext?.userPreferences.autoSuggestNodes,
		},
	});

	const onSubmit = async (data: MessageFormData) => {
		console.log('Form data:', {
			message: data.message.trim(),
			responseStyle: data.responseStyle,
			includeContext: data.includeContext,
			autoSuggestNodes: data.autoSuggestNodes,
		});
		// TODO: Add actual message sending logic here
		reset(); // Clear the form after submission
	};

	return (
		<SidePanel
			isOpen={popoverOpen.aiChat}
			onClose={() => setPopoverOpen({ aiChat: false })}
			title='Your personal mind map assitant'
		>
			<div className='flex flex-col gap-4 justify-between w-full h-full py-4'>
				<div className='w-full h-auto grow flex-1'>
					<div className=''>
						{messages.map((message, index) => (
							<Message key={index} {...message} />
						))}
					</div>

					<div ref={chatEndRef}></div>
				</div>

				<div className='w-full h-44 p-4'>
					<form
						onSubmit={handleSubmit(onSubmit)}
						className='flex flex-col h-full gap-3'
					>
						{/* Top row: Response style select and settings dropdown */}
						<div className='flex items-center gap-2'>
							<div className='flex-1'>
								<Controller
									name='responseStyle'
									control={control}
									render={({ field }) => (
										<Select onValueChange={field.onChange} value={field.value}>
											<SelectTrigger className='w-full'>
												<SelectValue placeholder='Response style' />
											</SelectTrigger>

											<SelectContent>
												<SelectItem value='concise'>Concise</SelectItem>

												<SelectItem value='detailed'>Detailed</SelectItem>

												<SelectItem value='creative'>Creative</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</div>

							<Popover>
								<PopoverTrigger asChild>
									<Button variant='secondary' size='icon'>
										<Settings className='h-4 w-4' />

										<span className='sr-only'>Settings</span>
									</Button>
								</PopoverTrigger>

								<PopoverContent align='end' className='w-64'>
									<div className='grid gap-4'>
										<div className='space-y-2'>
											<h4 className='font-medium leading-none'>Settings</h4>

											<p className='text-sm text-muted-foreground'>
												Configure your message options.
											</p>
										</div>

										<div className='grid gap-4'>
											<Label className='flex justify-start items-start gap-2'>
												<Input
													type='checkbox'
													{...register('includeContext')}
												/>

												<span className='text-sm'>Include Context</span>
											</Label>

											<Label className='flex gap-2'>
												<Input
													type='checkbox'
													{...register('autoSuggestNodes')}
												/>

												<span className='text-sm'>Auto Suggest Nodes</span>
											</Label>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>

						{/* Message textarea */}
						<div className='flex-1 gap-2 flex flex-col'>
							<Label htmlFor='message' className='sr-only'>
								Message
							</Label>

							<Textarea
								id='message'
								{...register('message', {
									required: 'Please enter a message',
									validate: (value) =>
										value.trim().length > 0 || 'Message cannot be empty',
								})}
								placeholder='Type your message...'
								aria-invalid={errors.message ? 'true' : 'false'}
							/>

							{errors.message && (
								<span role='alert' className='text-sm text-red-600 mt-1 block'>
									{errors.message.message}
								</span>
							)}

							<div className='flex justify-end'>
								<Button
									type='submit'
									variant={'sky'}
									className='w-full'
									disabled={isSubmitting}
								>
									{isSubmitting ? 'Sending...' : 'Send'}
								</Button>
							</div>
						</div>

						{/* Bottom row: Send button */}
					</form>
				</div>
			</div>
		</SidePanel>
	);
}

export const AiChat = memo(AiChatComponent);
