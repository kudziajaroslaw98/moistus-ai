export default function OfflinePage() {
	return (
		<main className='flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100'>
			<div className='w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl'>
				<p className='text-xs uppercase tracking-[0.2em] text-zinc-400'>Offline</p>
				<h1 className='mt-3 text-3xl font-semibold text-zinc-50'>
					You are currently offline
				</h1>
				<p className='mt-4 text-sm leading-6 text-zinc-300'>
					Shiko can still load previously opened workspaces and queue your
					changes. Reconnect to sync everything to the server.
				</p>
				<div className='mt-8 grid gap-3 text-sm text-zinc-200'>
					<div className='rounded-lg border border-zinc-800 bg-zinc-950/70 p-3'>
						Previously visited maps remain available.
					</div>
					<div className='rounded-lg border border-zinc-800 bg-zinc-950/70 p-3'>
						New edits are queued and replayed automatically when online.
					</div>
				</div>
			</div>
		</main>
	);
}

