/**
 * A small, dependency-free syntax highlighter. It is intentionally generic
 * (not a full parser): it tokenises comments, strings, numbers, keywords and
 * function-call identifiers with a single pass, which reads well for the common
 * languages in technical notes (JS/TS, PHP, Python, Go, Bash, JSON, SQL…).
 * Output is HTML-escaped and wrapped in <span class="tok-*"> elements, safe for
 * {@html}. Theme colours live in app.css.
 */

// Common keywords across the languages we care about. Over-matching a word that
// is only a keyword elsewhere is harmless and rare.
const KEYWORDS = new Set([
	'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
	'continue', 'def', 'default', 'delete', 'do', 'echo', 'elif', 'else', 'enum',
	'export', 'extends', 'false', 'final', 'finally', 'fn', 'for', 'foreach',
	'from', 'func', 'function', 'global', 'go', 'if', 'implements', 'import', 'in',
	'instanceof', 'interface', 'is', 'let', 'match', 'namespace', 'new', 'nil',
	'none', 'null', 'or', 'and', 'not', 'package', 'private', 'protected', 'public',
	'raise', 'readonly', 'return', 'select', 'self', 'static', 'struct', 'super',
	'switch', 'then', 'this', 'throw', 'trait', 'true', 'try', 'type', 'typeof',
	'use', 'var', 'void', 'while', 'with', 'yield',
	// SQL-ish (upper/lower handled by lowercasing the lookup)
	'and', 'create', 'delete', 'drop', 'from', 'group', 'insert', 'into', 'join',
	'limit', 'order', 'select', 'set', 'table', 'update', 'values', 'where'
]);

// Languages where '#' starts a line comment.
const HASH_COMMENT = new Set([
	'bash', 'sh', 'shell', 'zsh', 'console', 'python', 'py', 'ruby', 'rb', 'yaml',
	'yml', 'perl', 'r', 'makefile', 'make', 'dockerfile', 'docker', 'toml', 'ini',
	'conf', 'nginx', 'properties'
]);

/** @param {string} s */
function esc(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {string} code raw code (not yet escaped)
 * @param {string} [lang] language hint from the fence (```lang)
 * @returns {string} highlighted, escaped HTML
 */
export function highlightCode(code, lang = '') {
	const l = lang.toLowerCase();
	const hash = HASH_COMMENT.has(l) ? '|#[^\\n]*' : '';

	// Order matters: comments and strings are matched before identifiers so
	// keywords inside them are not re-coloured.
	const re = new RegExp(
		'(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*' + hash + ')' + // 1: comment
			'|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)' + // 2: string
			'|(\\b0x[0-9a-fA-F]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?\\b)' + // 3: number
			'|([A-Za-z_$][\\w$]*)', // 4: identifier
		'g'
	);

	let out = '';
	let last = 0;
	let m;
	while ((m = re.exec(code)) !== null) {
		out += esc(code.slice(last, m.index));
		last = re.lastIndex;

		if (m[1] !== undefined) {
			out += `<span class="tok-com">${esc(m[1])}</span>`;
		} else if (m[2] !== undefined) {
			out += `<span class="tok-str">${esc(m[2])}</span>`;
		} else if (m[3] !== undefined) {
			out += `<span class="tok-num">${esc(m[3])}</span>`;
		} else {
			const word = m[4];
			if (KEYWORDS.has(word.toLowerCase())) {
				out += `<span class="tok-kw">${esc(word)}</span>`;
			} else if (code[re.lastIndex] === '(') {
				out += `<span class="tok-fn">${esc(word)}</span>`;
			} else {
				out += esc(word);
			}
		}
	}
	out += esc(code.slice(last));
	return out;
}

/** Human-friendly label for the code block header. @param {string} lang */
export function langLabel(lang) {
	const map = /** @type {Record<string, string>} */ ({
		js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX', php: 'PHP',
		py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', sh: 'Shell', bash: 'Bash',
		json: 'JSON', yaml: 'YAML', yml: 'YAML', sql: 'SQL', html: 'HTML',
		css: 'CSS', md: 'Markdown', dockerfile: 'Dockerfile'
	});
	if (!lang) return 'Code';
	return map[lang.toLowerCase()] ?? lang;
}
