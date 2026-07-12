<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';

	/**
	 * @type {{ postId: number, initialSteps: any[] }}
	 */
	let { postId, initialSteps } = $props();

	let steps = $state([...(initialSteps ?? [])]);
	let busy = $state(false);

	let candidates = $state(/** @type {any[]} */ ([]));
	let search = $state('');
	let picking = $state(false);
	let newTitle = $state('');

	onMount(async () => {
		try {
			const res = await api.adminListPosts();
			candidates = res.items ?? [];
		} catch {
			/* ignore */
		}
	});

	let usedIds = $derived(new Set(steps.map((s) => s.post.id)));

	let matches = $derived(
		(() => {
			const q = search.trim().toLowerCase();
			return candidates
				.filter((p) => p.id !== postId && !usedIds.has(p.id))
				.filter((p) => !q || p.title.toLowerCase().includes(q))
				.slice(0, 8);
		})()
	);

	/** @param {any} detail */
	function applyDetail(detail) {
		steps = detail.steps ?? steps;
	}

	async function addExisting(/** @type {any} */ p) {
		if (busy) return;
		busy = true;
		try {
			applyDetail(await api.addStep(postId, { childPostId: p.id }));
			search = '';
			picking = false;
		} finally {
			busy = false;
		}
	}

	async function createAndAdd() {
		const title = newTitle.trim();
		if (!title || busy) return;
		busy = true;
		try {
			applyDetail(await api.addStep(postId, { title }));
			newTitle = '';
			picking = false;
			const res = await api.adminListPosts();
			candidates = res.items ?? candidates;
		} finally {
			busy = false;
		}
	}

	async function remove(/** @type {any} */ step) {
		if (busy) return;
		busy = true;
		try {
			applyDetail(await api.removeStep(postId, step.post.id));
		} finally {
			busy = false;
		}
	}

	let editingNoteId = $state(/** @type {number | null} */ (null));
	let noteDraft = $state('');

	function startNote(/** @type {any} */ step) {
		editingNoteId = step.post.id;
		noteDraft = step.note ?? '';
	}

	async function saveNote(/** @type {any} */ step) {
		if (busy) return;
		busy = true;
		try {
			applyDetail(await api.setStepNote(postId, step.post.id, noteDraft.trim() || null));
			editingNoteId = null;
		} finally {
			busy = false;
		}
	}

	async function move(/** @type {number} */ index, /** @type {number} */ dir) {
		const target = index + dir;
		if (target < 0 || target >= steps.length || busy) return;
		const order = steps.map((s) => s.post.id);
		[order[index], order[target]] = [order[target], order[index]];
		busy = true;
		try {
			applyDetail(await api.reorderSteps(postId, order));
		} finally {
			busy = false;
		}
	}
</script>

<div class="se">
	<div class="se-head">
		<div>
			<h3 class="se-title">Steps <span class="faint">({steps.length})</span></h3>
			<p class="muted se-hint">
				A step is another post. Group existing posts into this guide, or create a new one.
			</p>
		</div>
		<button type="button" class="btn btn-soft btn-sm" onclick={() => (picking = !picking)}>
			{picking ? 'Close' : 'Add step'}
		</button>
	</div>

	{#if picking}
		<div class="panel panel-pad se-picker">
			<label class="se-picker-label" for="step-search">Add an existing post</label>
			<input
				id="step-search"
				class="input"
				bind:value={search}
				placeholder="Search posts by title…"
				autocomplete="off"
			/>
			{#if matches.length}
				<ul class="se-matches">
					{#each matches as p (p.id)}
						<li>
							<button type="button" class="se-match" disabled={busy} onclick={() => addExisting(p)}>
								<span class="se-match-title">{p.title}</span>
								{#if p.isGuide}<span class="badge badge-guide">guide</span>{/if}
								<span class="se-match-add">Add</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted se-no-match">No matching posts.</p>
			{/if}

			<div class="se-sep"><span>or create new</span></div>
			<div class="se-create">
				<input
					class="input"
					bind:value={newTitle}
					placeholder="New step post title…"
					onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), createAndAdd())}
				/>
				<button type="button" class="btn btn-sm" disabled={busy || !newTitle.trim()} onclick={createAndAdd}>
					Create
				</button>
			</div>
		</div>
	{/if}

	{#if steps.length}
		<ol class="se-list">
			{#each steps as step, i (step.post.id)}
				<li class="se-item">
					<div class="se-left-border"></div>
					<div class="se-num">{i + 1}</div>
					<div class="se-content">
						<a class="se-step-title" href="/post/{step.post.slug}" target="_blank">
							{step.post.title}
						</a>
						{#if step.post.isGuide}<span class="badge badge-guide">guide · {step.post.stepCount}</span>{/if}
						{#if step.post.summary}<p class="se-sum muted">{step.post.summary}</p>{/if}

						{#if editingNoteId === step.post.id}
							<textarea
								class="se-note-input"
								bind:value={noteDraft}
								rows="2"
								placeholder="Guide-specific note shown above this step (optional)…"
							></textarea>
							<div class="se-note-actions">
								<button type="button" class="btn btn-sm" onclick={() => saveNote(step)} disabled={busy}>Save note</button>
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => (editingNoteId = null)}>Cancel</button>
							</div>
						{:else if step.note}
							<p class="se-note">{step.note}</p>
						{/if}
					</div>
					<div class="se-tools">
						<button type="button" class="se-tool" title="Note" onclick={() => startNote(step)} disabled={busy}>Note</button>
						<button type="button" class="se-tool" title="Move up" onclick={() => move(i, -1)} disabled={busy || i === 0}>Up</button>
						<button type="button" class="se-tool" title="Move down" onclick={() => move(i, 1)} disabled={busy || i === steps.length - 1}>Dn</button>
						<button type="button" class="se-tool se-tool-del" title="Remove" onclick={() => remove(step)} disabled={busy}>Del</button>
					</div>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="muted se-empty">No steps yet — this is a standalone post. Add steps to make it a guide.</p>
	{/if}
</div>

<style>
	.se {
		margin-top: 2rem;
	}
	.se-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.se-title {
		font-family: var(--font-display);
		font-size: 1.25rem;
		margin: 0 0 0.2rem;
	}
	.se-hint {
		margin: 0;
		font-size: 0.85rem;
	}
	.se-picker {
		margin-bottom: 1rem;
	}
	.se-picker-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 0.35rem;
	}
	.se-matches {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.se-match {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		color: var(--ink);
	}
	.se-match:hover:not(:disabled) {
		border-color: var(--accent);
	}
	.se-match-title {
		flex: 1;
		min-width: 0;
		font-weight: 500;
	}
	.se-match-add {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--accent);
	}
	.se-no-match {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
	}
	.se-sep {
		display: flex;
		align-items: center;
		text-align: center;
		color: var(--faint);
		font-size: 0.75rem;
		margin: 0.9rem 0 0.6rem;
	}
	.se-sep::before,
	.se-sep::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--line);
	}
	.se-sep span {
		padding: 0 0.6rem;
	}
	.se-create {
		display: flex;
		gap: 0.5rem;
	}
	.se-create .input {
		flex: 1;
	}
	.se-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.se-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem 0.75rem 0;
		border-bottom: 1px solid var(--line);
		position: relative;
	}
	.se-item:last-child {
		border-bottom: none;
	}
	.se-left-border {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--accent-soft);
		border-radius: 2px;
	}
	.se-num {
		flex-shrink: 0;
		width: 1.5rem;
		font-family: var(--font-display);
		font-size: 1.1rem;
		color: var(--accent);
		text-align: center;
		margin-left: 0.75rem;
	}
	.se-content {
		flex: 1;
		min-width: 0;
	}
	.se-step-title {
		font-weight: 600;
		color: var(--ink);
	}
	.se-step-title:hover {
		color: var(--accent);
	}
	.se-sum {
		margin: 0.15rem 0 0;
		font-size: 0.85rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.se-note {
		margin: 0.4rem 0 0;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		font-style: italic;
		background: var(--accent-soft);
		border-radius: var(--radius-sm);
		color: var(--ink);
		border-left: 2px solid var(--accent);
	}
	.se-note-input {
		width: 100%;
		margin-top: 0.4rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		resize: vertical;
		font-size: 0.88rem;
	}
	.se-note-input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.se-note-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}
	.se-tools {
		display: flex;
		gap: 0.15rem;
		flex-shrink: 0;
	}
	.se-tool {
		padding: 0.2rem 0.4rem;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 600;
		font-family: var(--font-ui);
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}
	.se-tool:hover:not(:disabled) {
		background: var(--surface-2);
		color: var(--ink);
	}
	.se-tool:disabled {
		opacity: 0.3;
	}
	.se-tool-del:hover:not(:disabled) {
		color: var(--danger);
	}
	.se-empty {
		padding: 0.5rem 0;
	}
</style>
