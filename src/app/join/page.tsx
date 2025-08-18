'use client';

import { JoinRoom } from '@/components/sharing/join-room';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function JoinPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const roomCode = searchParams.get('code');

	useEffect(() => {
		// If there's a room code in the URL, redirect to the token-specific route
		if (roomCode) {
			router.replace(`/join/${roomCode}`);
		}
	}, [roomCode, router]);

	const handleJoinSuccess = (result: {
		mapId: string;
		mapTitle: string;
		isAnonymous: boolean;
		userDisplayName: string;
	}) => {
		// Redirect to the mind map after successful join
		router.push(`/mind-map/${result.mapId}`);
	};

	const handleJoinError = (error: string) => {
		console.error('Join error:', error);
		// Error handling is done within the JoinRoom component
	};

	return (
		<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
			<div className='w-full max-w-md'>
				<JoinRoom
					onJoinSuccessCallback={handleJoinSuccess}
					onError={handleJoinError}
					roomCode={roomCode || undefined}
				/>
			</div>
		</div>
	);
}

export default function JoinPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen bg-zinc-950 flex items-center justify-center'>
					<div className='text-zinc-400'>Loading...</div>
				</div>
			}
		>
			<JoinPageContent />
		</Suspense>
	);
}
