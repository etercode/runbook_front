import { highlightCode, langLabel } from '$lib/util/highlight';
import { API_URL } from '$lib/config';
import { parseYouTubeId } from '$lib/util/youtube';

/**
 * Uploaded media is stored root-relative ("/uploads/x.png") but served by the
 * API origin, so resolve those to an absolute API URL. Other paths are left
 * untouched.
 * @param {string} url
 */
function resolveAsset(url) {
	return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
}

/**
 * @param {string} id
 */
function youtubeEmbed(id) {
	const safe = id.replace(/[^\w-]/g, '');
	return (
		`<div class="md-video md-video-youtube">` +
		`<iframe src="https://www.youtube-nocookie.com/embed/${safe}" title="YouTube video" ` +
		`loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
		`allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>` +
		`</div>`
	);
}

/**
 * @param {string} url
 */
function fileVideoEmbed(url) {
	const safe = /^(https?:\/\/|\/)/i.test(url) ? resolveAsset(url) : '';
	if (!safe) return '';
	const escUrl = safe.replace(/"/g, '&quot;');
	return (
		`<div class="md-video md-video-file">` +
		`<video src="${escUrl}" controls preload="metadata" playsinline></video>` +
		`</div>`
	);
}

/**
 * A tiny, dependency-free Markdown renderer for post/step content. Input is
 * fully HTML-escaped first, so the output is safe to use with {@html}. Supports
 * headings, bold/italic, inline and fenced code (with syntax highlighting),
 * links, blockquotes, images, video embeds, and ordered/unordered lists.
 *
 * @param {string | null | undefined} src
 * @returns {string} HTML
 */
export function renderMarkdown(src) {
	if (!src) return '';

	const esc = (/** @type {string} */ s) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	/** @type {string[]} */
	const codeBlocks = [];
	const makeBlock = (/** @type {string} */ lang, /** @type {string} */ body) => {
		const block =
			`<figure class="code-block" data-lang="${esc(lang || '')}">` +
			`<figcaption><span class="code-lang">${esc(langLabel(lang))}</span>` +
			`<button type="button" class="code-copy">Copy</button></figcaption>` +
			`<pre><code>${highlightCode(body, lang)}</code></pre>` +
			`</figure>`;
		const i = codeBlocks.push(block) - 1;
		return `\nCODEBLOCK${i}END\n`;
	};

	let text = src.replace(/(^|\n)```([\w-]*)\n([\s\S]*?)\n```/g, (_m, lead, lang, code) =>
		lead + makeBlock(lang, code.replace(/\n$/, ''))
	);

	/** @type {string[]} */
	const mediaBlocks = [];
	text = text.replace(/(^|\n):::youtube\n([^\n]+)\n:::/g, (_m, lead, raw) => {
		const id = parseYouTubeId(raw.trim());
		const html = id ? youtubeEmbed(id) : '';
		const i = mediaBlocks.push(html) - 1;
		return `${lead}\nMEDIABLOCK${i}END\n`;
	});
	text = text.replace(/(^|\n):::video\n([^\n]+)\n:::/g, (_m, lead, raw) => {
		const html = fileVideoEmbed(raw.trim());
		const i = mediaBlocks.push(html) - 1;
		return `${lead}\nMEDIABLOCK${i}END\n`;
	});

	/** @type {{ align: string, body: string }[]} */
	const alignBlocks = [];
	text = text.replace(
		/(^|\n):::(left|center|right)\n([\s\S]*?)\n:::/g,
		(_m, lead, align, body) => {
			const i = alignBlocks.push({ align, body: body.replace(/^\n|\n$/g, '') }) - 1;
			return `${lead}\nALIGNBLOCK${i}END\n`;
		}
	);

	const inline = (/** @type {string} */ line) => {
		let out = esc(line);
		out = out.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
		out = out.replace(
			/!\[([^\]]*)\]\(([^)\s]+)\)(?:\{(left|center|right)\})?/g,
			(_m, alt, url, align) => {
				const safe = /^(https?:\/\/|\/)/i.test(url) ? resolveAsset(url) : '';
				if (!safe) return '';
				const cls = align ? ` class="md-img md-img-${align}"` : ' class="md-img"';
				return `<img src="${safe}" alt="${alt}" loading="lazy"${cls} />`;
			}
		);
		out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
			const safe = /^(https?:\/\/|\/)/i.test(url) ? url : '#';
			const ext = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : '';
			return `<a href="${safe}"${ext}>${label}</a>`;
		});
		out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
		return out;
	};

	/**
	 * @param {string} chunk
	 */
	function renderLines(chunk) {
		const lines = chunk.split('\n');
		/** @type {string[]} */
		const html = [];
		let listType = /** @type {null | 'ul' | 'ol'} */ (null);
		let inQuote = false;

		const closeList = () => {
			if (listType) {
				html.push(`</${listType}>`);
				listType = null;
			}
		};
		const closeQuote = () => {
			if (inQuote) {
				html.push('</blockquote>');
				inQuote = false;
			}
		};

		for (const raw of lines) {
			const line = raw.trimEnd();

			const codeMatch = line.match(/^CODEBLOCK(\d+)END$/);
			if (codeMatch) {
				closeList();
				closeQuote();
				html.push(codeBlocks[Number(codeMatch[1])]);
				continue;
			}

			const mediaMatch = line.match(/^MEDIABLOCK(\d+)END$/);
			if (mediaMatch) {
				closeList();
				closeQuote();
				html.push(mediaBlocks[Number(mediaMatch[1])] || '');
				continue;
			}

			const alignMatch = line.match(/^ALIGNBLOCK(\d+)END$/);
			if (alignMatch) {
				closeList();
				closeQuote();
				const block = alignBlocks[Number(alignMatch[1])];
				html.push(
					`<div class="md-align md-align-${block.align}">${renderLines(block.body)}</div>`
				);
				continue;
			}

			if (line.trim() === '') {
				closeList();
				closeQuote();
				continue;
			}

			const heading = line.match(/^(#{1,3})\s+(.*)$/);
			if (heading) {
				closeList();
				closeQuote();
				const level = heading[1].length + 1;
				html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
				continue;
			}

			const ul = line.match(/^\s*[-*]\s+(.*)$/);
			const ol = line.match(/^\s*\d+\.\s+(.*)$/);
			if (ul || ol) {
				closeQuote();
				const type = ul ? 'ul' : 'ol';
				if (listType !== type) {
					closeList();
					html.push(`<${type}>`);
					listType = type;
				}
				html.push(`<li>${inline(ul ? ul[1] : ol[1])}</li>`);
				continue;
			}

			const quote = line.match(/^>\s?(.*)$/);
			if (quote) {
				closeList();
				if (!inQuote) {
					html.push('<blockquote>');
					inQuote = true;
				}
				html.push(`<p>${inline(quote[1])}</p>`);
				continue;
			}

			closeList();
			closeQuote();
			html.push(`<p>${inline(line)}</p>`);
		}

		closeList();
		closeQuote();
		return html.join('\n');
	}

	return renderLines(text);
}
