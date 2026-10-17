// Starts Next.js and PartyKit together, so `pnpm dev` is all local development needs.
// PartyKit serves the realtime channels (permissions, cursors, collaborators,
// notifications): without it the map loads, but every realtime socket fails and
// collaborators can look read-only.
//
// The browser connects to the port in NEXT_PUBLIC_PARTYKIT_DEV_PORT (default 1999),
// so PartyKit is started on exactly that port. If something already listens there
// (usually another worktree's PartyKit), a second one would sit unused on a random
// port, so it is skipped and a loud banner explains how to give this worktree its own.
//
// Extra arguments go to `next dev` (for example `pnpm dev --port 3002`).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';

const DEFAULT_PARTYKIT_PORT = 1999;
const PORT_KEY = 'NEXT_PUBLIC_PARTYKIT_DEV_PORT';
// Next.js development precedence, highest first.
const ENV_FILES = [
	'.env.development.local',
	'.env.local',
	'.env.development',
	'.env',
];

const useColor =
	(process.stdout.isTTY || Boolean(process.env.FORCE_COLOR)) &&
	!process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

const children = new Map();
let stopping = false;
let exitCode = 0;

// Reads only the PartyKit port: from the environment, else the .env files.
function readConfiguredPort() {
	const fromEnv = Number(process.env[PORT_KEY]);

	if (Number.isInteger(fromEnv) && fromEnv > 0) {
		return fromEnv;
	}

	const line = new RegExp(`^\\s*${PORT_KEY}\\s*=\\s*['"]?(\\d+)`, 'm');

	for (const file of ENV_FILES) {
		let content;

		try {
			content = readFileSync(file, 'utf8');
		} catch {
			continue;
		}

		const match = content.match(line);

		if (match) {
			return Number(match[1]);
		}
	}

	return DEFAULT_PARTYKIT_PORT;
}

function isPortInUse(port) {
	return new Promise((resolve) => {
		const socket = net.connect({ host: '127.0.0.1', port });

		socket.once('connect', () => {
			socket.destroy();
			resolve(true);
		});
		socket.once('error', () => resolve(false));
	});
}

async function findFreePort(after) {
	for (let port = after + 1; port < after + 50; port++) {
		if (!(await isPortInUse(port))) {
			return port;
		}
	}

	return after + 1;
}

// Hard to miss in a wall of Next.js logs: a filled title bar, then coloured lines.
function banner(title, lines, level) {
	const barCode = level === 'error' ? '1;37;41' : '1;30;43';
	const textCode = level === 'error' ? '1;31' : '1;33';

	console.warn(`\n${paint(barCode, ` [dev] ${title} `)}`);

	for (const line of lines) {
		console.warn(paint(textCode, `  ${line}`));
	}

	console.warn('');
}

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
		// A PartyKit that stops should not take the Next.js dev server down with it.
		banner(
			'PartyKit stopped: realtime is down',
			[
				'Next.js keeps running, but cursors, permissions and collaborators need PartyKit.',
				'Restart it with: pnpm party:dev',
			],
			'error'
		);
	}

	if (children.size === 0) {
		process.exit(exitCode);
	}
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));

const partykitPort = readConfiguredPort();
const partykitPortTaken = await isPortInUse(partykitPort);

if (partykitPortTaken) {
	const freePort = await findFreePort(partykitPort);

	banner(
		`PartyKit is already running on port ${partykitPort}: not starting another`,
		[
			'It is probably another worktree\'s PartyKit (or an old "pnpm party:dev" terminal).',
			`This app connects to port ${partykitPort}, so it uses that one: it runs THAT worktree's`,
			'partykit/ code and env, and its realtime rooms are shared with the other app.',
			'',
			`To give this worktree its own PartyKit, set ${PORT_KEY}=${freePort}`,
			'in its .env.local (or .env), then restart pnpm dev.',
		],
		'warn'
	);
}

start('next', ['exec', 'next', 'dev', ...process.argv.slice(2)]);

if (!partykitPortTaken) {
	start('party', ['run', 'party:dev', '--port', String(partykitPort)]);
}
