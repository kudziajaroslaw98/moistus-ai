import { Check, MoveRight, Sparkles, Type, X } from 'lucide-react';
import { NodeCard } from './node-card';

interface GhostCardProps {
	x?: number;
	y?: number;
	text: string;
	confidence: number;
	from: string;
}

/**
 * AI suggestion as the app renders it today: a solid raised node shell with a
 * faint dashed, type-tinted panel inside. No connector is drawn to the source.
 * The app's "Type:" and "Trigger:" debug lines are intentionally omitted.
 */
export function GhostCard({ x, y, text, confidence, from }: GhostCardProps) {
	return (
		<NodeCard flush elevation={2} x={x} y={y}>
			<div className='rounded-[10px] border-2 border-dashed border-white/8 bg-[rgba(96,165,250,0.1)] p-3 shadow-lg shadow-black/30'>
				<div className='mb-2 flex items-center justify-between text-xs font-medium'>
					<span className='flex items-center gap-1.5 text-white/60'>
						<Type aria-hidden='true' className='size-3' />
						AI Suggestion
					</span>

					<span className='text-[rgba(34,197,94,0.87)]'>{confidence}%</span>
				</div>

				<p className='mb-3 text-sm text-white/87'>{text}</p>

				<div className='mb-3 flex items-center gap-1.5 rounded-[4px] border border-[rgba(168,85,247,0.2)] bg-[rgba(168,85,247,0.1)] px-2 py-1 text-xs text-white/60'>
					<Sparkles
						aria-hidden='true'
						className='size-3 text-[rgba(168,85,247,0.8)]'
					/>

					<span className='flex-1 truncate'>Suggested from: {from}</span>

					<MoveRight
						aria-hidden='true'
						className='size-3 text-[rgba(168,85,247,0.6)]'
					/>
				</div>

				<div className='flex gap-2 text-xs font-medium'>
					<span className='flex items-center gap-1 rounded-[4px] bg-[rgba(34,197,94,0.8)] px-2 py-1 text-[#dcfce7]'>
						<Check aria-hidden='true' className='size-3' strokeWidth={2.5} />
						Accept
					</span>

					<span className='flex items-center gap-1 rounded-[4px] bg-[rgba(239,68,68,0.8)] px-2 py-1 text-[#fee2e2]'>
						<X aria-hidden='true' className='size-3' strokeWidth={2.5} />
						Reject
					</span>
				</div>
			</div>
		</NodeCard>
	);
}
