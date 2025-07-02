'use client';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import useSWR, { mutate } from 'swr';

interface MindMapData {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	created_at: string;
	updated_at: string;
}

// Visual Mind Map Preview Component
const MindMapPreview = ({
	map,
	onDelete,
}: {
	map: MindMapData;
	onDelete: (id: string) => void;
}) => {
	// Generate hash from title + id
	const generateHash = (str: string) => {
		let hash = 0;

		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}

		return Math.abs(hash);
	};

	// Generate mesh gradient colors based on hash
	const generateMeshGradient = (title: string, id: string) => {
		const seed = title + id;
		const hash = generateHash(seed);

		// Generate 4 colors for the mesh gradient
		const colors = [];

		for (let i = 0; i < 4; i++) {
			const h = (hash + i * 90) % 360;
			const s = 70 + ((hash + i) % 30); // 70-100% saturation
			const l = 35 + ((hash + i * 2) % 25); // 45-70% lightness
			colors.push(`hsl(${h}, ${s}%, ${l}%)`);
		}

		return {
			background: `
        radial-gradient(at 40% 20%, ${colors[0]} 0px, transparent 50%),
        radial-gradient(at 80% 0%, ${colors[1]} 0px, transparent 50%),
        radial-gradient(at 0% 50%, ${colors[2]} 0px, transparent 50%),
        radial-gradient(at 80% 100%, ${colors[3]} 0px, transparent 50%)
      `,
			colors,
		};
	};

	const meshGradient = generateMeshGradient(map.title, map.id);

	return (
		<div className='group relative'>
			<Link href={`/mind-map/${map.id}`}>
				<div className='relative h-48 w-full rounded-md hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl'>
					{/* Mesh Gradient Background */}
					<div
						className='absolute z-10 inset-0 opacity-80 rounded-md'
						style={{
							background: meshGradient.background,
						}}
					/>

					<div
						className='absolute z-[21] inset-0 opacity-80 backdrop-blur-md rounded-md -m-[2px]'
						style={{
							backgroundImage: `
               url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E")`,
						}}
					/>

					{/* Title Area */}
					<div className='absolute z-[22] rounded-md h-full flex flex-col justify-end items-start bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent'>
						<h3 className='text-white font-semibold text-sm truncate mb-1'>
							{map.title}
						</h3>

						<p className='text-white/70 text-xs'>
							{new Date(map.created_at).toLocaleDateString()}
						</p>
					</div>
				</div>
			</Link>

			{/* Delete button */}
			<Button
				onClick={(e) => {
					e.preventDefault();
					onDelete(map.id);
				}}
				variant='ghost'
				size='icon'
				className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 h-8 w-8 bg-black/30 backdrop-blur-sm hover:bg-red-500/80 text-white/80 hover:text-white border border-white/20 hover:border-red-400/50'
			>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					className='h-4 w-4'
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					strokeWidth={2}
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
					/>
				</svg>
			</Button>
		</div>
	);
};

export default function DashboardPage() {
	const [newMapTitle, setNewMapTitle] = useState('');
	const [isCreating, setIsCreating] = useState(false);
	const [notification, setNotification] = useState<{
		message: string | null;
		type: 'success' | 'error' | null;
	}>({ message: null, type: null });

	const router = useRouter();

	// SWR fetcher function
	const fetcher = async (url: string) => {
		const response = await fetch(url, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});

		if (!response.ok) {
			throw new Error('Failed to fetch mind maps');
		}

		const { data } = await response.json();
		return data.maps;
	};

	// Use SWR for data fetching with caching
	const {
		data: mindMaps = [],
		error,
		isLoading,
	} = useSWR<MindMapData[]>('/api/maps', fetcher, {
		revalidateOnFocus: false,
		revalidateOnReconnect: true,
		dedupingInterval: 5000,
	});

	const showNotification = useCallback(
		(message: string, type: 'success' | 'error') => {
			setNotification({ message, type });
			const timer = setTimeout(() => {
				setNotification({ message: null, type: null });
			}, 5000);
			return () => clearTimeout(timer);
		},
		[]
	);

	const handleCreateMap = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMapTitle.trim() || isCreating) return;

		setIsCreating(true);

		try {
			const response = await fetch('/api/maps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newMapTitle }),
			});

			if (!response.ok) {
				throw new Error('Failed to create new mind map.');
			}

			const data = await response.json();

			// Optimistically update the cache
			mutate('/api/maps', [data.map, ...mindMaps], false);

			setNewMapTitle('');
			showNotification('Map created successfully!', 'success');
			router.push(`/mind-map/${data.map.id}`);
		} catch (err: unknown) {
			console.error('Error creating map:', err);
			const message =
				err instanceof Error
					? err.message
					: 'An error occurred while creating the map.';
			showNotification(message, 'error');
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteMap = async (mapId: string) => {
		// Consider using a custom modal later
		if (!confirm('Delete this mind map? This action cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch(`/api/maps/${mapId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete mind map.');
			}

			// Optimistically update the cache
			mutate(
				'/api/maps',
				mindMaps.filter((map) => map.id !== mapId),
				false
			);

			showNotification('Map deleted successfully.', 'success');
		} catch (err: unknown) {
			console.error('Error deleting map:', err);
			const message =
				err instanceof Error
					? err.message
					: 'An error occurred while deleting the map.';
			showNotification(message, 'error');

			// Revalidate on error to sync with server state
			mutate('/api/maps');
		}
	};

	if (isLoading && !mindMaps.length) {
		return (
			<div className='flex min-h-screen items-center justify-center text-zinc-400'>
				Loading your maps...
			</div>
		);
	}

	return (
		<div className='min-h-screen w-full'>
			<DashboardHeader />

			<div className='p-6 md:p-8'>
				<div className='mx-auto h-full w-full max-w-6xl'>
					{/* Search Bar */}
					<div className='mb-8'>
						<div className='relative max-w-2xl'>
							<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
								<svg
									className='h-5 w-5 text-zinc-400'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
									/>
								</svg>
							</div>

							<Input
								type='text'
								placeholder='Search'
								className='pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400 focus:border-zinc-500'
							/>
						</div>
					</div>

					{/* Loading/Error State */}
					{isLoading && mindMaps.length > 0 && (
						<p className='mb-4 text-zinc-400'>Refreshing maps...</p>
					)}

					{error && (
						<p className='mb-4 text-red-400'>
							Error: {error.message || 'Failed to load maps'}
						</p>
					)}

					{/* Mind Map Grid or Empty State */}
					{mindMaps.length === 0 && !isLoading ? (
						<div className='py-20'>
							<div className='text-center max-w-md mx-auto'>
								<div className='border-2 border-dashed border-zinc-600 rounded-lg p-12 mb-6'>
									<h2 className='text-xl text-white mb-2'>
										Create your first mind map
									</h2>

									<p className='text-zinc-400 mb-6'>
										Start with a central idea and branch out to explore related
										concepts and details.
									</p>

									{/* Create New Map Form */}
									<form onSubmit={handleCreateMap} className='space-y-4'>
										<Input
											type='text'
											value={newMapTitle}
											onChange={(e) => setNewMapTitle(e.target.value)}
											placeholder='Enter map title...'
											className='bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400'
											disabled={isCreating}
										/>

										<Button
											type='submit'
											disabled={!newMapTitle.trim() || isCreating}
											className='w-full bg-blue-600 hover:bg-blue-700'
										>
											{isCreating ? 'Creating...' : 'New Map'}
										</Button>
									</form>
								</div>
							</div>
						</div>
					) : (
						<>
							{/* Create New Map Form - Compact version when maps exist */}
							<div className='mb-8'>
								<form
									onSubmit={handleCreateMap}
									className='flex gap-3 max-w-md'
								>
									<Input
										type='text'
										value={newMapTitle}
										onChange={(e) => setNewMapTitle(e.target.value)}
										placeholder='New map title...'
										className='flex-grow bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400'
										disabled={isCreating}
									/>

									<Button
										type='submit'
										disabled={!newMapTitle.trim() || isCreating}
										className='bg-blue-600 hover:bg-blue-700'
									>
										{isCreating ? 'Creating...' : 'Create'}
									</Button>
								</form>
							</div>

							{/* Mind Maps Grid */}
							<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
								{mindMaps.map((map) => (
									<MindMapPreview
										key={map.id}
										map={map}
										onDelete={handleDeleteMap}
									/>
								))}
							</div>
						</>
					)}

					{/* Notification Display */}
					{notification.message && (
						<div
							className={`fixed right-5 bottom-5 z-50 max-w-sm rounded-lg p-4 text-sm font-medium shadow-lg ${
								notification.type === 'success'
									? 'bg-emerald-600 text-white'
									: 'bg-rose-600 text-white'
							}`}
						>
							{notification.message}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
