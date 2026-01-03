'use client';

import { TemplatePicker } from '@/components/dashboard/template-picker';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { ArrowLeft, ArrowRight, Loader2, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

type DialogStep = 'template' | 'details';

interface CreateMapDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		title: string;
		description?: string;
		templateId?: string;
	}) => Promise<void>;
	disabled?: boolean;
}

export function CreateMapDialog({
	open,
	onOpenChange,
	onSubmit,
	disabled = false,
}: CreateMapDialogProps) {
	// Step state
	const [step, setStep] = useState<DialogStep>('template');
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
		null
	);

	// Form state
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [titleError, setTitleError] = useState<string | null>(null);
	const [touched, setTouched] = useState(false);

	const titleInputRef = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const titleErrorId = useId();
	const descriptionId = useId();

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setStep('template');
			setSelectedTemplateId(null);
			setTitle('');
			setDescription('');
			setTitleError(null);
			setTouched(false);
		}
	}, [open]);

	// Auto-focus title input when entering details step
	useEffect(() => {
		if (step === 'details' && open) {
			const timer = setTimeout(() => {
				titleInputRef.current?.focus();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [step, open]);

	// Validate title
	const validateTitle = (value: string): string | null => {
		const trimmed = value.trim();
		if (!trimmed) {
			return 'Title is required';
		}
		if (trimmed.length > TITLE_MAX_LENGTH) {
			return `Title must be ${TITLE_MAX_LENGTH} characters or less`;
		}
		return null;
	};

	// Handle title change with validation
	const handleTitleChange = (value: string) => {
		setTitle(value);
		if (touched) {
			setTitleError(validateTitle(value));
		}
	};

	// Handle title blur for validation
	const handleTitleBlur = () => {
		setTouched(true);
		setTitleError(validateTitle(title));
	};

	// Handle step navigation
	const handleNextStep = () => {
		if (step === 'template') {
			setStep('details');
		}
	};

	const handlePrevStep = () => {
		if (step === 'details') {
			setStep('template');
			setTitleError(null);
			setTouched(false);
		}
	};

	// Handle form submission
	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		const error = validateTitle(title);
		if (error) {
			setTitleError(error);
			setTouched(true);
			titleInputRef.current?.focus();
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit({
				title: title.trim(),
				description: description.trim() || undefined,
				templateId: selectedTemplateId || undefined,
			});
		} catch {
			// Error handling done in parent, keep dialog open
		} finally {
			setIsSubmitting(false);
		}
	};

	const isValid = !validateTitle(title);
	const isDisabled = disabled || isSubmitting;

	// Animation variants for step transitions
	const stepVariants = {
		enter: (direction: number) => ({
			x: direction > 0 ? 20 : -20,
			opacity: 0,
		}),
		center: {
			x: 0,
			opacity: 1,
		},
		exit: (direction: number) => ({
			x: direction > 0 ? -20 : 20,
			opacity: 0,
		}),
	};

	const direction = step === 'template' ? -1 : 1;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className='bg-zinc-950 border border-zinc-800 sm:max-w-xl backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden p-0'
				showCloseButton={true}
			>
				<form onSubmit={handleSubmit}>
					<DialogHeader className='px-6 pt-6 pb-2'>
						<div className='flex items-center gap-3'>
							{step === 'details' && (
								<Button
									type='button'
									variant='ghost'
									size='icon-sm'
									onClick={handlePrevStep}
									disabled={isSubmitting}
									className='text-zinc-400 hover:text-white hover:bg-zinc-800/50'
								>
									<ArrowLeft className='w-4 h-4' />
								</Button>
							)}
							<DialogTitle className='text-xl font-semibold text-white tracking-tight'>
								{step === 'template' ? 'Choose a template' : 'Name your map'}
							</DialogTitle>
						</div>

						{/* Step indicator */}
						<div className='flex items-center gap-2 mt-3'>
							<div
								className={cn(
									'h-1 flex-1 rounded-full transition-colors duration-200',
									step === 'template' ? 'bg-sky-500' : 'bg-zinc-700'
								)}
							/>
							<div
								className={cn(
									'h-1 flex-1 rounded-full transition-colors duration-200',
									step === 'details' ? 'bg-sky-500' : 'bg-zinc-700'
								)}
							/>
						</div>
					</DialogHeader>

					{/* Step content */}
					<div className='px-6 py-4 min-h-80'>
						<AnimatePresence mode='popLayout' custom={direction}>
							{step === 'template' ? (
								<motion.div
									key='template'
									custom={direction}
									variants={stepVariants}
									initial='enter'
									animate='center'
									exit='exit'
									transition={{
										duration: 0.2,
										ease: [0.25, 0.46, 0.45, 0.94],
									}}
								>
									<TemplatePicker
										selectedTemplateId={selectedTemplateId}
										onSelectTemplate={setSelectedTemplateId}
									/>
								</motion.div>
							) : (
								<motion.div
									key='details'
									custom={direction}
									variants={stepVariants}
									initial='enter'
									animate='center'
									exit='exit'
									transition={{
										duration: 0.2,
										ease: [0.25, 0.46, 0.45, 0.94],
									}}
									className='space-y-5'
								>
									{/* Title Field */}
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.25,
											ease: [0.165, 0.84, 0.44, 1],
										}}
										className='space-y-2'
									>
										<div className='flex items-center justify-between'>
											<label
												htmlFor={titleId}
												className='text-sm font-medium text-zinc-300'
											>
												Title{' '}
												<span className='text-red-400' aria-hidden='true'>
													*
												</span>
											</label>
											<span
												className={cn(
													'text-xs tabular-nums transition-colors',
													title.length > TITLE_MAX_LENGTH
														? 'text-red-400'
														: 'text-zinc-500'
												)}
											>
												{title.length}/{TITLE_MAX_LENGTH}
											</span>
										</div>
										<input
											ref={titleInputRef}
											id={titleId}
											type='text'
											value={title}
											onChange={(e) => handleTitleChange(e.target.value)}
											onBlur={handleTitleBlur}
											disabled={isDisabled}
											placeholder='My new mind map...'
											aria-required='true'
											aria-invalid={!!titleError}
											aria-describedby={titleError ? titleErrorId : undefined}
											className={cn(
												'w-full px-3.5 py-2.5 rounded-lg text-sm text-zinc-100 placeholder-zinc-500',
												'bg-zinc-900/50 border transition-all duration-200',
												'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950',
												titleError
													? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
													: 'border-zinc-700/50 hover:border-zinc-600/50 focus:ring-sky-500/30 focus:border-sky-500/50',
												isDisabled && 'opacity-50 cursor-not-allowed'
											)}
										/>
										{titleError && (
											<motion.p
												id={titleErrorId}
												initial={{ opacity: 0, y: -4 }}
												animate={{ opacity: 1, y: 0 }}
												className='text-xs text-red-400'
												role='alert'
											>
												{titleError}
											</motion.p>
										)}
									</motion.div>

									{/* Description Field */}
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											delay: 0.05,
											duration: 0.25,
											ease: [0.165, 0.84, 0.44, 1],
										}}
										className='space-y-2'
									>
										<div className='flex items-center justify-between'>
											<label
												htmlFor={descriptionId}
												className='text-sm font-medium text-zinc-300'
											>
												Description{' '}
												<span className='text-zinc-500 font-normal'>
													(optional)
												</span>
											</label>
											<span
												className={cn(
													'text-xs tabular-nums transition-colors',
													description.length > DESCRIPTION_MAX_LENGTH
														? 'text-red-400'
														: 'text-zinc-500'
												)}
											>
												{description.length}/{DESCRIPTION_MAX_LENGTH}
											</span>
										</div>
										<textarea
											id={descriptionId}
											value={description}
											onChange={(e) =>
												setDescription(
													e.target.value.slice(0, DESCRIPTION_MAX_LENGTH + 50)
												)
											}
											disabled={isDisabled}
											placeholder='What is this mind map about?'
											rows={3}
											className={cn(
												'w-full px-3.5 py-2.5 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 resize-none',
												'bg-zinc-900/50 border border-zinc-700/50 transition-all duration-200',
												'hover:border-zinc-600/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30',
												'focus:ring-offset-2 focus:ring-offset-zinc-950 focus:border-sky-500/50',
												isDisabled && 'opacity-50 cursor-not-allowed'
											)}
										/>
									</motion.div>

									{/* Selected template indicator */}
									{selectedTemplateId && (
										<motion.div
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												delay: 0.1,
												duration: 0.25,
												ease: [0.165, 0.84, 0.44, 1],
											}}
											className='flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20'
										>
											<div className='w-2 h-2 rounded-full bg-sky-500' />
											<span className='text-xs text-sky-400'>
												Using template: {selectedTemplateId.replace(/-/g, ' ')}
											</span>
										</motion.div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Footer with Buttons */}
					<DialogFooter className='px-6 py-4 bg-zinc-900/30 border-t border-zinc-800/50'>
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								delay: 0.1,
								duration: 0.25,
								ease: [0.165, 0.84, 0.44, 1],
							}}
							className='flex items-center gap-3 w-full sm:w-auto sm:ml-auto'
						>
							<Button
								type='button'
								variant='ghost'
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
								className='flex-1 sm:flex-none text-zinc-400 hover:text-white hover:bg-zinc-800/50'
							>
								Cancel
							</Button>

							{step === 'template' ? (
								<Button
									type='button'
									onClick={handleNextStep}
									disabled={isDisabled}
									className={cn(
										'flex-1 sm:flex-none bg-sky-600 hover:bg-sky-500 text-white',
										'shadow-lg shadow-sky-600/25 hover:shadow-xl hover:shadow-sky-600/30',
										'transition-all duration-200'
									)}
								>
									Next
									<ArrowRight className='w-4 h-4 ml-2' />
								</Button>
							) : (
								<Button
									type='submit'
									disabled={isDisabled || !isValid}
									aria-busy={isSubmitting}
									className={cn(
										'flex-1 sm:flex-none bg-sky-600 hover:bg-sky-500 text-white',
										'shadow-lg shadow-sky-600/25 hover:shadow-xl hover:shadow-sky-600/30',
										'transition-all duration-200',
										(isDisabled || !isValid) && 'opacity-50 cursor-not-allowed'
									)}
								>
									{isSubmitting ? (
										<>
											<Loader2 className='w-4 h-4 mr-2 animate-spin' />
											Creating...
										</>
									) : (
										<>
											<Plus className='w-4 h-4 mr-2' />
											Create map
										</>
									)}
								</Button>
							)}
						</motion.div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
