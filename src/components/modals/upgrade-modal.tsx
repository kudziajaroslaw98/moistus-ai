'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Crown, Infinity, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

interface UpgradeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className='sm:max-w-[500px]'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-2xl'>
						<Crown className='h-6 w-6 text-primary-500' />
						Upgrade to Pro
					</DialogTitle>

					<DialogDescription className='text-base'>
						You&apos;ve reached your free plan limit. Unlock unlimited potential
						with Pro.
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 py-4'>
					<div className='flex items-start gap-3'>
						<Infinity className='h-5 w-5 text-primary-500 mt-0.5 flex-shrink-0' />

						<div>
							<p className='font-medium'>Unlimited Everything</p>

							<p className='text-sm text-muted-foreground'>
								Create unlimited mind maps, nodes, and AI suggestions
							</p>
						</div>
					</div>

					<div className='flex items-start gap-3'>
						<Zap className='h-5 w-5 text-primary-500 mt-0.5 flex-shrink-0' />

						<div>
							<p className='font-medium'>AI-Powered Features</p>

							<p className='text-sm text-muted-foreground'>
								Unlimited AI suggestions, content generation, and smart
								connections
							</p>
						</div>
					</div>

					<div className='flex items-start gap-3'>
						<Sparkles className='h-5 w-5 text-primary-500 mt-0.5 flex-shrink-0' />

						<div>
							<p className='font-medium'>Real-time Collaboration</p>

							<p className='text-sm text-muted-foreground'>
								Work together with your team in real-time
							</p>
						</div>
					</div>

					<div className='rounded-lg bg-primary-500/10 border border-primary-500/20 p-4 text-center'>
						<p className='text-3xl font-bold text-primary-600'>$12/month</p>

						<p className='text-sm text-muted-foreground'>
							or $120/year (save 17%)
						</p>

						<p className='text-sm font-medium text-primary-600 mt-2'>
							✨ 14-day free trial included
						</p>
					</div>
				</div>

				<DialogFooter className='gap-2 sm:gap-0'>
					<Button onClick={() => onOpenChange(false)} variant='outline'>
						Maybe Later
					</Button>

					<Link href='/dashboard/settings/billing'>
						<Button className='bg-primary-600 hover:bg-primary-700'>
							Start Free Trial
						</Button>
					</Link>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
