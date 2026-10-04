import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';
import { NodeCard, type NodeCardProps } from './node-card';

export const PROGRESS_FILL =
	'linear-gradient(90deg, rgba(96,165,250,0.6), rgba(96,165,250,0.8))';

export function TaskCheckbox({ done }: { done: boolean }) {
	return (
		<span
			className={cn(
				'flex size-[18px] flex-none items-center justify-center rounded-[4px] border-[1.5px] text-[#34d399]',
				done ? 'border-[rgba(52,211,153,0.6)]' : 'border-white/30'
			)}
		>
			{done ? <Check aria-hidden='true' className='size-3' strokeWidth={3} /> : null}
		</span>
	);
}

interface TaskProgressProps {
	done: number;
	total: number;
}

export function TaskProgress({ done, total }: TaskProgressProps) {
	const percent = total === 0 ? 0 : Math.round((done / total) * 100);

	return (
		<>
			<div className='flex justify-between text-sm'>
				<span className='text-white/60'>Progress</span>

				<span className='text-white/87'>
					{`${done} / ${total}`}
				</span>
			</div>

			<div className='mt-2 h-1 rounded-full bg-white/6'>
				<div
					className='h-1 rounded-full'
					style={{ width: `${percent}%`, background: PROGRESS_FILL }}
				/>
			</div>
		</>
	);
}

export interface TaskRowData {
	text: string;
	done: boolean;
}

export function TaskRow({ text, done }: TaskRowData) {
	return (
		<li
			className={cn(
				'flex items-center gap-3 text-[15px] leading-[22px]',
				done ? 'text-white/38 line-through' : 'text-white/87'
			)}
		>
			<TaskCheckbox done={done} />

			{text}
		</li>
	);
}

interface TaskNodeProps extends NodeCardProps {
	rows: TaskRowData[];
}

/** Task node body as rendered in the app: progress header then checklist rows. */
export function TaskNode({ rows, ...cardProps }: TaskNodeProps) {
	const done = rows.filter((row) => row.done).length;

	return (
		<NodeCard {...cardProps}>
			<TaskProgress done={done} total={rows.length} />

			<ul className='mt-4 flex flex-col gap-3'>
				{rows.map((row) => (
					<TaskRow done={row.done} key={row.text} text={row.text} />
				))}
			</ul>
		</NodeCard>
	);
}

export const BETA_TASKS: TaskRowData[] = [
	{ text: 'Shortlist venues', done: true },
	{ text: 'Draft invite copy', done: true },
	{ text: 'Confirm date with team', done: false },
	{ text: 'Book a photographer', done: false },
];
