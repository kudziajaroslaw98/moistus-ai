import { ModalProps } from '@/types/modal-props';

export default function Modal({
	isOpen,
	onClose,
	title,
	children,
}: ModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
			onClick={onClose}
		>
			{/* Modal Content */}
			<div
				className='w-full max-w-lg rounded-sm border border-zinc-800 bg-zinc-950 shadow-lg'
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className='flex items-center justify-between border-b border-zinc-700 p-4'>
					<h2 className='text-lg font-semibold text-zinc-100'>{title}</h2>

					<button
						aria-label='Close modal'
						className='rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none'
						onClick={onClose}
					>
						<svg
							className='h-5 w-5'
							fill='none'
							stroke='currentColor'
							strokeWidth={2}
							viewBox='0 0 24 24'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path
								d='M6 18L18 6M6 6l12 12'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</button>
				</div>

				{/* Modal Body */}
				<div className='p-4 md:p-6'>{children}</div>
			</div>
		</div>
	);
}
