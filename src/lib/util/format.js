/**
 * Compact relative time ("just now", "3h", "2d", or a date for older items).
 * @param {string | null | undefined} iso
 */
export function timeAgo(iso) {
	if (!iso) return '';
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
	if (secs < 45) return 'just now';
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** @param {{ name?: string | null, username?: string | null } | null | undefined} user */
export function initials(user) {
	const base = (user?.name || user?.username || '?').trim();
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return base.slice(0, 2).toUpperCase();
}

/**
 * Deterministic hue from a string, for tinting avatars.
 * @param {string | null | undefined} seed
 */
export function hueFrom(seed) {
	const s = seed || 'x';
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
	return h;
}
