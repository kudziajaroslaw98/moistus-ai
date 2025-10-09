// src/components/modals/ReferenceSearchModal.tsx (New File)
'use client';

import Modal from '@/components/modal';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { useShallow } from 'zustand/shallow';

interface SearchResult {
	node_id: string;
	node_content: string;
	map_id: string;
	map_title: string;
}

export function ReferenceSearchModal() {
	const { popoverOpen, setPopoverOpen, mapId, reactFlowInstance } =
		useAppStore(
			useShallow((state) => ({
				popoverOpen: state.popoverOpen,
				setPopoverOpen: state.setPopoverOpen,
				addNode: state.addNode,
				mapId: state.mapId,
				reactFlowInstance: state.reactFlowInstance,
			}))
		);

	const [query, setQuery] = useState('');
	const [debouncedQuery] = useDebounce(query, 500);
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (debouncedQuery.length < 2) {
			setResults([]);
			return;
		}

		const search = async () => {
			setIsLoading(true);

			try {
				const response = await fetch('/api/nodes/search-across-maps', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: debouncedQuery }),
				});
				const data = await response.json();
				console.dir(data, { depth: 0 });
				setResults(data.data || []);
			} catch (error) {
				console.error('Search failed', error);
			} finally {
				setIsLoading(false);
			}
		};

		search();
	}, [debouncedQuery]);

	const handleSelect = async (result: SearchResult) => {
		if (!mapId || !reactFlowInstance) return;

		// Get the center of the current view to place the new node
		const position = reactFlowInstance.screenToFlowPosition({
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
		});

		// This will now call the updated API endpoint
		const response = await fetch('/api/nodes/create-reference', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sourceMapId: mapId,
				targetMapId: result.map_id,
				targetNodeId: result.node_id,
				position: position,
			}),
		});

		if (response.ok) {
			const _newNodeData = await response.json(); 
			// The API now returns the created node. You can add it directly
			// to the local state for an optimistic update, but since your
			// store is already set up with realtime subscriptions, the new
			// node will appear automatically.
			toast.success('Reference created!');
		} else {
			toast.error('Failed to create reference.');
		}

		onClose();
	};

	const onClose = () => setPopoverOpen({ referenceSearch: false }); // Add referenceSearch to popover state

	return (
		<Modal
			isOpen={popoverOpen.referenceSearch}
			onClose={onClose}
			title='Reference a Node'
		>
			<div className='space-y-4'>
				<Input
					placeholder='Search for a node...'
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					autoFocus
				/>

				<div className='max-h-80 overflow-y-auto space-y-2'>
					{isLoading && <Spinner />}

					{results.map((res) => (
						<div
							key={res.node_id}
							onClick={() => handleSelect(res)}
							className='p-2 rounded hover:bg-zinc-800 cursor-pointer'
						>
							<p className='text-zinc-100'>{res.node_content}</p>

							<p className='text-xs text-zinc-400'>In: {res.map_title}</p>
						</div>
					))}

					{!isLoading && debouncedQuery && results.length === 0 && (
						<p className='text-center text-zinc-500'>No results found.</p>
					)}
				</div>
			</div>
		</Modal>
	);
}
