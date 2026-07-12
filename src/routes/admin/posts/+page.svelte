<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';
	import { timeAgo } from '$lib/util/format';

	const PAGE = 20;

	let posts = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let busyId = $state(/** @type {number | null} */ (null));

	async function load() {
		loading = true;
		try {
			const res = await api.adminListPosts({ limit: PAGE, offset: 0 });
			posts = res.items ?? [];
			total = res.total ?? posts.length;
		} catch {
			error = 'Failed to load posts.';
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		try {
			const res = await api.adminListPosts({ limit: PAGE, offset: posts.length });
			posts = [...posts, ...(res.items ?? [])];
		} finally {
			loadingMore = false;
		}
	}

	async function remove(/** @type {any} */ post) {
		if (!confirm(`Delete “${post.title}”? This hides it everywhere.`)) return;
		busyId = post.id;
		try {
			await api.deletePost(post.id);
			posts = posts.filter((p) => p.id !== post.id);
			total = Math.max(0, total - 1);
		} catch {
			error = 'Failed to delete post.';
		} finally {
			busyId = null;
		}
	}

	onMount(load);

	let canLoadMore = $derived(posts.length < total);
</script>

<svelte:head><title>Notes — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">Notes</h2>
		<p class="studio-subtitle">{total} post{total === 1 ? '' : 's'}</p>
	</div>
	<a href="/admin/posts/new" class="btn">New post</a>
</div>

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else if error}
	<div class="alert alert-error">{error}</div>
{:else if posts.length === 0}
	<div class="empty-state">No posts yet. Create your first note.</div>
{:else}
	<div class="studio-table-wrap">
		<table class="studio-table">
			<thead>
				<tr>
					<th>Title</th>
					<th>Status</th>
					<th>Topics</th>
					<th>Updated</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each posts as post (post.id)}
					<tr onclick={() => (location.href = `/admin/posts/${post.id}`)} class="row-link">
						<td>
							<a class="row-title" href="/admin/posts/{post.id}">{post.title}</a>
						</td>
						<td>
							<span class="tags">
								{#if !post.published}<span class="badge badge-draft">Draft</span>{/if}
								{#if !post.listed}<span class="badge badge-unlisted">Unlisted</span>{/if}
								{#if post.isGuide}<span class="badge badge-guide">{post.stepCount} steps</span>{/if}
								{#if post.published && post.listed && !post.isGuide}<span class="muted">Published</span>{/if}
							</span>
						</td>
						<td>
							<span class="tags">
								{#each post.categories ?? [] as c (c.id)}<span class="mini-tag">{c.name}</span>{/each}
							</span>
						</td>
						<td class="muted nowrap">{timeAgo(post.updatedAt)}</td>
						<td class="actions" onclick={(e) => e.stopPropagation()}>
							<button
								class="btn btn-danger btn-sm"
								onclick={() => remove(post)}
								disabled={busyId === post.id}
							>
								{busyId === post.id ? '…' : 'Delete'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if canLoadMore}
		<div class="studio-more">
			<button class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		</div>
	{/if}
{/if}

<style>
	.actions {
		text-align: right;
		width: 1%;
		white-space: nowrap;
	}
</style>
