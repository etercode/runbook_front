<script>
	import Markdown from '$lib/components/Markdown.svelte';
	import * as api from '$lib/api/client';
	import { formatCode } from '$lib/util/formatCode';
	import { resizeImageFile } from '$lib/util/resizeImage';
	import { parseYouTubeId } from '$lib/util/youtube';

	/**
	 * @type {{
	 *   value?: string,
	 *   placeholder?: string,
	 *   rows?: number,
	 *   id?: string
	 * }}
	 */
	let { value = $bindable(''), placeholder = '', rows = 14, id } = $props();

	let mode = $state(/** @type {'write' | 'preview'} */ ('write'));
	let ta = $state(/** @type {HTMLTextAreaElement | null} */ (null));
	let fileInput = $state(/** @type {HTMLInputElement | null} */ (null));
	let videoInput = $state(/** @type {HTMLInputElement | null} */ (null));
	let videoMenuOpen = $state(false);
	let uploading = $state(false);
	let uploadError = $state('');

	/** @type {string[]} */
	let undoStack = $state([]);
	/** @type {string[]} */
	let redoStack = $state([]);
	let historyTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
	let skipInputRecord = false;
	let burstStarted = false;

	function reselect(/** @type {number} */ start, /** @type {number} */ end) {
		queueMicrotask(() => {
			if (!ta) return;
			ta.focus();
			ta.selectionStart = start;
			ta.selectionEnd = end;
		});
	}

	/** Snapshot current value before a programmatic edit. */
	function snapshot() {
		undoStack.push(value);
		if (undoStack.length > 80) undoStack.shift();
		redoStack = [];
	}

	/**
	 * @param {string} next
	 * @param {number} [selStart]
	 * @param {number} [selEnd]
	 */
	function commit(next, selStart, selEnd) {
		if (next === value) return;
		snapshot();
		skipInputRecord = true;
		value = next;
		queueMicrotask(() => {
			skipInputRecord = false;
		});
		if (selStart != null && selEnd != null) reselect(selStart, selEnd);
	}

	function undoEdit() {
		if (!undoStack.length) return;
		redoStack.push(value);
		const prev = undoStack.pop() ?? '';
		skipInputRecord = true;
		value = prev;
		queueMicrotask(() => {
			skipInputRecord = false;
			if (ta) {
				ta.focus();
				const end = value.length;
				ta.selectionStart = end;
				ta.selectionEnd = end;
			}
		});
	}

	function redoEdit() {
		if (!redoStack.length) return;
		undoStack.push(value);
		const next = redoStack.pop() ?? '';
		skipInputRecord = true;
		value = next;
		queueMicrotask(() => {
			skipInputRecord = false;
		});
	}

	/** Group typing into one undo step. */
	function onBeforeInput() {
		if (skipInputRecord || burstStarted) return;
		burstStarted = true;
		undoStack.push(value);
		if (undoStack.length > 80) undoStack.shift();
		redoStack = [];
		if (historyTimer) clearTimeout(historyTimer);
		historyTimer = setTimeout(() => {
			burstStarted = false;
		}, 500);
	}

	function surround(/** @type {string} */ before, /** @type {string} */ after = before) {
		if (!ta) return;
		const s = ta.selectionStart;
		const e = ta.selectionEnd;
		const sel = value.slice(s, e) || 'text';
		const next = value.slice(0, s) + before + sel + after + value.slice(e);
		commit(next, s + before.length, s + before.length + sel.length);
	}

	function prefixLines(/** @type {(i: number) => string} */ makePrefix) {
		if (!ta) return;
		const s = ta.selectionStart;
		const e = ta.selectionEnd;
		const start = value.lastIndexOf('\n', s - 1) + 1;
		const block = value.slice(start, e);
		const replaced = block
			.split('\n')
			.map((l, i) => makePrefix(i) + l)
			.join('\n');
		const next = value.slice(0, start) + replaced + value.slice(e);
		commit(next, start, start + replaced.length);
	}

	function insertBlock(/** @type {string} */ text) {
		if (!ta) return;
		const s = ta.selectionStart;
		const e = ta.selectionEnd;
		const next = value.slice(0, s) + text + value.slice(e);
		commit(next, s + text.length, s + text.length);
	}

	/** Wrap selection (or current line) in :::left|center|right */
	function align(/** @type {'left' | 'center' | 'right'} */ dir) {
		if (!ta) return;
		let s = ta.selectionStart;
		let e = ta.selectionEnd;
		if (s === e) {
			const start = value.lastIndexOf('\n', s - 1) + 1;
			let end = value.indexOf('\n', e);
			if (end === -1) end = value.length;
			s = start;
			e = end;
		}
		let body = value.slice(s, e);
		body = body.replace(/^:::(?:left|center|right)\n/, '').replace(/\n:::$/, '');
		const wrapped = `:::${dir}\n${body}\n:::`;
		const next = value.slice(0, s) + wrapped + value.slice(e);
		commit(next, s, s + wrapped.length);
	}

	/** Format selected text, or the fenced code block around the cursor. */
	function formatSelection() {
		if (!ta) return;
		const s = ta.selectionStart;
		const e = ta.selectionEnd;

		if (s !== e) {
			const selected = value.slice(s, e);
			const formatted = formatCode(selected);
			const next = value.slice(0, s) + formatted + value.slice(e);
			commit(next, s, s + formatted.length);
			return;
		}

		// Expand to enclosing ``` fence if any
		const before = value.slice(0, s);
		const openIdx = before.lastIndexOf('```');
		if (openIdx === -1) {
			uploadError = 'Select code to format, or place the cursor inside a fenced code block.';
			setTimeout(() => {
				if (uploadError.startsWith('Select code')) uploadError = '';
			}, 2800);
			return;
		}
		const afterOpen = value.slice(openIdx + 3);
		const nl = afterOpen.indexOf('\n');
		if (nl === -1) return;
		const bodyStart = openIdx + 3 + nl + 1;
		const closeRel = value.slice(bodyStart).indexOf('\n```');
		if (closeRel === -1) return;
		const bodyEnd = bodyStart + closeRel;
		if (s < bodyStart || s > bodyEnd) {
			uploadError = 'Select code to format, or place the cursor inside a fenced code block.';
			setTimeout(() => {
				if (uploadError.startsWith('Select code')) uploadError = '';
			}, 2800);
			return;
		}
		const body = value.slice(bodyStart, bodyEnd);
		const formatted = formatCode(body);
		const next = value.slice(0, bodyStart) + formatted + value.slice(bodyEnd);
		commit(next, bodyStart, bodyStart + formatted.length);
	}

	/**
	 * @param {File} file
	 * @param {HTMLInputElement | null} [resetInput]
	 */
	async function uploadAndInsert(file, resetInput = null) {
		if (!file.type.startsWith('image/')) {
			uploadError = 'Only image files can be pasted or uploaded.';
			return;
		}
		uploading = true;
		uploadError = '';
		try {
			const resized = await resizeImageFile(file);
			const res = await api.uploadImage(resized);
			const alt = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
			insertBlock(`\n![${alt}](${res.url}){center}\n`);
		} catch (err) {
			uploadError = /** @type {any} */ (err)?.body?.message ?? 'Upload failed.';
		} finally {
			uploading = false;
			if (resetInput) resetInput.value = '';
		}
	}

	async function onPickImage(/** @type {Event} */ e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const file = input.files?.[0];
		if (!file) return;
		await uploadAndInsert(file, input);
	}

	function insertYouTube() {
		videoMenuOpen = false;
		const raw = window.prompt('Paste a YouTube URL or video ID');
		if (raw == null) return;
		const id = parseYouTubeId(raw);
		if (!id) {
			uploadError = 'Could not read that YouTube link. Try a full watch URL or 11-character id.';
			return;
		}
		uploadError = '';
		insertBlock(`\n:::youtube\n${id}\n:::\n`);
	}

	function pickVideoFile() {
		videoMenuOpen = false;
		videoInput?.click();
	}

	async function onPickVideo(/** @type {Event} */ e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const file = input.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('video/')) {
			uploadError = 'Only MP4, WebM, or MOV video files are supported.';
			input.value = '';
			return;
		}
		uploading = true;
		uploadError = '';
		try {
			const res = await api.uploadMedia(file);
			insertBlock(`\n:::video\n${res.url}\n:::\n`);
		} catch (err) {
			uploadError = /** @type {any} */ (err)?.body?.message ?? 'Video upload failed.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	/** @param {ClipboardEvent} e */
	async function onPaste(e) {
		const items = e.clipboardData?.items;
		if (!items?.length) return;
		/** @type {File | null} */
		let image = null;
		for (const item of items) {
			if (item.kind === 'file' && item.type.startsWith('image/')) {
				image = item.getAsFile();
				break;
			}
		}
		if (!image) return;
		e.preventDefault();
		await uploadAndInsert(image);
	}

	const tools = [
		{ label: 'Bold', title: 'Bold', run: () => surround('**') },
		{ label: 'Italic', title: 'Italic', run: () => surround('*') },
		{ label: 'Heading', title: 'Heading', run: () => prefixLines(() => '## ') },
		{ label: 'Quote', title: 'Quote', run: () => prefixLines(() => '> ') },
		{ label: 'List', title: 'Bullet list', run: () => prefixLines(() => '- ') },
		{ label: '1. List', title: 'Numbered list', run: () => prefixLines((i) => `${i + 1}. `) },
		{ label: 'Code', title: 'Inline code', run: () => surround('`') },
		{ label: 'Block', title: 'Code block', run: () => insertBlock('\n```\n\n```\n') },
		{ label: 'Format', title: 'Format selected code', run: () => formatSelection() },
		{ label: 'Link', title: 'Link', run: () => surround('[', '](https://)') },
		{ label: 'Image', title: 'Insert image (or paste)', run: () => fileInput?.click() },
		{ label: 'Left', title: 'Align left', run: () => align('left') },
		{ label: 'Center', title: 'Align center', run: () => align('center') },
		{ label: 'Right', title: 'Align right', run: () => align('right') }
	];

	/** @param {KeyboardEvent} e */
	function onKeydown(e) {
		const mod = e.metaKey || e.ctrlKey;
		if (!mod) return;
		const k = e.key.toLowerCase();
		if (k === 'z' && !e.shiftKey) {
			if (!undoStack.length) return;
			e.preventDefault();
			undoEdit();
		} else if ((k === 'z' && e.shiftKey) || k === 'y') {
			if (!redoStack.length) return;
			e.preventDefault();
			redoEdit();
		} else if (k === 'b') {
			e.preventDefault();
			surround('**');
		} else if (k === 'i') {
			e.preventDefault();
			surround('*');
		}
	}
</script>

<div class="mde">
	<div class="mde-bar">
		<div class="mde-tools" class:disabled={mode === 'preview'}>
			{#each tools as t (t.title)}
				<button
					type="button"
					class="mde-tool"
					title={t.title}
					disabled={mode === 'preview'}
					onclick={t.run}
				>
					{t.label}
				</button>
			{/each}
			<div class="mde-menu-wrap">
				<button
					type="button"
					class="mde-tool"
					title="Insert video"
					disabled={mode === 'preview'}
					aria-expanded={videoMenuOpen}
					onclick={(e) => {
						e.stopPropagation();
						videoMenuOpen = !videoMenuOpen;
					}}
				>
					Video ▾
				</button>
				{#if videoMenuOpen && mode === 'write'}
					<div class="mde-menu" role="menu">
						<button type="button" role="menuitem" onclick={insertYouTube}>YouTube</button>
						<button type="button" role="menuitem" onclick={pickVideoFile}>From computer</button>
					</div>
				{/if}
			</div>
		</div>
		<div class="mde-tabs">
			{#if uploading}<span class="mde-uploading">Uploading…</span>{/if}
			<button type="button" class:active={mode === 'write'} onclick={() => (mode = 'write')}>Write</button>
			<button type="button" class:active={mode === 'preview'} onclick={() => (mode = 'preview')}>Preview</button>
		</div>
	</div>

	{#if uploadError}<p class="mde-err">{uploadError}</p>{/if}
	<input
		bind:this={fileInput}
		type="file"
		accept="image/png,image/jpeg,image/webp,image/gif"
		hidden
		onchange={onPickImage}
	/>
	<input
		bind:this={videoInput}
		type="file"
		accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
		hidden
		onchange={onPickVideo}
	/>

	{#if mode === 'write'}
		<textarea
			{id}
			bind:this={ta}
			bind:value
			{rows}
			{placeholder}
			onkeydown={onKeydown}
			onpaste={onPaste}
			onbeforeinput={onBeforeInput}
			spellcheck="false"
		></textarea>
	{:else}
		<div class="mde-preview prose">
			{#if value.trim()}
				<Markdown source={value} />
			{:else}
				<p class="muted">Nothing to preview yet.</p>
			{/if}
		</div>
	{/if}
</div>

<svelte:window
	onclick={() => {
		videoMenuOpen = false;
	}}
/>

<style>
	.mde {
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		overflow: visible;
	}
	.mde:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.mde-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		background: var(--surface-2);
		border-bottom: 1px solid var(--line);
		border-radius: var(--radius) var(--radius) 0 0;
		position: relative;
		z-index: 2;
	}
	.mde-tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem;
		align-items: center;
	}
	.mde-tools.disabled {
		opacity: 0.35;
	}
	.mde-tool {
		padding: 0.25rem 0.5rem;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 600;
		font-family: var(--font-ui);
		letter-spacing: 0.02em;
		line-height: 1;
	}
	.mde-tool:hover:not(:disabled) {
		background: var(--surface);
		color: var(--ink);
	}
	.mde-menu-wrap {
		position: relative;
	}
	.mde-menu {
		position: absolute;
		top: calc(100% + 0.25rem);
		left: 0;
		z-index: 20;
		min-width: 10rem;
		padding: 0.25rem;
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sheet);
	}
	.mde-menu button {
		display: block;
		width: 100%;
		text-align: left;
		border: none;
		background: transparent;
		padding: 0.45rem 0.65rem;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 600;
		font-family: var(--font-ui);
		color: var(--ink);
		cursor: pointer;
	}
	.mde-menu button:hover {
		background: var(--page);
	}
	.mde-tabs {
		display: flex;
		gap: 0.15rem;
		flex-shrink: 0;
	}
	.mde-tabs button {
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.3rem 0.6rem;
		border-radius: var(--radius-sm);
	}
	.mde-tabs button.active {
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow-sm);
	}
	textarea {
		width: 100%;
		border: none;
		background: var(--surface);
		color: var(--ink);
		padding: 0.85rem 1rem;
		resize: vertical;
		font-family: var(--font-mono);
		font-size: 0.88rem;
		line-height: 1.65;
		display: block;
	}
	textarea:focus {
		outline: none;
	}
	.mde-preview {
		padding: 1rem 1.1rem;
		min-height: 10rem;
	}
	.mde-uploading {
		font-size: 0.75rem;
		color: var(--muted);
		align-self: center;
	}
	.mde-err {
		margin: 0;
		padding: 0.4rem 1rem;
		font-size: 0.8rem;
		color: var(--danger);
		background: var(--danger-soft);
	}
</style>
