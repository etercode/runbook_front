/**
 * Escape HTML then turn bare http(s) URLs into safe anchor tags.
 *
 * @param {string | null | undefined} src
 * @returns {string} HTML safe for {@html}
 */
export function linkify(src) {
	if (!src) return '';

	const esc = src
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

	return esc.replace(
		/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?'")\]]/gi,
		(url) =>
			`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
	);
}
