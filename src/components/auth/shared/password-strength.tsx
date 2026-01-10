'use client';

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { checkPasswordStrength } from '@/lib/validations/auth';
import { CheckCircle2, Info } from 'lucide-react';

interface PasswordStrengthProps {
	password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
	const { requirements } = checkPasswordStrength(password);

	return (
		<div className='mt-2 space-y-1'>
			{requirements.map(({ met, text }) => (
				<div
					key={text}
					className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
						met ? 'text-emerald-400' : 'text-text-tertiary'
					}`}
				>
					<CheckCircle2
						className={`w-3 h-3 transition-opacity duration-200 ${
							met ? 'opacity-100' : 'opacity-30'
						}`}
					/>
					{text}
				</div>
			))}
		</div>
	);
}

interface PasswordStrengthBarProps {
	password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
	const { requirements, isValid } = checkPasswordStrength(password);
	const metCount = requirements.filter((r) => r.met).length;
	const percentage = (metCount / requirements.length) * 100;

	const getColor = () => {
		if (metCount === 0) return 'bg-overlay';
		if (metCount === 1) return 'bg-error-500';
		if (metCount === 2) return 'bg-amber-500';
		if (metCount === 3) return 'bg-primary-500';
		return 'bg-emerald-500';
	};

	const getLabel = () => {
		if (metCount === 0) return '';
		if (metCount === 1) return 'Weak';
		if (metCount === 2) return 'Fair';
		if (metCount === 3) return 'Good';
		return 'Strong';
	};

	if (!password) return null;

	return (
		<div className='mt-2 space-y-1.5'>
			<div className='flex items-center justify-between text-xs'>
				<span className='text-text-tertiary'>Password strength</span>
				<span
					className={`font-medium ${
						isValid ? 'text-emerald-400' : 'text-text-secondary'
					}`}
				>
					{getLabel()}
				</span>
			</div>
			<div className='h-1 bg-elevated rounded-full overflow-hidden'>
				<div
					className={`h-full ${getColor()} transition-all duration-300 ease-out`}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}

interface PasswordRequirementsInfoProps {
	password: string;
}

export function PasswordRequirementsInfo({
	password,
}: PasswordRequirementsInfoProps) {
	const { requirements, isValid } = checkPasswordStrength(password);
	const metCount = requirements.filter((r) => r.met).length;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type='button'
					className='inline-flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors'
					aria-label='Password requirements'
				>
					<Info className='w-4 h-4' />
					{password && (
						<span
							className={`ml-1 text-xs font-medium ${
								isValid ? 'text-emerald-400' : 'text-text-tertiary'
							}`}
						>
							{metCount}/{requirements.length}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align='start' className='w-56 p-3 bg-surface border-border-subtle'>
				<div className='space-y-2'>
					<p className='text-xs font-medium text-text-primary'>
						Password requirements
					</p>
					<div className='space-y-1'>
						{requirements.map(({ met, text }) => (
							<div
								key={text}
								className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
									met ? 'text-emerald-400' : 'text-text-secondary'
								}`}
							>
								<CheckCircle2
									className={`w-3 h-3 shrink-0 transition-opacity duration-200 ${
										met ? 'opacity-100' : 'opacity-50'
									}`}
								/>
								{text}
							</div>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
