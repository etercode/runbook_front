/**
 * Lightweight code formatter for the markdown editor.
 * Tries JSON first, then expands braces and indents JS/CSS/HTML-like text.
 * @param {string} raw
 * @returns {string}
 */
export function formatCode(raw) {
	const text = raw.replace(/\r\n/g, '\n').trim();
	if (!text) return raw;

	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		/* not JSON */
	}

	return indentByStructure(expandBraces(text));
}

/**
 * Put `{` / `}` / `;` boundaries on their own lines when packed together.
 * @param {string} text
 */
function expandBraces(text) {
	// Already multi-line with reasonable structure — only lightly normalize
	if (text.includes('\n') && text.split('\n').length > 2) {
		return text;
	}

	let out = '';
	let inStr = /** @type {null | string} */ (null);
	let esc = false;
	let inLineComment = false;
	let inBlockComment = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];

		if (inLineComment) {
			out += ch;
			if (ch === '\n') inLineComment = false;
			continue;
		}
		if (inBlockComment) {
			out += ch;
			if (ch === '*' && next === '/') {
				out += '/';
				i++;
				inBlockComment = false;
			}
			continue;
		}
		if (inStr) {
			out += ch;
			if (esc) {
				esc = false;
			} else if (ch === '\\') {
				esc = true;
			} else if (ch === inStr) {
				inStr = null;
			}
			continue;
		}

		if (ch === '"' || ch === "'" || ch === '`') {
			inStr = ch;
			out += ch;
			continue;
		}
		if (ch === '/' && next === '/') {
			inLineComment = true;
			out += ch;
			continue;
		}
		if (ch === '/' && next === '*') {
			inBlockComment = true;
			out += ch;
			continue;
		}

		if (ch === '{' || ch === '}') {
			if (ch === '{' && out && !/[\s\n]$/.test(out)) out += ' ';
			if (ch === '}' && out && !/[\s\n]$/.test(out)) out += '\n';
			out += ch;
			if (ch === '{') out += '\n';
			else if (next && next !== ';' && next !== ',' && next !== ')' && next !== '}') out += '\n';
			continue;
		}

		if (ch === ';' && next && next !== '\n' && next !== '}') {
			out += ';\n';
			continue;
		}

		out += ch;
	}

	return out
		.split('\n')
		.map((l) => l.trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * @param {string} text
 */
function indentByStructure(text) {
	const lines = text.split('\n');
	/** @type {string[]} */
	const out = [];
	let depth = 0;
	const tab = '  ';

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			out.push('');
			continue;
		}

		let lineDepth = depth;
		if (/^[}\]\)]/.test(trimmed)) lineDepth = Math.max(0, depth - 1);

		out.push(tab.repeat(lineDepth) + trimmed);
		depth = Math.max(0, depth + netDepth(trimmed));
	}

	return out.join('\n');
}

/** @param {string} s */
function netDepth(s) {
	let n = 0;
	let inStr = /** @type {null | string} */ (null);
	let esc = false;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (inStr) {
			if (esc) {
				esc = false;
			} else if (ch === '\\') {
				esc = true;
			} else if (ch === inStr) {
				inStr = null;
			}
			continue;
		}
		if (ch === '"' || ch === "'" || ch === '`') {
			inStr = ch;
			continue;
		}
		if (ch === '{' || ch === '[' || ch === '(') n++;
		else if (ch === '}' || ch === ']' || ch === ')') n--;
	}
	return n;
}
