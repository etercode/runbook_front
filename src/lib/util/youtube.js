/**
 * Extract a YouTube video id from a URL or bare id.
 * @param {string} input
 * @returns {string | null}
 */
export function parseYouTubeId(input) {
	const raw = (input || '').trim();
	if (!raw) return null;
	if (/^[\w-]{11}$/.test(raw)) return raw;

	try {
		const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
		const host = url.hostname.replace(/^www\./, '');
		if (host === 'youtu.be') {
			const id = url.pathname.split('/').filter(Boolean)[0];
			return id && /^[\w-]{11}$/.test(id) ? id : null;
		}
		if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
			const v = url.searchParams.get('v');
			if (v && /^[\w-]{11}$/.test(v)) return v;
			const parts = url.pathname.split('/').filter(Boolean);
			if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
				return /^[\w-]{11}$/.test(parts[1]) ? parts[1] : null;
			}
		}
	} catch {
		return null;
	}
	return null;
}
