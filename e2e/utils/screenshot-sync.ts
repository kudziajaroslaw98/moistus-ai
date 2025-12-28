/**
 * Screenshot Sync Utility for Supabase Storage
 *
 * Syncs Playwright screenshot baselines to/from Supabase Storage bucket.
 * This keeps baselines out of git while allowing shared access across CI/local.
 *
 * Usage:
 *   pnpm e2e:screenshots:pull  - Download baselines before running tests
 *   pnpm e2e:screenshots:push  - Upload updated baselines after --update-snapshots
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load E2E environment
dotenv.config({ path: '.env.e2e.local' });
dotenv.config({ path: '.env.e2e' });

const BUCKET_NAME = 'e2e-screenshots';
const SNAPSHOTS_DIR = path.join(__dirname, '../tests');

// Supabase client type
type SupabaseClientType = SupabaseClient;

// Initialize Supabase client with service role for storage access
function getSupabaseClient(): SupabaseClientType {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceKey) {
		throw new Error(
			'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
		);
	}

	return createClient(url, serviceKey);
}

/**
 * Recursively find all screenshot files in __snapshots__ directories.
 */
function findSnapshotFiles(dir: string): string[] {
	const files: string[] = [];

	if (!fs.existsSync(dir)) return files;

	const items = fs.readdirSync(dir, { withFileTypes: true });

	for (const item of items) {
		const fullPath = path.join(dir, item.name);

		if (item.isDirectory()) {
			if (item.name === '__snapshots__') {
				// Found a snapshots directory - get all PNG files
				const snapshots = fs.readdirSync(fullPath);
				for (const file of snapshots) {
					if (file.endsWith('.png')) {
						files.push(path.join(fullPath, file));
					}
				}
			} else {
				// Recurse into subdirectories
				files.push(...findSnapshotFiles(fullPath));
			}
		}
	}

	return files;
}

/**
 * Convert local file path to storage path.
 * e.g., /path/to/e2e/tests/node-editor/__snapshots__/foo.png
 *       -> node-editor/foo.png
 */
function toStoragePath(localPath: string): string {
	const relativePath = path.relative(SNAPSHOTS_DIR, localPath);
	// Remove __snapshots__ from path
	return relativePath.replace(/__snapshots__[/\\]/g, '');
}

/**
 * Convert storage path to local path.
 */
function toLocalPath(storagePath: string): string {
	const parts = storagePath.split('/');
	const filename = parts.pop()!;
	const testDir = parts.join('/');
	return path.join(SNAPSHOTS_DIR, testDir, '__snapshots__', filename);
}

/**
 * Ensure bucket exists, create if not.
 */
async function ensureBucket(supabase: SupabaseClientType) {
	const { data: buckets } = await supabase.storage.listBuckets();

	if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
		console.log(`📦 Creating bucket: ${BUCKET_NAME}`);
		const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
			public: false,
		});
		if (error) {
			throw new Error(`Failed to create bucket: ${error.message}`);
		}
	}
}

/**
 * Download all baselines from Supabase Storage.
 */
async function pullScreenshots() {
	console.log('📥 Pulling screenshot baselines from Supabase...\n');

	const supabase = getSupabaseClient();
	await ensureBucket(supabase);

	// List all files in the bucket
	const { data: files, error } = await supabase.storage
		.from(BUCKET_NAME)
		.list('', { limit: 1000 });

	if (error) {
		throw new Error(`Failed to list files: ${error.message}`);
	}

	if (!files || files.length === 0) {
		console.log('ℹ️  No baselines found in storage. Run tests with --update-snapshots first.');
		return;
	}

	// Recursively list all files (handle nested folders)
	const allFiles = await listAllFiles(supabase, '');

	let downloaded = 0;
	for (const storagePath of allFiles) {
		const localPath = toLocalPath(storagePath);

		// Ensure directory exists
		const dir = path.dirname(localPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Download file
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.download(storagePath);

		if (error) {
			console.error(`❌ Failed to download ${storagePath}: ${error.message}`);
			continue;
		}

		// Write to local file
		const buffer = Buffer.from(await data.arrayBuffer());
		fs.writeFileSync(localPath, buffer);
		downloaded++;
		console.log(`  ✓ ${storagePath}`);
	}

	console.log(`\n✅ Downloaded ${downloaded} baseline(s)`);
}

/**
 * Recursively list all files in storage.
 */
async function listAllFiles(
	supabase: SupabaseClientType,
	prefix: string
): Promise<string[]> {
	const files: string[] = [];

	const { data, error } = await supabase.storage
		.from(BUCKET_NAME)
		.list(prefix, { limit: 1000 });

	if (error || !data) return files;

	for (const item of data) {
		const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

		if (item.id === null) {
			// It's a folder, recurse
			files.push(...(await listAllFiles(supabase, itemPath)));
		} else if (item.name.endsWith('.png')) {
			files.push(itemPath);
		}
	}

	return files;
}

/**
 * Upload all local baselines to Supabase Storage.
 */
async function pushScreenshots() {
	console.log('📤 Pushing screenshot baselines to Supabase...\n');

	const supabase = getSupabaseClient();
	await ensureBucket(supabase);

	const localFiles = findSnapshotFiles(SNAPSHOTS_DIR);

	if (localFiles.length === 0) {
		console.log('ℹ️  No local baselines found. Run tests with --update-snapshots first.');
		return;
	}

	let uploaded = 0;
	for (const localPath of localFiles) {
		const storagePath = toStoragePath(localPath);
		const fileBuffer = fs.readFileSync(localPath);

		const { error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(storagePath, fileBuffer, {
				upsert: true,
				contentType: 'image/png',
			});

		if (error) {
			console.error(`❌ Failed to upload ${storagePath}: ${error.message}`);
			continue;
		}

		uploaded++;
		console.log(`  ✓ ${storagePath}`);
	}

	console.log(`\n✅ Uploaded ${uploaded} baseline(s)`);
}

/**
 * Clear all baselines from storage (use with caution).
 */
async function clearScreenshots() {
	console.log('🗑️  Clearing all screenshot baselines from Supabase...\n');

	const supabase = getSupabaseClient();

	const allFiles = await listAllFiles(supabase, '');

	if (allFiles.length === 0) {
		console.log('ℹ️  No baselines to clear.');
		return;
	}

	const { error } = await supabase.storage.from(BUCKET_NAME).remove(allFiles);

	if (error) {
		throw new Error(`Failed to clear files: ${error.message}`);
	}

	console.log(`✅ Cleared ${allFiles.length} baseline(s)`);
}

// CLI entrypoint
const command = process.argv[2];

switch (command) {
	case 'pull':
		pullScreenshots().catch(console.error);
		break;
	case 'push':
		pushScreenshots().catch(console.error);
		break;
	case 'clear':
		clearScreenshots().catch(console.error);
		break;
	default:
		console.log(`
Screenshot Sync Utility

Commands:
  pull   - Download baselines from Supabase Storage
  push   - Upload local baselines to Supabase Storage
  clear  - Remove all baselines from storage (caution!)

Usage:
  npx tsx e2e/utils/screenshot-sync.ts pull
  npx tsx e2e/utils/screenshot-sync.ts push
`);
}
