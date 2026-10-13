/**
 * SHA-256 of plugin code, as lowercase hex. Catalog versions store the fingerprint of
 * the reviewed code, and the loader refuses code that doesn't match it.
 * Returns null where Web Crypto isn't available (insecure origins such as LAN http).
 */
export async function sha256Hex(text: string): Promise<string | null> {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) return null;
	const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, '0')
	).join('');
}
