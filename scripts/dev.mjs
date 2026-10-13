// Starts Next.js and PartyKit together, so `pnpm dev` is all local development needs.
// PartyKit serves the realtime channels (permissions, cursors, collaborators,
// notifications): without it the map loads, but every realtime socket fails and
// collaborators can look read-only.
//
// Extra arguments go to `next dev` (for example `pnpm dev --port 3002`).
import { spawn } from 'node:child_process';

const children = new Map();
let stopping = false;
let exitCode = 0;

function start(name, args) {
	const child = spawn('pnpm', args, {
		stdio: 'inherit',
		// pnpm is a .cmd shim on Windows.
		shell: process.platform === 'win32',
	});

	children.set(name, child);
	child.on('exit', (code) => handleExit(name, code));
}

function stopAll(signal) {
	stopping = true;

	for (const child of children.values()) {
		if (child.exitCode === null) {
			child.kill(signal);
		}
	}
}

function handleExit(name, code) {
	children.delete(name);

	if (name === 'next') {
		// Ctrl+C reaches both children directly; that is a clean stop, not a crash.
		exitCode = stopping ? 0 : (code ?? 1);
		stopAll('SIGTERM');
	} else if (!stopping) {
		// A PartyKit that cannot start (say port 1999 is taken by one you started
		// yourself) should not take the Next.js dev server down with it.
		console.warn(
			'[dev] PartyKit stopped; Next.js keeps running but realtime is down. Restart it with "pnpm party:dev".'
		);
	}

	if (children.size === 0) {
		process.exit(exitCode);
	}
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));

start('next', ['exec', 'next', 'dev', ...process.argv.slice(2)]);
start('party', ['run', 'party:dev']);
