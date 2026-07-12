<script>
	import { page } from '$app/stores';
	import * as api from '$lib/api/client';
	import PostEntry from '$lib/components/PostEntry.svelte';

	const PAGE = 20;

	let items = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let exact = $state(true);
	let suggestion = $state(/** @type {string | null} */ (null));
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');

	let q = $derived($page.url.searchParams.get('q') ?? '');

	$effect(() => {
		const term = q;
		loading = true;
		error = '';
		api.search({ q: term, limit: PAGE, offset: 0 })
			.then((res) => {
				items = res.items ?? [];
				total = res.total ?? 0;
				exact = res.exact ?? true;
				suggestion = res.suggestion ?? null;
			})
			.catch(() => (error = 'Search failed.'))
			.finally(() => (loading = false));
	});

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		try {
			const res = await api.search({ q, limit: PAGE, offset: items.length });
			items = [...items, ...(res.items ?? [])];
		} catch {
			/* ignore */
		} finally {
			loadingMore = false;
		}
	}

	let canLoadMore = $derived(exact && items.length < total);
</script>

<svelte:head><title>{q ? `Search: ${q}` : 'Search'} — Runbook</title></svelte:head>

<div class="frame page">
	<header class="head anim-up">
		<p class="kicker">Find</p>
		<h1>Search</h1>
		{#if q}
			<p class="sub muted">
				{#if loading}
					Looking for “{q}”…
				{:else if exact}
					{total} result{total === 1 ? '' : 's'} for “{q}”
				{:else}
					No exact matches for “{q}” — closest notes below.
				{/if}
			</p>
			{#if suggestion}
				<p class="dym">
					Did you mean <a href="/search?q={encodeURIComponent(suggestion)}">{suggestion}</a>?
				</p>
			{/if}
		{:else}
			<p class="sub muted">Use Search in the bar above.</p>
		{/if}
	</header>

	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else if error}
		<div class="alert alert-error">{error}</div>
	{:else if q && items.length}
		<ul class="rows">
			{#each items as post (post.id)}
				<PostEntry {post} />
			{/each}
		</ul>
		{#if canLoadMore}
			<div class="more">
				<button class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}>
					{loadingMore ? 'Loading…' : 'More results'}
				</button>
			</div>
		{/if}
	{:else if q}
		<div class="empty-state">Nothing found.</div>
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
	.dym {
		margin: 0.65rem 0 0;
		font-weight: 600;
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.more {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}
</style>
