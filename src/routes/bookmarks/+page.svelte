<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import PostEntry from '$lib/components/PostEntry.svelte';

	let posts = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		await auth.init();
		if (!auth.isAuthenticated) {
			goto('/login?next=/bookmarks');
			return;
		}
		try {
			const res = await api.listBookmarks();
			posts = res.items ?? [];
		} catch {
			error = 'Failed to load your bookmarks.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Bookmarks — Runbook</title></svelte:head>

<div class="frame page">
	<header class="head anim-up">
		<p class="kicker">Personal</p>
		<h1>Saved</h1>
		<p class="sub muted">Notes you pinned for later.</p>
	</header>
	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else if error}
		<div class="alert alert-error">{error}</div>
	{:else if posts.length === 0}
		<div class="empty-state">Nothing saved yet — pin a note while reading.</div>
	{:else}
		<ul class="rows">
			{#each posts as post (post.id)}
				<PostEntry {post} />
			{/each}
		</ul>
	{/if}
</div>

<style>
	.page {
		padding: 2.5rem 0 4.5rem;
	}
	.head {
		margin-bottom: 1.75rem;
	}
	.kicker {
		margin: 0 0 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--mark);
	}
	.head h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.75rem, 3.5vw, 2.25rem);
		letter-spacing: -0.02em;
		margin: 0 0 0.5rem;
		line-height: 1.2;
	}
	.sub {
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.1rem;
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
</style>
