<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';
	import { timeAgo } from '$lib/util/format';

	const PAGE = 20;

	let comments = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let q = $state('');
	let busyId = $state(/** @type {number | null} */ (null));
	/** @type {number | null} */
	let editingId = $state(null);
	let editBody = $state('');

	async function load(reset = true) {
		if (reset) {
			loading = true;
			error = '';
		}
		try {
			const res = await api.adminListComments({
				limit: PAGE,
				offset: reset ? 0 : comments.length,
				q: q.trim() || undefined
			});
			const items = res.items ?? [];
			comments = reset ? items : [...comments, ...items];
			total = res.total ?? comments.length;
		} catch {
			error = 'Failed to load comments.';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	onMount(() => load(true));

	function search() {
		load(true);
	}

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		await load(false);
	}

	function startEdit(/** @type {any} */ c) {
		editingId = c.id;
		editBody = c.body ?? '';
	}

	function cancelEdit() {
		editingId = null;
		editBody = '';
	}

	async function saveEdit(/** @type {any} */ c) {
		const body = editBody.trim();
		if (!body) return;
		busyId = c.id;
		try {
			const updated = await api.adminUpdateComment(c.id, body);
			comments = comments.map((x) => (x.id === updated.id ? { ...x, ...updated } : x));
			cancelEdit();
		} catch {
			error = 'Could not save comment.';
		} finally {
			busyId = null;
		}
	}

	async function remove(/** @type {any} */ c) {
		if (!confirm('Delete this comment?')) return;
		busyId = c.id;
		try {
			await api.adminDeleteComment(c.id);
			comments = comments.filter((x) => x.id !== c.id);
			total = Math.max(0, total - 1);
			if (editingId === c.id) cancelEdit();
		} catch {
			error = 'Could not delete comment.';
		} finally {
			busyId = null;
		}
	}

	let canLoadMore = $derived(comments.length < total);
</script>

<svelte:head><title>Comments — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">Comments</h2>
		<p class="studio-subtitle">{total} comment{total === 1 ? '' : 's'}</p>
	</div>
</div>

<form class="filters" onsubmit={(e) => { e.preventDefault(); search(); }}>
	<input
		type="search"
		bind:value={q}
		placeholder="Search body, author, or post…"
		aria-label="Search comments"
	/>
	<button class="btn btn-sm" type="submit">Search</button>
</form>

{#if error}<div class="alert alert-error">{error}</div>{/if}

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else if comments.length === 0}
	<div class="empty-state">No comments found.</div>
{:else}
	<ul class="list">
		{#each comments as c (c.id)}
			<li class="card">
				<div class="meta">
					<strong>{c.author?.name ?? 'Unknown'}</strong>
					<span class="muted">@{c.author?.username}</span>
					<span class="dot muted">·</span>
					<span class="muted">{timeAgo(c.createdAt)}</span>
					{#if c.parentId}<span class="badge badge-unlisted">Reply</span>{/if}
				</div>

				{#if c.post}
					<p class="post-link">
						On
						<a href="/post/{c.post.slug}" target="_blank" rel="noopener noreferrer">{c.post.title}</a>
						<a class="edit-post muted" href="/admin/posts/{c.post.id}">Edit post</a>
					</p>
				{/if}

				{#if editingId === c.id}
					<textarea bind:value={editBody} rows="4" maxlength="5000"></textarea>
					<div class="studio-actions">
						<button class="btn btn-sm" onclick={() => saveEdit(c)} disabled={busyId === c.id || !editBody.trim()}>
							{busyId === c.id ? 'Saving…' : 'Save'}
						</button>
						<button class="btn btn-ghost btn-sm" onclick={cancelEdit} disabled={busyId === c.id}>Cancel</button>
					</div>
				{:else}
					<p class="body">{c.body}</p>
					<div class="studio-actions">
						<button class="btn btn-ghost btn-sm" onclick={() => startEdit(c)} disabled={busyId === c.id}>
							Edit
						</button>
						<button class="btn btn-danger btn-sm" onclick={() => remove(c)} disabled={busyId === c.id}>
							Delete
						</button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	{#if canLoadMore}
		<div class="studio-more">
			<button class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		</div>
	{/if}
{/if}

<style>
	.filters {
		display: flex;
		gap: 0.65rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.filters input {
		flex: 1;
		min-width: 12rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--sheet);
		color: var(--ink);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.card {
		padding: 1rem 1.1rem;
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.45rem;
		margin-bottom: 0.35rem;
		font-size: 0.9rem;
	}

	.dot {
		opacity: 0.6;
	}

	.post-link {
		margin: 0 0 0.65rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.post-link a {
		font-weight: 650;
	}

	.edit-post {
		margin-left: 0.65rem;
		font-weight: 600;
		font-size: 0.8rem;
	}

	.body {
		margin: 0 0 0.85rem;
		font-family: var(--font-read);
		font-size: 1rem;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	textarea {
		width: 100%;
		margin: 0.35rem 0 0.75rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
		font-family: var(--font-read);
		font-size: 1rem;
		line-height: 1.5;
		resize: vertical;
		box-sizing: border-box;
	}

	textarea:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
</style>
