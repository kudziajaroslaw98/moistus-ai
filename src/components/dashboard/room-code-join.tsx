'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

// Same shape the join page accepts: 6 letters/digits, optional dash.
const ROOM_CODE_PATTERN = /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/i;

/** "Have a room code?" box: sends a valid code to the join page. */
export function RoomCodeJoin() {
	const router = useRouter();
	const inputId = useId();
	const errorId = useId();
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const normalized = code.trim().toUpperCase();

		if (!ROOM_CODE_PATTERN.test(normalized)) {
			setError('Room codes look like K7Q-4ZP.');
			return;
		}

		router.push(`/join?code=${encodeURIComponent(normalized)}`);
	};

	return (
		<section
			aria-labelledby={`${inputId}-title`}
			className='mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl border border-[#1d1f24] bg-[#0c0d10] px-5 py-[18px]'
		>
			<div>
				<h2 className='text-[15px] font-semibold' id={`${inputId}-title`}>
					Have a room code?
				</h2>

				<p className='mt-0.5 text-[13px] text-zinc-400'>
					Join a map someone shared with you.
				</p>
			</div>

			<form className='flex flex-[0_1_360px] flex-col gap-1.5' onSubmit={handleSubmit}>
				<div className='flex gap-2'>
					<label className='sr-only' htmlFor={inputId}>
						Room code
					</label>

					<input
						aria-describedby={error ? errorId : undefined}
						aria-invalid={error ? true : undefined}
						autoComplete='off'
						id={inputId}
						maxLength={7}
						placeholder='K7Q-4ZP'
						spellCheck={false}
						type='text'
						value={code}
						className='h-11 min-w-0 flex-auto rounded-[10px] border border-[#2a2c33] bg-zinc-950 px-3.5 font-mono text-[15px] uppercase tracking-[0.14em] text-white placeholder:text-zinc-600 focus:border-[#3a3d46] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50'
						onChange={(e) => {
							setCode(e.target.value);
							setError(null);
						}}
					/>

					<button
						className='h-11 shrink-0 rounded-[10px] border border-[#2a2c33] bg-[#131418] px-4 font-medium text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
						type='submit'
					>
						Join
					</button>
				</div>

				{error && (
					<p className='text-xs text-rose-400' id={errorId} role='alert'>
						{error}
					</p>
				)}
			</form>
		</section>
	);
}
